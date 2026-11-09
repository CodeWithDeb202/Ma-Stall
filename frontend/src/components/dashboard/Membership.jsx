'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Form from '@/components/reusable/Form';
import Table from '@/components/reusable/Table';
import apiUrl from '@/services/api';

export default function Membership() {
  const [menuItems, setMenuItems] = useState([]);
  const [rows, setRows] = useState([]);
  const [values, setValues] = useState(() => {
    const today = new Date();
    const todayString = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, '0'),
      String(today.getDate()).padStart(2, '0'),
    ].join('-');
    return { date: todayString, itemId: '' };
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showTerms, setShowTerms] = useState(false);
  const [payment, setPayment] = useState(null);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showPaidForm, setShowPaidForm] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ name: '', transactionId: '' });
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [attendanceMonths, setAttendanceMonths] = useState([]);
  const [selectedAttendanceMonth, setSelectedAttendanceMonth] = useState('');
  const [attendanceApprovalDate, setAttendanceApprovalDate] = useState('');
  const [attendanceRecords, setAttendanceRecords] = useState({});
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceError, setAttendanceError] = useState('');


  useEffect(() => {
    const controller = new AbortController();

    async function loadMemberships() {
      try {
        const response = await fetch(`${apiUrl}/api/memberships`, {
          signal: controller.signal,
          cache: 'no-store',
          credentials: 'include',
        });
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || 'Unable to load membership items.');
        }

        setRows(Array.isArray(result.items) ? result.items : []);
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.message || 'Unable to load membership items.');
        }
      }
    }

    async function loadMenuItems() {
      try {
        const response = await fetch(`${apiUrl}/api/menu-items/public`, {
          signal: controller.signal,
          cache: 'no-store',
        });
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || 'Unable to load menu items.');
        }

        const items = Array.isArray(result.items) ? result.items : [];
        setMenuItems(items);

        const oats = items.find(
          (item) => item.name?.trim().toLowerCase() === 'oats meal'
        );
        setValues((current) => ({
          ...current,
          itemId: oats?._id || items[0]?._id || '',
        }));
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.message || 'Unable to load menu items.');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadMenuItems();
    loadMemberships();
    return () => controller.abort();
  }, []);

  const paymentSummary = useMemo(() => {
    if (!rows.length) return null;

    const firstEntry = [...rows].sort(
      (a, b) => new Date(a.createdAt || a.date) - new Date(b.createdAt || b.date)
    )[0];
    const membershipMonth = firstEntry?.date?.slice(0, 7);
    const monthlyItems = rows.filter(
      (row) => row.date?.slice(0, 7) === membershipMonth
    );
    const uniqueItems = new Map();

    monthlyItems.forEach((row) => {
      const key = row.menuItemId || row.itemName;
      if (!uniqueItems.has(key)) uniqueItems.set(key, Number(row.price) || 0);
    });

    const dailyTotal = [...uniqueItems.values()].reduce(
      (total, price) => total + price, 0
    );

    return {
      membershipMonth,
      dailyTotal,
      advanceAmount: Number((dailyTotal * 30).toFixed(2)),
    };
  }, [rows]);

  useEffect(() => {
    if (!paymentSummary?.membershipMonth) return undefined;

    let active = true;

    const loadPaymentStatus = async () => {
      try {
        const response = await fetch(
          `${apiUrl}/api/membership-payments/status?month=${encodeURIComponent(paymentSummary.membershipMonth)}`,
          {
            cache: 'no-store',
            credentials: 'include',
          });
        const result = await response.json();

        if (active && response.ok && result.success) {
          setPayment(result.payment || null);
        }
      } catch (err) {
        console.error('Unable to refresh membership payment status:', err);
      }
    };

    loadPaymentStatus();
    const intervalId = setInterval(loadPaymentStatus, 5000);

    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, [paymentSummary?.membershipMonth]);


  useEffect(() => {
    if (payment?.status !== 'Approved' || !paymentSummary?.membershipMonth) {
      return undefined;
    }

    let active = true;

    async function loadApprovedMonths() {
      try {
        const response = await fetch(
          `${apiUrl}/api/membership-attendance?month=${encodeURIComponent(paymentSummary.membershipMonth)}`,
          { cache: 'no-store', credentials: 'include' }
        );
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || 'Unable to load active membership months.');
        }

        if (!active) return;

        const months = Array.isArray(result.activeMonths) ? result.activeMonths : [];
        setAttendanceMonths(months);

        const currentMonth = [
          new Date().getFullYear(),
          String(new Date().getMonth() + 1).padStart(2, '0'),
        ].join('-');

        setSelectedAttendanceMonth((current) => (
          current && months.includes(current)
            ? current
            : months.includes(currentMonth)
              ? currentMonth
              : months[months.length - 1] || ''
        ));
      } catch (err) {
        if (active) setAttendanceError(err.message || 'Unable to load attendance months.');
      }
    }

    loadApprovedMonths();
    return () => { active = false; };
  }, [payment?.status, paymentSummary?.membershipMonth]);

  useEffect(() => {
    if (payment?.status !== 'Approved' || !selectedAttendanceMonth) {
      return undefined;
    }

    let active = true;
    let requestInProgress = false;
    let initialLoad = true;

    async function loadAttendance() {
      if (requestInProgress) return;

      requestInProgress = true;

      if (initialLoad) {
        setAttendanceLoading(true);
      }

      try {
        const response = await fetch(
          `${apiUrl}/api/membership-attendance?month=${encodeURIComponent(selectedAttendanceMonth)}`,
          {
            cache: 'no-store',
            credentials: 'include',
          }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || 'Unable to load attendance records.');
        }

        if (!active) return;

        const records = {};

        (Array.isArray(result.records) ? result.records : []).forEach((record) => {
          records[record.date] = {
            status: record.status,
            updatedAt: record.updatedAt || record.createdAt || null,
          };
        });

        setAttendanceRecords(records);
        setAttendanceApprovalDate(
          result.approvalDate || `${selectedAttendanceMonth}-01`
        );
        setAttendanceError('');
      } catch (err) {
        if (active) {
          setAttendanceError(
            err.message || 'Unable to refresh attendance records.'
          );
        }
      } finally {
        requestInProgress = false;

        if (active) {
          setAttendanceLoading(false);
          initialLoad = false;
        }
      }
    }

    loadAttendance();

    const intervalId = setInterval(() => {
      loadAttendance();
    }, 5000);

    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, [payment?.status, selectedAttendanceMonth]);


  async function handlePaymentSubmit(event) {
    event.preventDefault();
    setPaymentError('');

    if (!paymentForm.name.trim() || !paymentForm.transactionId.trim()) {
      setPaymentError('Please enter your name and transaction ID.');
      return;
    }

    if (!paymentSummary?.membershipMonth) {
      setPaymentError('Membership month could not be identified.');
      return;
    }

    setPaymentSubmitting(true);

    try {
      const response = await fetch(`${apiUrl}/api/membership-payments`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: paymentForm.name.trim(),
          transactionId: paymentForm.transactionId.trim(),
          membershipMonth: paymentSummary.membershipMonth,
        }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Unable to submit payment request.');
      }

      setPayment(result.payment || null);
      setShowPaidForm(false);
      setShowPayModal(false);
      setPaymentForm({ name: '', transactionId: '' });
      setMessage('Payment details submitted. Waiting for admin approval.');
    } catch (err) {
      setPaymentError(err.message || 'Unable to submit payment request.');
    } finally {
      setPaymentSubmitting(false);
    }
  }

  const fields = useMemo(() => [
    {
      name: 'date',
      label: 'Membership Start Date',
      type: 'date',
      required: true,
    },
    {
      name: 'itemId',
      label: 'Menu Item',
      type: 'select',
      required: true,
      options: menuItems.map((item) => ({
        value: item._id,
        label: item.name,
      })),
    },
  ], [menuItems]);

  function handleChange(name, value) {
    setValues((current) => ({ ...current, [name]: value }));
    setMessage('');
  }

  async function handleAdd(event) {
    event.preventDefault();
    setMessage('');

    if (!values.date || !values.itemId) {
      setMessage('Please select a date and menu item.');
      return;
    }

    const item = menuItems.find((entry) => entry._id === values.itemId);
    if (!item) {
      setMessage('Selected menu item was not found.');
      return;
    }

    const duplicate = rows.some(
      (row) => row.date === values.date && row.menuItemId === item._id
    );

    if (duplicate) {
      setMessage('This item is already added for the selected date.');
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/api/memberships`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: values.date, menuItemId: item._id }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Unable to add membership item.');
      }

      setRows((current) => [result.item, ...current]);
      setMessage(result.message || 'Item added successfully.');
    } catch (err) {
      setMessage(err.message || 'Unable to add membership item.');
    }
  }

  async function handleDelete(id) {
    setMessage('');

    try {
      const response = await fetch(`${apiUrl}/api/memberships/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Unable to delete membership item.');
      }

      setRows((current) => current.filter((row) => row._id !== id));
      setMessage(result.message || 'Item deleted successfully.');
    } catch (err) {
      setMessage(err.message || 'Unable to delete membership item.');
    }
  }

  return (
    <main className="min-h-full bg-[#F8FBF7] p-4">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-[#174B35] sm:text-4xl">
          Monthly membership
        </h1>
      </header>



      {loading ? (
        <p className="py-6 text-gray-600">Loading menu items...</p>
      ) : error ? (
        <p role="alert" className="py-6 text-red-600">{error}</p>
      ) : menuItems.length === 0 ? (
        <p className="mb-5 text-gray-600">No menu items available yet.</p>
      ) : (
        <Form
          title="Add membership item"
          fields={fields}
          values={values}
          onChange={handleChange}
          onSubmit={handleAdd}
          submitText="Add"
          message={message}
          messageType={message.includes('already') || message.includes('Please') || message.includes('not found') ? 'error' : 'info'}
          fieldsClassName="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2"
        />
      )}

      <section className="mt-8 overflow-hidden rounded-2xl border border-[#D8E5D8] bg-white">
        <div className="border-b border-[#D8E5D8] px-5 py-4">
          <h2 className="text-xl font-semibold text-[#174B35]">
            Membership items
          </h2>
        </div>

        <Table
          columns={[
            {
              key: 'date',
              label: 'Date',
              render: (row) => row.date.split('-').reverse().join('-'),
            },
            {
              key: 'itemName',
              label: 'Items',
            },
            {
              key: 'price',
              label: 'Price',
              render: (row) => `₹${Number(row.price).toFixed(2)}`,
            },
          ]}
          data={rows}
          getRowKey={(row) => row._id}
          emptyMessage="No membership items added yet."
          renderActions={(row) => (
            <button
              type="button"
              onClick={() => handleDelete(row._id)}
              aria-label="Delete membership item"
              title="Delete"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-red-600 transition-colors hover:bg-red-50 hover:text-red-700"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M3 6h18" />
                <path d="M8 6V4h8v2" />
                <path d="m19 6-1 14H6L5 6" />
                <path d="M10 11v5M14 11v5" />
              </svg>
            </button>
          )}
        />
      </section>



      <section className="mt-6 flex flex-col gap-4 rounded-2xl border border-[#D8E5D8] bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-[#174B35]">
            Before You Purchase a Membership
          </h2>
          <p className="mt-1 text-sm leading-6 text-[#52715D]">
            Please read our Terms & Conditions carefully before purchasing your membership.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowTerms(true)}
          className="shrink-0 rounded-lg bg-[#176B46] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#125638]"
        >
          Terms & Conditions
        </button>
      </section>

      {paymentSummary && (
        <section className="mt-6 flex flex-col gap-4 rounded-2xl border border-[#D8E5D8] bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#174B35]">
              Membership Activation Payment
            </h2>
            <p className="mt-1 text-sm leading-6 text-[#52715D]">
              Advance payment for 30 days based on the menu items added for your membership month.
            </p>
            <p className="mt-2 text-sm font-medium text-[#52715D]">
              Daily total: ₹{paymentSummary.dailyTotal.toFixed(2)} × 30 days
            </p>
            <p className="mt-1 text-2xl font-bold text-[#174B35]">
              ₹{paymentSummary.advanceAmount.toFixed(2)}
            </p>
          </div>
          <button
            type="button"
            disabled={payment?.status === 'Pending' || payment?.status === 'Approved'}
            onClick={() => {
              setPaymentError('');
              setShowPayModal(true);
            }}
            className="shrink-0 rounded-lg bg-[#176B46] px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#125638] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {payment?.status === 'Approved' ? 'Approved' : payment?.status === 'Pending' ? 'Payment Pending' : 'Pay'}
          </button>
        </section>
      )}

      <section className="mt-6 rounded-xl border border-[#D8E5D8] bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-[#174B35]">Membership Status</h2>
            <p className="mt-1 text-sm text-[#52715D]">
              {payment?.status === 'Approved'
                ? 'Your membership payment has been approved.'
                : payment?.status === 'Rejected'
                  ? 'Your payment request was rejected. You may submit a new request.'
                  : payment?.status === 'Pending'
                    ? 'Your payment is awaiting admin approval.'
                    : 'Complete the advance payment to request membership activation.'}
            </p>
          </div>
          <span className={`rounded-full px-3 py-1.5 text-sm font-semibold ${payment?.status === 'Approved'
            ? 'bg-green-100 text-green-800'
            : payment?.status === 'Rejected'
              ? 'bg-red-100 text-red-700'
              : payment?.status === 'Pending'
                ? 'bg-amber-100 text-amber-800'
                : 'bg-gray-100 text-gray-700'
            }`}>
            {payment?.status || 'Not Paid'}
          </span>
        </div>
        {payment?.status === 'Pending' && (
          <p className="mt-3 border-t border-[#E5EEE4] pt-3 text-sm leading-6 text-[#52715D]">
            Please contact the administrator by phone to confirm your payment and activate your membership.
            <span className="block font-semibold">
              Admin contact number &nbsp;
              <a
                href="tel:8018746834"
                className="mt-2 inline-block font-semibold text-[#087A43] underline underline-offset-2 hover:text-[#065F35]"
              >
                8018746834
              </a>
            </span>
          </p>
        )}
        {payment?.status === 'Rejected' && payment.adminNote && (
          <p className="mt-3 text-sm text-red-700">Admin note: {payment.adminNote}</p>
        )}
      </section>

      {payment?.status === 'Approved' && (
        <section className="mt-6 rounded-2xl border border-[#D8E5D8] bg-white p-5">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-[#174B35]">Membership Daily Calendar</h2>
            <p className="mt-1 text-sm text-[#52715D]">
              Your attendance is updated by the administrator. You can view the status and the time it was last marked.
            </p>
          </div>

          <div className="mb-5 flex flex-wrap gap-3">
            <div>
              <label htmlFor="attendance-year" className="mb-1 block text-sm font-medium text-[#174B35]">
                Year
              </label>
              <select
                id="attendance-year"
                value={selectedAttendanceMonth.slice(0, 4)}
                onChange={(event) => {
                  const year = event.target.value;
                  const monthsForYear = attendanceMonths.filter((month) => month.startsWith(`${year}-`));
                  setSelectedAttendanceMonth(monthsForYear[0] || '');
                }}
                className="rounded-lg border border-[#C8D9CA] bg-white px-3 py-2 text-sm text-[#174B35]"
              >
                {[...new Set(attendanceMonths.map((month) => month.slice(0, 4)))].map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="attendance-month" className="mb-1 block text-sm font-medium text-[#174B35]">
                Month
              </label>
              <select
                id="attendance-month"
                value={selectedAttendanceMonth}
                onChange={(event) => setSelectedAttendanceMonth(event.target.value)}
                className="rounded-lg border border-[#C8D9CA] bg-white px-3 py-2 text-sm text-[#174B35]"
              >
                {attendanceMonths
                  .filter((month) => month.startsWith(`${selectedAttendanceMonth.slice(0, 4)}-`))
                  .map((month) => (
                    <option key={month} value={month}>
                      {new Date(`${month}-01T00:00:00`).toLocaleString('en-IN', { month: 'long' })}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {attendanceError && (
            <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {attendanceError}
            </p>
          )}

          {attendanceLoading ? (
            <p className="py-8 text-center text-sm text-[#52715D]">Loading calendar...</p>
          ) : selectedAttendanceMonth ? (
            (() => {
              const [year, month] = selectedAttendanceMonth.split('-').map(Number);
              const firstWeekday = new Date(year, month - 1, 1).getDay();
              const daysInMonth = new Date(year, month, 0).getDate();
              const tickedDays = Object.entries(attendanceRecords).filter(
                ([date, record]) => {
                  const status = typeof record === 'string' ? record : record?.status;
                  return date.startsWith(`${selectedAttendanceMonth}-`) && status === 'Tick';
                }
              ).length;
              const monthlyTotal = tickedDays * (paymentSummary?.dailyTotal || 0);

              const calendarCells = [
                ...Array(firstWeekday).fill(null),
                ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
              ];

              return (
                <div>
                  <h3 className="mb-3 text-center text-lg font-semibold text-[#174B35]">
                    {new Date(year, month - 1, 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' })}
                  </h3>
                  <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                      <div key={day} className="py-2 text-center text-xs font-bold text-[#52715D] sm:text-sm">
                        {day}
                      </div>
                    ))}
                    {calendarCells.map((day, index) => {
                      if (!day) return <div key={`empty-${index}`} className="min-h-24 rounded-lg bg-[#F8FBF7]" />;

                      const date = `${selectedAttendanceMonth}-${String(day).padStart(2, '0')}`;
                      const record = attendanceRecords[date];
                      const selected = typeof record === 'string' ? record : record?.status;
                      const markedAt = typeof record === 'object' ? record?.updatedAt : null;
                      const formattedMarkedAt = markedAt
                        ? new Date(markedAt).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true,
                          timeZone: 'Asia/Kolkata',
                        })
                        : '';

                      return (
                        <div key={date} className="flex min-h-24 flex-col rounded-lg border border-[#D8E5D8] bg-[#FBFDFB] p-1.5 sm:p-2">
                          <span className="mb-2 text-sm font-semibold text-[#174B35]">{day}</span>
                          <div className="mt-auto flex flex-col items-center justify-center gap-1">
                            {selected === 'Tick' ? (
                              <span
                                aria-label={`${date}: received`}
                                className="rounded-md bg-green-100 px-2 py-0.5 text-lg font-semibold text-green-700"
                              >
                                ✓
                              </span>
                            ) : selected === 'Cross' ? (
                              <span
                                aria-label={`${date}: not received`}
                                className="rounded-md bg-red-100 px-2 py-0.5 text-lg font-semibold text-red-700"
                              >
                                ✕
                              </span>
                            ) : (
                              <span className="text-lg text-gray-300" aria-label={`${date}: not marked`}>
                                —
                              </span>
                            )}
                            {formattedMarkedAt && (
                              <span
                                className="text-[10px] font-medium text-[#718477] sm:text-xs"
                                title={new Date(markedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                              >
                                {formattedMarkedAt}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-4 rounded-xl border border-[#D8E5D8] bg-[#F0F8F1] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm text-[#52715D]">Monthly Total</p>
                        <p className="text-2xl font-bold text-[#174B35]">
                          ₹{monthlyTotal.toFixed(2)}
                        </p>
                      </div>
                      <div className="text-right text-sm text-[#52715D]">
                        <p>Ticked Days: <strong>{tickedDays}</strong></p>
                        <p>Daily Price: <strong>₹{(paymentSummary?.dailyTotal || 0).toFixed(2)}</strong></p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 rounded-xl border border-[#D8E5D8] bg-white p-4 text-center">
                    <p className="text-sm text-[#52715D]">
                      If you face any problem with your meal, notice an incorrect
                      attendance entry, or have any other issue, please contact us.
                    </p>
                    <a
                      href="tel:8018746834"
                      className="mt-2 inline-block font-semibold text-[#087A43] underline underline-offset-2 hover:text-[#065F35]"
                    >
                      Contact: 8018746834
                    </a>
                  </div>
                </div>
              );
            })()
          ) : (
            <p className="py-6 text-center text-sm text-[#52715D]">
              No approved membership month is available.
            </p>
          )}
        </section>
      )}

      {showPayModal && (
        <div
          className="fixed inset-0 z-110 flex items-center justify-center bg-black/60 p-4"
          onClick={() => { setShowPayModal(false); setShowPaidForm(false); setPaymentError(''); }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="membership-payment-title"
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 id="membership-payment-title" className="text-xl font-bold text-[#174B35]">
                Membership Payment
              </h2>
              <button type="button" onClick={() => { setShowPayModal(false); setShowPaidForm(false); }} className="rounded-lg px-3 py-1 text-xl text-gray-500 hover:bg-gray-100" aria-label="Close payment modal">
                ×
              </button>
            </div>

            <p className="mt-3 text-sm text-[#52715D]">Scan this QR code to pay the advance amount.</p>
            <div className="my-4 flex justify-center rounded-xl border border-[#D8E5D8] bg-white p-4">
              <Image src="/QR.svg" alt="Membership payment QR code" width={224} height={224} className="h-56 w-56 object-contain" />
            </div>
            <p className="text-center text-sm text-[#52715D]">Amount to pay</p>
            <p className="text-center text-3xl font-bold text-[#174B35]">₹{paymentSummary?.advanceAmount.toFixed(2)}</p>

            {!showPaidForm ? (
              <button
                type="button"
                onClick={() => { setShowPaidForm(true); setPaymentError(''); }}
                className="mt-5 w-full rounded-lg bg-[#176B46] px-5 py-3 font-semibold text-white hover:bg-[#125638]"
              >
                I Have Paid
              </button>
            ) : (
              <form onSubmit={handlePaymentSubmit} className="mt-5 space-y-4">
                <div>
                  <label htmlFor="membership-payment-name" className="mb-1 block text-sm font-medium text-[#174B35]">Name</label>
                  <input
                    id="membership-payment-name"
                    type="text"
                    maxLength={100}
                    required
                    value={paymentForm.name}
                    onChange={(event) => setPaymentForm((current) => ({ ...current, name: event.target.value }))}
                    className="w-full rounded-lg border border-[#C8D9CA] px-3 py-2.5 outline-none focus:border-[#176B46]"
                    placeholder="Enter your name"
                  />
                </div>
                <div>
                  <label htmlFor="membership-transaction-id" className="mb-1 block text-sm font-medium text-[#174B35]">Transaction ID</label>
                  <input
                    id="membership-transaction-id"
                    type="text"
                    maxLength={120}
                    required
                    value={paymentForm.transactionId}
                    onChange={(event) => setPaymentForm((current) => ({ ...current, transactionId: event.target.value }))}
                    className="w-full rounded-lg border border-[#C8D9CA] px-3 py-2.5 outline-none focus:border-[#176B46]"
                    placeholder="Enter payment transaction ID"
                  />
                </div>
                {paymentError && <p role="alert" className="text-sm text-red-600">{paymentError}</p>}
                <button
                  type="submit"
                  disabled={paymentSubmitting}
                  className="w-full rounded-lg bg-[#176B46] px-5 py-3 font-semibold text-white hover:bg-[#125638] disabled:opacity-60"
                >
                  {paymentSubmitting ? 'Sending...' : 'Send for Approval'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {showTerms && (
        <div
          className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setShowTerms(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="membership-terms-title"
            className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#D8E5D8] px-5 py-4 sm:px-6">
              <h2 id="membership-terms-title" className="text-xl font-bold text-[#174B35]">
                Membership Terms & Conditions
              </h2>
              <button
                type="button"
                onClick={() => setShowTerms(false)}
                aria-label="Close terms and conditions"
                className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="m18 6-12 12M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="overflow-y-auto px-5 py-5 sm:px-6">
              <p className="mb-5 text-sm leading-6 text-[#52715D]">
                Please read the following guidelines carefully to understand how your monthly membership works.
              </p>
              <div className="space-y-5">
                {[
                  {
                    title: '1. Advance Monthly Payment',
                    description: 'A 30-day membership payment must be made in advance. The advance amount will be calculated based on the price of your selected menu item multiplied by 30 days.',
                  },
                  {
                    title: '2. Membership Activation',
                    description: 'Your membership will become active only after the required advance payment has been received and confirmed.',
                  },
                  {
                    title: '3. Temporary Pause or Leave',
                    description: 'If you are travelling, away from home, or unable to receive your meal due to any personal reason, please inform us in advance. Your membership can be paused for the approved period, and no meal charges will be added for those paused days.',
                  },
                  {
                    title: '4. Daily Meal Calendar',
                    description: 'A monthly calendar will display the status of each day. A tick (✓) will indicate that your meal was received, while a cross (✗) will indicate that the meal was not received or the membership was paused.',
                  },
                  {
                    title: '5. Advance Balance and Monthly Settlement',
                    description: 'Your advance payment will remain with us for as long as your membership is active. It will be retained until you deactivate your membership. On the 1st of every month, the amount payable for the previous month will be calculated based onthe actual number of days you received meals, multiplied by the selected menu item price per day. The applicable amount will be settled from your advance balance.',
                  },
                ].map((term) => (
                  <div key={term.title} className="border-b border-[#E5EEE4] pb-4 last:border-0 last:pb-0">
                    <h3 className="font-semibold text-[#174B35]">{term.title}</h3>
                    <p className="mt-1.5 text-sm leading-6 text-[#52715D]">{term.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end border-t border-[#D8E5D8] px-5 py-4 sm:px-6">
              <button
                type="button"
                onClick={() => setShowTerms(false)}
                className="rounded-lg bg-[#176B46] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#125638]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
