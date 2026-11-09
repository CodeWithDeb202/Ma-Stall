'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axiosFetch from '@/lib/axios-fetch';
import apiUrl from '@/services/api';
import DashboardLayout from '../layout/DashboardLayout';
import Table from '../reusable/Table';
import Warning from '../reusable/Warning';
import Spinner from '../reusable/Spinner';
import { showError, showSuccess } from '@/lib/toast';

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatMonth(value) {
  if (!/^\d{4}-\d{2}$/.test(value || '')) return value || '';
  const [year, month] = value.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });
}

function money(value) {
  return `₹${Number(value || 0).toFixed(2)}`;
}

function getMonthDays(month) {
  if (!/^\d{4}-\d{2}$/.test(month || '')) return [];
  const [year, monthNumber] = month.split('-').map(Number);
  const total = new Date(year, monthNumber, 0).getDate();
  const firstDay = new Date(year, monthNumber - 1, 1).getDay();
  return [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: total }, (_, index) => index + 1),
  ];
}

function getDayRecord(attendance, day) {
  if (!attendance || !day) return null;
  const date = `${attendance.month}-${String(day).padStart(2, '0')}`;
  const records = attendance.days || attendance.attendance || attendance.records || [];
  if (Array.isArray(records)) {
    return records.find((entry) => entry.date === date || entry.day === day || entry.dayNumber === day) || null;
  }
  return records[date] || null;
}

export default function MembershipPayments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [confirmation, setConfirmation] = useState(null);

  const [attendanceUsers, setAttendanceUsers] = useState([]);
  const [attendanceSelectedUser, setAttendanceSelectedUser] = useState('');
  const [attendanceMonth, setAttendanceMonth] = useState('');
  const attendanceSelectionRef = useRef({ userId: '', month: '' });
  const [adminAttendance, setAdminAttendance] = useState(null);
  const [attendanceUsersLoading, setAttendanceUsersLoading] = useState(true);
  const [attendanceUsersRefreshKey, setAttendanceUsersRefreshKey] = useState(0);
  const [adminAttendanceLoading, setAdminAttendanceLoading] = useState(false);
  const [adminAttendanceError, setAdminAttendanceError] = useState('');
  const [isAttendanceEditing, setIsAttendanceEditing] = useState(false);
  const [attendanceDraft, setAttendanceDraft] = useState({});
  const [attendanceSaving, setAttendanceSaving] = useState(false);

  const loadPayments = useCallback(async (notify = false) => {
    try {
      const response = await axiosFetch(`${apiUrl}/api/admin/membership-payments`, {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      });

      if (response.status === 401) {
        window.location.replace('/');
        return;
      }

      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Could not load membership payment requests.');
      }
      setPayments(Array.isArray(result.payments) ? result.payments : []);
    } catch (error) {
      if (notify) showError(error.message || 'Could not load payment requests.');
      else console.error('Refresh membership payment requests:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialTimeoutId = setTimeout(() => loadPayments(true), 0);
    const intervalId = setInterval(() => loadPayments(false), 5000);
    return () => {
      clearTimeout(initialTimeoutId);
      clearInterval(intervalId);
    };
  }, [loadPayments]);

  async function reviewPayment(payment, status) {
    if (!payment || reviewingId) return;
    const action = status === 'Approved' ? 'approve' : 'reject';
    setReviewingId(payment._id);

    try {
      const response = await axiosFetch(
        `${apiUrl}/api/admin/membership-payments/${payment._id}`,
        {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        }
      );

      if (response.status === 401) {
        window.location.replace('/');
        return;
      }

      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) {
        throw new Error(result.message || `Could not ${action} payment.`);
      }

      setPayments((current) =>
        current.map((item) => item._id === payment._id ? result.payment : item)
      );
      if (selectedPayment?._id === payment._id) setSelectedPayment(result.payment);
      if (status === "Approved") setAttendanceUsersRefreshKey((current) => current + 1);
      showSuccess(`Membership payment ${status.toLowerCase()} successfully.`);
    } catch (error) {
      showError(error.message || `Could not ${action} payment.`);
      await loadPayments(false);
    } finally {
      setReviewingId(null);
    }
  }

  function askReviewPayment(payment, status) {
    if (!payment || reviewingId) return;
    setConfirmation({ payment, status });
  }

  async function deactivateMembership(payment) {
    if (!payment || reviewingId) return;

    setReviewingId(payment._id);

    try {
      const response = await axiosFetch(
        `${apiUrl}/api/admin/membership-payments/${payment._id}/deactivate`,
        {
          method: 'PATCH',
          credentials: 'include',
        }
      );

      if (response.status === 401) {
        window.location.replace('/');
        return;
      }

      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Could not deactivate membership.');
      }

      setPayments((current) =>
        current.map((item) =>
          item._id === payment._id ? result.payment : item
        )
      );

      if (selectedPayment?._id === payment._id) {
        setSelectedPayment(result.payment);
      }

      showSuccess('Membership deactivated successfully.');
    } catch (error) {
      showError(error.message || 'Could not deactivate membership.');
      await loadPayments(false);
    } finally {
      setReviewingId(null);
    }
  }

  useEffect(() => {
    attendanceSelectionRef.current = {
      userId: attendanceSelectedUser,
      month: attendanceMonth,
    };
  }, [attendanceSelectedUser, attendanceMonth]);

  useEffect(() => {
    let cancelled = false;

    async function loadAttendanceUsers() {
      try {
        const response = await axiosFetch(
          `${apiUrl}/api/admin/membership-attendance/users`,
          { method: 'GET', credentials: 'include', cache: 'no-store' }
        );
        const result = await response.json().catch(() => ({}));

        if (response.status === 401) {
          window.location.replace('/');
          return;
        }
        if (!response.ok || !result.success) {
          throw new Error(result.message || 'Could not load approved membership users.');
        }

        if (!cancelled) {
          const users = Array.isArray(result.users) ? result.users : [];
          setAttendanceUsers(users);
          if (users.length) {
            const selectedUser = users.find((user) => user._id === attendanceSelectionRef.current.userId);
            const nextUser = selectedUser || users[0];
            setAttendanceSelectedUser(nextUser._id);

            const currentMonth = selectedUser && nextUser.activeMonths?.includes(attendanceSelectionRef.current.month)
              ? attendanceSelectionRef.current.month
              : (nextUser.activeMonths?.[0] || '');
            setAttendanceMonth(currentMonth);
          } else {
            setAttendanceSelectedUser('');
            setAttendanceMonth('');
          }
        }
      } catch (error) {
        if (!cancelled) {
          setAdminAttendanceError(error.message || 'Could not load membership users.');
        }
      } finally {
        if (!cancelled) setAttendanceUsersLoading(false);
      }
    }

    loadAttendanceUsers();
    return () => { cancelled = true; };
  }, [attendanceUsersRefreshKey]);

  useEffect(() => {
    if (!attendanceSelectedUser || !attendanceMonth) {
      return undefined;
    }

    let cancelled = false;
    let requestInProgress = false;
    let firstLoad = true;

    async function loadAdminAttendance() {
      // Do not replace the admin's unsaved draft while Edit Attendance is active.
      if (requestInProgress || isAttendanceEditing) return;

      requestInProgress = true;
      if (firstLoad) {
        setAdminAttendanceLoading(true);
      }

      try {
        const response = await axiosFetch(
          `${apiUrl}/api/admin/membership-attendance/${encodeURIComponent(attendanceSelectedUser)}?month=${encodeURIComponent(attendanceMonth)}`,
          { method: 'GET', credentials: 'include', cache: 'no-store' }
        );
        const result = await response.json().catch(() => ({}));

        if (response.status === 401) {
          window.location.replace('/');
          return;
        }
        if (!response.ok || !result.success) {
          throw new Error(result.message || 'Could not refresh attendance calendar.');
        }

        if (!cancelled && !isAttendanceEditing) {
          setAdminAttendance({ ...result, month: result.month || attendanceMonth });
          setAdminAttendanceError('');
        }
      } catch (error) {
        if (!cancelled) {
          // Keep the last successfully loaded calendar visible if a background refresh fails.
          setAdminAttendanceError(error.message || 'Could not refresh attendance calendar.');
        }
      } finally {
        requestInProgress = false;
        firstLoad = false;
        if (!cancelled) setAdminAttendanceLoading(false);
      }
    }

    loadAdminAttendance();
    const intervalId = setInterval(loadAdminAttendance, 5000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [attendanceSelectedUser, attendanceMonth, isAttendanceEditing]);

  async function saveAttendance() {
    if (attendanceSaving || !attendanceSelectedUser || !attendanceMonth) return;

    setAttendanceSaving(true);
    try {
      const updates = Object.entries(attendanceDraft);
      await Promise.all(updates.map(async ([date, status]) => {
        const response = await axiosFetch(
          `${apiUrl}/api/admin/membership-attendance/${encodeURIComponent(attendanceSelectedUser)}/${date}`,
          {
            method: 'PATCH',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status }),
          }
        );

        if (response.status === 401) {
          window.location.replace('/');
          throw new Error('Your session has expired. Please sign in again.');
        }

        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.success) {
          throw new Error(result.message || `Could not save attendance for ${date}.`);
        }
      }));

      const refreshResponse = await axiosFetch(
        `${apiUrl}/api/admin/membership-attendance/${encodeURIComponent(attendanceSelectedUser)}?month=${encodeURIComponent(attendanceMonth)}`,
        { method: 'GET', credentials: 'include', cache: 'no-store' }
      );
      const refreshed = await refreshResponse.json().catch(() => ({}));

      if (!refreshResponse.ok || !refreshed.success) {
        throw new Error(refreshed.message || 'Attendance was saved, but the calendar could not be refreshed.');
      }

      setAdminAttendance({ ...refreshed, month: refreshed.month || attendanceMonth });
      setAttendanceDraft({});
      setIsAttendanceEditing(false);
      showSuccess('Attendance saved successfully. Calendar is locked.');
    } catch (error) {
      showError(error.message || 'Could not save attendance.');
      // Reload the server state so partially completed requests are reflected.
      try {
        const response = await axiosFetch(
          `${apiUrl}/api/admin/membership-attendance/${encodeURIComponent(attendanceSelectedUser)}?month=${encodeURIComponent(attendanceMonth)}`,
          { method: 'GET', credentials: 'include', cache: 'no-store' }
        );
        const result = await response.json().catch(() => ({}));
        if (response.ok && result.success) {
          setAdminAttendance({ ...result, month: result.month || attendanceMonth });
        }
      } catch (refreshError) {
        console.error('Refresh attendance after save error:', refreshError);
      }
    } finally {
      setAttendanceSaving(false);
    }
  }

  const selectedAttendanceUser = attendanceUsers.find(
    (user) => user._id === attendanceSelectedUser
  );

  const pendingCount = payments.filter((payment) => payment.status === 'Pending').length;

  const columns = [
    {
      key: 'serial',
      label: 'SL No.',
      render: (_payment, index) => index + 1,
    },
    {
      key: 'name',
      label: 'Name',
      render: (payment) => (
        <div className="flex min-w-0 flex-col gap-1">
          <span className="font-semibold text-[#174D35]">
            {payment.userId?.name ||
              payment.userId?.username ||
              payment.name ||
              'Unknown user'}
          </span>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (payment) => {
        const isDeactivated = payment.membershipStatus === 'Deactivated';

        return (
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${isDeactivated
              ? 'bg-red-100 text-red-700'
              : payment.status === 'Approved'
                ? 'bg-green-100 text-green-700'
                : payment.status === 'Rejected'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-amber-100 text-amber-700'
              }`}
          >
            {isDeactivated ? 'Deactivated' : payment.status || 'Pending'}
          </span>
        );
      },
    },
  ];

  const calendarDays = useMemo(
    () => getMonthDays(attendanceMonth),
    [attendanceMonth]
  );

  const attendanceItems = adminAttendance?.days ||
    adminAttendance?.attendance ||
    adminAttendance?.records ||
    [];

  const tickedDays = adminAttendance?.tickedDays ??
    (Array.isArray(attendanceItems)
      ? attendanceItems.filter((entry) => entry?.received === true || entry?.status === 'Received' || entry?.status === 'Tick').length
      : 0);

  const monthlyTotal = adminAttendance?.monthlyTotal ??
    adminAttendance?.total ??
    (Array.isArray(attendanceItems)
      ? attendanceItems.reduce((sum, entry) => sum + (Number(entry?.dailyTotal) || 0), 0)
      : 0);

  return (
    <DashboardLayout>
      <section className="space-y-8 p-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#52715D]">
              Membership Management
            </p>
            <h1 className="mt-1 text-2xl font-bold text-[#174D35] md:text-3xl">
              Membership Payment Requests
            </h1>
            <p className="mt-2 text-sm text-[#718477]">
              Verify transaction details and approve or reject membership payments.
            </p>
          </div>

          <div className="flex gap-3">
            <div className="rounded-xl border border-[#D8E5D8] bg-white px-5 py-3 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#52715D]">
                Total Requests
              </p>
              <p className="mt-1 text-2xl font-bold text-[#176B45]">{payments.length}</p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-white px-5 py-3 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                Pending
              </p>
              <p className="mt-1 text-2xl font-bold text-amber-700">{pendingCount}</p>
            </div>
          </div>
        </div>

        <p className="text-xs text-[#718477]">
          Requests refresh automatically every 5 seconds.
        </p>

        {loading ? (
          <div className="flex min-h-48 items-center justify-center">
            <Spinner label="Loading membership payment requests..." />
          </div>
        ) : (
          <Table
            columns={columns}
            data={payments}
            getRowKey={(payment) => payment._id}
            emptyMessage="No membership payment requests found."
            renderActions={(payment) => {
              const isDeactivated = payment.membershipStatus === 'Deactivated';

              if (payment.status === 'Pending') {
                return (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedPayment(payment)}
                      className="rounded-lg border border-[#D8E5D8] px-3 py-2 text-xs font-semibold text-[#174D35]"
                    >
                      Details
                    </button>

                    <button
                      type="button"
                      disabled={Boolean(reviewingId)}
                      onClick={() => askReviewPayment(payment, 'Approved')}
                      className="rounded-lg bg-[#176B45] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      Approve
                    </button>

                    <button
                      type="button"
                      disabled={Boolean(reviewingId)}
                      onClick={() => askReviewPayment(payment, 'Rejected')}
                      className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                );
              }

              if (payment.status === 'Approved' && !isDeactivated) {
                return (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={Boolean(reviewingId)}
                      onClick={() => setConfirmation({ payment, action: 'deactivate' })}
                      className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      Deactivate
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedPayment(payment)}
                      className="rounded-lg border border-[#D8E5D8] px-3 py-2 text-xs font-semibold text-[#174D35]"
                    >
                      Details
                    </button>
                  </div>
                );
              }

              return (
                <button
                  type="button"
                  onClick={() => setSelectedPayment(payment)}
                  className="rounded-lg border border-[#D8E5D8] px-3 py-2 text-xs font-semibold text-[#174D35]"
                >
                  Details
                </button>
              );
            }}
          />
        )}

        <section className="space-y-5 rounded-2xl border border-[#D8E5D8] bg-white p-5 shadow-sm sm:p-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#52715D]">
              Attendance Management
            </p>
            <h2 className="mt-1 text-xl font-bold text-[#174D35] sm:text-2xl">
              Membership Daily Calendar
            </h2>
            <p className="mt-1 text-sm text-[#718477]">
              Attendance records for users with approved membership payments. The calendar stays locked until you choose to edit.
            </p>
          </div>

          {attendanceUsersLoading ? (
            <div className="flex min-h-24 items-center justify-center">
              <Spinner label="Loading approved membership users..." />
            </div>
          ) : adminAttendanceError && attendanceUsers.length === 0 ? (
            <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
              {adminAttendanceError}
            </p>
          ) : attendanceUsers.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[#D8E5D8] p-6 text-center text-sm text-[#718477]">
              No approved membership users found.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap gap-4">
                <label className="flex min-w-55 flex-col gap-1.5 text-sm font-medium text-[#52715D]">
                  Member
                  <select
                    value={attendanceSelectedUser}
                    onChange={(event) => {
                      const nextUser = attendanceUsers.find((user) => user._id === event.target.value);
                      setAttendanceSelectedUser(event.target.value);
                      setAttendanceMonth(nextUser?.activeMonths?.[0] || '');
                      setIsAttendanceEditing(false);
                      setAttendanceDraft({});
                      setAdminAttendance(null);
                    }}
                    className="rounded-xl border border-[#D8E5D8] bg-white px-4 py-2.5 text-[#174D35] outline-none focus:border-[#176B45]"
                  >
                    {attendanceUsers.map((user) => (
                      <option key={user._id} value={user._id}>
                        {user.name || user.username || user.email || 'Member'}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex min-w-47.5 flex-col gap-1.5 text-sm font-medium text-[#52715D]">
                  Membership Month
                  <select
                    value={attendanceMonth}
                    onChange={(event) => {
                      setAttendanceMonth(event.target.value);
                      setIsAttendanceEditing(false);
                      setAttendanceDraft({});
                      setAdminAttendance(null);
                    }}
                    className="rounded-xl border border-[#D8E5D8] bg-white px-4 py-2.5 text-[#174D35] outline-none focus:border-[#176B45]"
                  >
                    {(selectedAttendanceUser?.activeMonths || []).map((month) => (
                      <option key={month} value={month}>{formatMonth(month)}</option>
                    ))}
                  </select>
                </label>
              </div>

              {adminAttendanceError && (
                <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  {adminAttendanceError}
                </p>
              )}

              {adminAttendanceLoading ? (
                <div className="flex min-h-48 items-center justify-center">
                  <Spinner label="Loading attendance calendar..." />
                </div>
              ) : adminAttendance ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-[#D8E5D8] bg-[#F8FBF7] p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#718477]">Member</p>
                      <p className="mt-1 font-semibold text-[#174D35]">
                        {selectedAttendanceUser?.name || selectedAttendanceUser?.username || 'Member'}
                      </p>
                    </div>
                    <div className="rounded-xl border border-[#D8E5D8] bg-[#F8FBF7] p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#718477]">Days Received</p>
                      <p className="mt-1 text-2xl font-bold text-[#176B45]">{tickedDays}</p>
                    </div>
                    <div className="rounded-xl border border-[#D8E5D8] bg-[#F8FBF7] p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#718477]">Monthly Total</p>
                      <p className="mt-1 text-2xl font-bold text-[#176B45]">{money(monthlyTotal)}</p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#E5EEE4] p-3 sm:p-5">
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                      <h3 className="text-lg font-bold text-[#174D35]">
                        {formatMonth(attendanceMonth)}
                      </h3>
                      {!isAttendanceEditing ? (
                        <button
                          type="button"
                          disabled={adminAttendanceLoading || attendanceSaving}
                          onClick={() => {
                            setAttendanceDraft({});
                            setIsAttendanceEditing(true);
                          }}
                          className="rounded-lg bg-[#176B45] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#125638] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Edit Attendance
                        </button>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={attendanceSaving}
                            onClick={() => {
                              setAttendanceDraft({});
                              setIsAttendanceEditing(false);
                            }}
                            className="rounded-lg border border-[#D8E5D8] px-4 py-2 text-sm font-semibold text-[#174D35] hover:bg-[#F5F9F5] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={attendanceSaving}
                            onClick={saveAttendance}
                            className="rounded-lg bg-[#176B45] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#125638] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {attendanceSaving ? 'Saving...' : 'Save & Lock'}
                          </button>
                        </div>
                      )}
                    </div>
                    {isAttendanceEditing && (
                      <p className="mb-4 text-xs text-amber-700">
                        Editing is enabled. Choose ✓ or ✕ for each date, then select Save &amp; Lock.
                      </p>
                    )}
                    <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                        <div key={day} className="pb-1 text-center text-xs font-bold text-[#52715D] sm:text-sm">
                          {day}
                        </div>
                      ))}
                      {calendarDays.map((day, index) => {
                        if (!day) return <div key={`empty-${index}`} />;
                        const record = getDayRecord(adminAttendance, day);
                        const dateKey = `${attendanceMonth}-${String(day).padStart(2, '0')}`;
                        const savedStatus = record?.status === 'Tick' ||
                          record?.received === true ||
                          record?.status === 'Received' ||
                          record?.isPresent === true ||
                          record?.ticked === true
                          ? 'Tick'
                          : 'Cross';
                        const currentStatus = attendanceDraft[dateKey] || savedStatus;
                        const isReceived = currentStatus === 'Tick';
                        const isBeforeApproval = Boolean(
                          adminAttendance.approvalDate &&
                          dateKey < String(adminAttendance.approvalDate).slice(0, 10)
                        );
                        const canEditDay = isAttendanceEditing && !isBeforeApproval && !attendanceSaving;
                        const dayTotal = record?.dailyTotal ?? record?.total ?? record?.amount ?? 0;
                        const items = record?.items || record?.menuItems || [];

                        return (
                          <div
                            key={day}
                            className={`flex min-h-23 flex-col rounded-lg border p-2 sm:min-h-28 sm:p-3 ${isReceived
                              ? 'border-green-200 bg-green-50'
                              : 'border-[#D8E5D8] bg-[#FBFDFC]'
                              }`}
                          >
                            <span className="text-xs font-semibold text-[#174D35] sm:text-sm">{day}</span>
                            <div className="mt-auto flex items-center justify-center gap-2 pt-3">
                              {isAttendanceEditing ? (
                                <>
                                  <button
                                    type="button"
                                    aria-label={`Mark ${dateKey} as received`}
                                    aria-pressed={isReceived}
                                    disabled={!canEditDay}
                                    onClick={() => setAttendanceDraft((current) => ({
                                      ...current,
                                      [dateKey]: 'Tick',
                                    }))}
                                    className={`rounded-md px-2 py-1 text-lg font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${isReceived
                                      ? 'bg-green-100 text-green-700 ring-1 ring-green-300'
                                      : 'text-slate-400 hover:bg-green-50 hover:text-green-600'
                                      }`}
                                  >
                                    ✓
                                  </button>
                                  <button
                                    type="button"
                                    aria-label={`Mark ${dateKey} as not received`}
                                    aria-pressed={!isReceived}
                                    disabled={!canEditDay}
                                    onClick={() => setAttendanceDraft((current) => ({
                                      ...current,
                                      [dateKey]: 'Cross',
                                    }))}
                                    className={`rounded-md px-2 py-1 text-lg font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${!isReceived
                                      ? 'bg-slate-100 text-slate-600 ring-1 ring-slate-300'
                                      : 'text-slate-300 hover:bg-slate-100 hover:text-slate-600'
                                      }`}
                                  >
                                    ✕
                                  </button>
                                </>
                              ) : (
                                <span
                                  aria-label={isReceived ? 'Meal received' : 'Meal not marked received'}
                                  className={`text-xl font-semibold ${isReceived ? 'text-green-600' : 'text-slate-400'
                                    }`}
                                >
                                  {isReceived ? '✓' : '✕'}
                                </span>
                              )}
                            </div>
                            {Number(dayTotal) > 0 && (
                              <span className="mt-1 text-center text-[10px] font-medium text-[#52715D] sm:text-xs">
                                {money(dayTotal)}
                              </span>
                            )}
                            {items.length > 0 && (
                              <span className="mt-1 line-clamp-2 text-center text-[10px] text-[#718477]">
                                {items.map((item) => item.itemName || item.name).filter(Boolean).join(', ')}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-4 flex flex-wrap items-center justify-center gap-5 text-xs text-[#52715D]">
                      <span className="inline-flex items-center gap-1.5"><span className="font-bold text-green-600">✓</span> Received</span>
                      <span className="inline-flex items-center gap-1.5"><span className="font-bold text-slate-400">✕</span> Not received / not marked</span>
                    </div>
                  </div>
                </>
              ) : (
                <p className="rounded-xl border border-dashed border-[#D8E5D8] p-6 text-center text-sm text-[#718477]">
                  Select a member and month to view attendance.
                </p>
              )}
            </>
          )}
        </section>

        <Warning
          open={Boolean(confirmation)}
          title={confirmation?.action === 'deactivate' ? 'Deactivate Membership' : confirmation?.status === 'Approved' ? 'Approve Membership Payment' : 'Reject Membership Payment'}
          message={!confirmation ? '' : confirmation.action === 'deactivate' ? 'Are you sure you want to deactivate this membership? The member will lose attendance access.' : `Are you sure you want to ${confirmation.status.toLowerCase()} this membership payment?`}
          confirmText={confirmation?.action === 'deactivate' ? 'Deactivate Membership' : confirmation?.status === 'Approved' ? 'Approve Payment' : 'Reject Payment'}
          cancelText="Cancel"
          loading={Boolean(reviewingId)}
          onCancel={() => setConfirmation(null)}
          onConfirm={async () => {
            if (!confirmation) return;
            if (confirmation.action === 'deactivate') {
              await deactivateMembership(confirmation.payment);
            } else {
              await reviewPayment(confirmation.payment, confirmation.status);
            }
            setConfirmation(null);
          }}
        />

        {selectedPayment && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setSelectedPayment(null)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="membership-payment-title"
              className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-5 flex items-center justify-between gap-3">
                <h2 id="membership-payment-title" className="text-xl font-bold text-[#174D35]">
                  Membership Payment Details
                </h2>
                <button
                  type="button"
                  onClick={() => setSelectedPayment(null)}
                  className="rounded-lg px-3 py-1 text-xl text-gray-500 hover:bg-gray-100"
                  aria-label="Close details"
                >
                  ×
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {[
                  ['User Name', selectedPayment.userId?.name || selectedPayment.userId?.username || '—'],
                  ['Email', selectedPayment.userId?.email || '—'],
                  ['Membership Month', selectedPayment.membershipMonth || '—'],
                  ['Amount', money(selectedPayment.amount)],
                  ['Payer Name', selectedPayment.name || '—'],
                  ['Transaction ID', selectedPayment.transactionId || '—'],
                  ['Submitted Date', formatDate(selectedPayment.createdAt)],
                  ['Status', selectedPayment.status || 'Pending'],
                  ['Reviewed Date', formatDate(selectedPayment.reviewedAt)],
                  ['Admin Note', selectedPayment.adminNote || '—'],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-[#F5F9F5] p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#718477]">{label}</p>
                    <p className="mt-1 wrap-break-word text-sm font-medium text-[#174D35]">{value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedPayment(null)}
                  className="rounded-lg bg-[#176B45] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#125638]"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </DashboardLayout>
  );
}
