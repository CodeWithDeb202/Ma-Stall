'use client';
import axiosFetch from "@/lib/axios-fetch";

import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../layout/DashboardLayout';
import Table from '../reusable/Table';
import Form from '../reusable/Form';
import Warning from '../reusable/Warning';

import apiUrl from '@/services/api';
import { showSuccess, showError, showWarning } from '@/lib/toast';

function getTodayDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

export default function Dashboard() {
    const [date, setDate] = useState(getTodayDate);
    const [invest, setInvest] = useState('');
    const [income, setIncome] = useState('');
    const [cash, setCash] = useState('');
    const [purseCash, setPurseCash] = useState('');
    const [records, setRecords] = useState([]);
    const [purchaseProducts, setPurchaseProducts] = useState([]);

    const dailyUsageByNextDate = useMemo(() => {
        const totals = {};

        purchaseProducts.forEach((product) => {
            if (
                product.category !== 'Daily Usage' ||
                !product.checked ||
                product.price == null ||
                !/^\d{4}-\d{2}-\d{2}$/.test(product.date || '')
            ) {
                return;
            }

            const [year, month, day] = product.date.split('-').map(Number);
            const next = new Date(year, month - 1, day);
            next.setDate(next.getDate() + 1);

            const nextDate = [
                next.getFullYear(),
                String(next.getMonth() + 1).padStart(2, '0'),
                String(next.getDate()).padStart(2, '0'),
            ].join('-');

            totals[nextDate] = (totals[nextDate] || 0) + (Number(product.price) || 0);
        });

        return totals;
    }, [purchaseProducts]);
    const [selectedMonth, setSelectedMonth] = useState('');
    const availableMonths = [
        ...new Set(records.map((record) => record.date.slice(0, 7))),
    ].sort((a, b) => b.localeCompare(a));

    const filteredRecords = selectedMonth
        ? records.filter((record) => record.date.startsWith(selectedMonth))
        : records;

    const [message, setMessage] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);
    const [editInvest, setEditInvest] = useState('');
    const [editIncome, setEditIncome] = useState('');
    const [editCash, setEditCash] = useState('');
    const [editMessage, setEditMessage] = useState('');
    const [isEditSaving, setIsEditSaving] = useState(false);
    const [deletingDate, setDeletingDate] = useState('');
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        async function loadRecords() {
            try {
                const response = await axiosFetch(`${apiUrl}/api/records`, {
                    credentials: 'include',
                    cache: 'no-store',
                });

                if (response.status === 401) {
                    window.location.replace('/');
                    return;
                }

                const result = await response.json();

                if (response.ok && result.success) {
                    const loadedRecords = result.records || [];

                    setRecords(loadedRecords);

                    if (loadedRecords.length > 0) {
                        const latestMonth = loadedRecords
                            .map((record) => record.date.slice(0, 7))
                            .sort((a, b) => b.localeCompare(a))[0];

                        setSelectedMonth((currentMonth) => currentMonth || latestMonth);
                    }
                }
            } catch {
                showError('Records load heiparila nahi. Backend connection check kara.');
            }
        }

        loadRecords();

        async function loadPurchaseProducts() {
            try {
                const response = await axiosFetch(`${apiUrl}/api/purchase-products`, {
                    credentials: 'include',
                    cache: 'no-store',
                });

                if (!response.ok) return;

                const result = await response.json();
                if (result.success) {
                    setPurchaseProducts(result.products || []);
                }
            } catch (error) {
                console.error('Could not load purchase products:', error);
            }
        }

        loadPurchaseProducts();
    }, []);

    useEffect(() => {
        if (!records.length) return;
        const params = new URLSearchParams(window.location.search);
        const editDate = params.get('edit');
        if (!editDate || editingRecord?.date === editDate) return;

        const record = records.find((item) => item.date === editDate);
        if (record) {
            // eslint-disable-next-line react-hooks/set-state-in-effect -- Restore edit state from URL after records load.
            setEditingRecord(record);
            setEditInvest(String(record.invest ?? 0));
            setEditIncome(String(record.income ?? 0));
            setEditCash(String(record.cash ?? 0));
            setEditMessage('');
        }
    }, [records, editingRecord]);

    function openEditModal(record) {
        setEditingRecord(record);
        setEditInvest(String(record.invest ?? 0));
        setEditIncome(String(record.income ?? 0));
        setEditCash(String(record.cash ?? 0));
        setEditMessage('');
        const url = new URL(window.location.href);
        url.searchParams.set('edit', record.date);
        window.history.replaceState(null, '', url);
    }

    function closeEditModal() {
        setEditingRecord(null);
        setEditMessage('');
        const url = new URL(window.location.href);
        url.searchParams.delete('edit');
        window.history.replaceState(null, '', url);
    }

    async function saveEditedRecord(event) {
        event.preventDefault();
        if (!editingRecord || isEditSaving) return;

        const values = {
            invest: Number(editInvest),
            income: Number(editIncome),
            cash: Number(editCash),
        };
        if ([editInvest, editIncome, editCash].some((value) => value.trim() === '') ||
            Object.values(values).some((value) => !Number.isFinite(value) || value < 0)) {
            setEditMessage('Tinoti amount enter kara (0 allowed).');
            return;
        }

        setIsEditSaving(true);
        setEditMessage('');
        try {
            const response = await axiosFetch(
                `${apiUrl}/api/records/${encodeURIComponent(editingRecord.date)}`,
                {
                    method: 'PUT',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(values),
                }
            );
            if (response.status === 401) {
                window.location.replace('/');
                return;
            }
            const result = await response.json();
            if (!response.ok || !result.success) {
                showError(result.message || 'Record update heiparila nahi.');
                return;
            }
            setRecords((previous) =>
                previous.map((record) =>
                    record.date === result.record.date ? result.record : record
                ).sort((a, b) => b.date.localeCompare(a.date))
            );
            closeEditModal();
            showSuccess('Record update hela.');
        } catch {
            showError('Backend re connect heiparuni. Internet/server connection check kara.');
        } finally {
            setIsEditSaving(false);
        }
    }


    async function deleteRecord(recordDate) {
        setDeletingDate(recordDate);
        setMessage('');

        try {
            const response = await axiosFetch(
                `${apiUrl}/api/records/${encodeURIComponent(recordDate)}`,
                {
                    method: 'DELETE',
                    credentials: 'include',
                }
            );

            if (response.status === 401) {
                window.location.replace('/');
                return;
            }

            const result = await response.json();

            if (!response.ok || !result.success) {
                showError(result.message || 'Record delete heiparila nahi.');
                return;
            }

            setRecords((previous) =>
                previous.filter((record) => record.date !== recordDate)
            );

            if (editingRecord?.date === recordDate) {
                closeEditModal();
            }

            showSuccess(`${recordDate} record delete hela.`);
        } catch {
            showError('Backend re connect heiparuni. Internet/server connection check kara.');
        } finally {
            setDeletingDate('');
        }
    }

    const confirmDelete = async () => {
        if (!deleteTarget) return;

        setIsDeleting(true);
        try {
            await deleteRecord(deleteTarget.date);
            setDeleteTarget(null);
        } finally {
            setIsDeleting(false);
        }
    };

    async function saveRecord(event) {
        event.preventDefault();

        if (!date || isSaving) {
            showWarning('Date select kara.');
            return;
        }

        const updates = {};
        if (invest !== '') updates.invest = Number(invest);
        if (income !== '') updates.income = Number(income);
        if (cash !== '') updates.cash = Number(cash);
        if (purseCash !== '') updates.purseCash = Number(purseCash);

        if (Object.keys(updates).length === 0) {
            showWarning('At least one amount enter kara.');
            return;
        }

        setIsSaving(true);
        setMessage('');

        try {
            const response = await axiosFetch(`${apiUrl}/api/records/${date}`, {
                method: 'PUT',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates),
            });

            const result = await response.json();

            if (response.status === 401) {
                window.location.replace('/');
                return;
            }

            if (!response.ok || !result.success) {
                showError(result.message || 'Record save heiparila nahi.');
                return;
            }

            setRecords((previous) => {
                const otherRecords = previous.filter(
                    (record) => record.date !== result.record.date
                );
                return [result.record, ...otherRecords].sort((a, b) =>
                    b.date.localeCompare(a.date)
                );
            });

            showSuccess('Record successfully save hela.');
            setDate(getTodayDate());
            setInvest('');
            setIncome('');
            setCash('');
            setPurseCash('');
        } catch {
            showError('Backend re connect heiparuni. Internet/server connection check kara.');
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <DashboardLayout>
            <div className="mx-auto w-full max-w-[1600px] space-y-6 p-4 sm:p-6">
                <Form title="Daily Invest & Income"
                    fields={[
                        {
                            name: 'date',
                            label: 'Date',
                            type: 'date',
                            required: true,
                        },
                        {
                            name: 'invest',
                            label: 'Invest (₹)',
                            type: 'number',
                            min: 0,
                            step: 'any',
                            placeholder: 'Enter investment',
                        },
                        {
                            name: 'income',
                            label: 'Income (₹)',
                            type: 'number',
                            min: 0,
                            step: 'any',
                            placeholder: 'Enter income',
                        },
                        {
                            name: 'cash',
                            label: 'Cash (₹)',
                            type: 'number',
                            min: 0,
                            step: 'any',
                            placeholder: 'Enter cash',
                        },
                        {
                            name: 'purseCash',
                            label: 'Total Cash in Purse (₹)',
                            type: 'number',
                            min: 0,
                            step: 'any',
                            placeholder: 'Enter total purse cash (optional)',
                            required: false,
                        },
                    ]}
                    values={{ date, invest, income, cash, purseCash }}
                    onChange={(name, value) => {
                        const setters = {
                            date: setDate,
                            invest: setInvest,
                            income: setIncome,
                            cash: setCash,
                            purseCash: setPurseCash,
                        };

                        setters[name]?.(value);

                        if (name === 'date' && value) {
                            setSelectedMonth(value.slice(0, 7));
                        }
                    }}
                    onSubmit={saveRecord}
                    submitText="Save Record"
                    isSubmitting={isSaving}
                    message={message}
                />

                <section className="rounded-2xl border border-[#D8E5D8] bg-white p-5 shadow-sm">
                    <h2 className="text-lg font-semibold text-[#174D35]">
                        Total Cash in Purse
                    </h2>

                    {(() => {
                        const purseRecords = records
                            .filter((record) => Number(record.purseCash) > 0)
                            .sort((a, b) => b.date.localeCompare(a.date));

                        const latest = purseRecords[0];

                        return latest ? (
                            <>
                                <p className="mt-2 text-sm text-[#52715D]">
                                    Date: {new Date(`${latest.date}T00:00:00`).toLocaleDateString('en-IN')}
                                </p>
                                <p className="mt-2 text-2xl font-bold text-[#176B45]">
                                    ₹{Number(latest.purseCash).toLocaleString('en-IN', {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                    })}
                                </p>
                            </>
                        ) : (
                            <p className="mt-2 text-sm text-[#52715D]">
                                No purse cash recorded yet.
                            </p>
                        );
                    })()}
                </section>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-xl font-semibold text-[#174D35]">Monthly Records</h2>
                        <p className="mt-1 text-sm text-[#52715D]">
                            Select a month to view its records
                        </p>
                    </div>

                    <select
                        value={selectedMonth}
                        onChange={(event) => setSelectedMonth(event.target.value)}
                        className="rounded-lg border border-[#D8E5D8] bg-white p-3 text-[#174D35] outline-none focus:ring-2 focus:ring-[#176B45]"
                    >
                        <option value="">All Months</option>
                        {availableMonths.map((month) => (
                            <option key={month} value={month}>
                                {new Date(`${month}-01T00:00:00`).toLocaleDateString('en-IN', {
                                    month: 'long',
                                    year: 'numeric',
                                })}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="overflow-hidden rounded-2xl border border-[#D8E5D8] bg-white shadow-sm">
                    <div className="border-b border-[#D8E5D8] px-5 py-4">
                        <h3 className="font-semibold text-[#174D35]">Daily Records</h3>
                        <p className="mt-1 text-sm text-[#52715D]">
                            Saved investment, income and cash entries
                        </p>
                    </div>

                    <Table
                        columns={[
                            {
                                key: 'date',
                                label: 'Date',
                                render: (row) => `${row.date.slice(8, 10)}-${row.date.slice(5, 7)}-${row.date.slice(0, 4)}`,
                            },
                            {
                                key: 'invest',
                                label: 'Invest',
                                render: (row) => (
                                    <span className="font-semibold text-red-600">
                                        ₹{(
                                            (Number(row.invest) || 0) +
                                            (Number(row.dailyUsage) || 0)
                                        ).toLocaleString('en-IN', {
                                            minimumFractionDigits: 0,
                                            maximumFractionDigits: 2,
                                        })}
                                    </span>
                                ),
                            },
                            {
                                key: 'income',
                                label: 'Income',
                                render: (row) => (
                                    <span className="font-semibold text-green-700">
                                        ₹{(row.income || 0).toLocaleString('en-IN')}
                                    </span>
                                ),
                            },
                            {
                                key: 'cash',
                                label: 'Cash',
                                render: (row) =>
                                    `₹${(row.cash || 0).toLocaleString('en-IN')}`,
                            },
                            {
                                key: 'profit',
                                label: 'Profit / Loss',
                                render: (row) => {
                                    const profit =
                                        (row.income || 0) -
                                        (row.invest || 0) -
                                        (row.cash || 0);

                                    return (
                                        <span
                                            className={`font-semibold ${profit < 0
                                                ? 'text-red-600'
                                                : 'text-[#176B45]'
                                                }`}
                                        >
                                            {profit < 0 ? '-' : profit > 0 ? '+' : ''}₹
                                            {Math.abs(profit).toLocaleString('en-IN')}
                                        </span>
                                    );
                                },
                            },
                        ]}
                        data={filteredRecords}
                        getRowKey={(row) => row.date}
                        emptyMessage="No records for this selection."
                        renderActions={(row) => (
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => openEditModal(row)}
                                    className="rounded-lg border border-[#BBD7C1] px-3 py-2 font-medium text-[#176B45] hover:bg-[#F1F7F0]"
                                >
                                    ✎ Edit
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setDeleteTarget(row)}
                                    disabled={deletingDate === row.date}
                                    className="rounded-lg border border-red-200 px-3 py-2 font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                                >
                                    {deletingDate === row.date
                                        ? 'Deleting...'
                                        : '🗑 Delete'}
                                </button>
                            </div>
                        )}
                    />
                </div>

                {editingRecord && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
                        onMouseDown={(event) => {
                            if (event.target === event.currentTarget) closeEditModal();
                        }}
                    >
                        <Form
                            title={`Edit Record — ${editingRecord.date}`}
                            fields={[
                                {
                                    name: 'invest',
                                    label: 'Invest (₹)',
                                    type: 'number',
                                    min: 0,
                                    step: 'any',
                                    required: true,
                                    placeholder: 'Enter investment',
                                },
                                {
                                    name: 'income',
                                    label: 'Income (₹)',
                                    type: 'number',
                                    min: 0,
                                    step: 'any',
                                    required: true,
                                    placeholder: 'Enter income',
                                },
                                {
                                    name: 'cash',
                                    label: 'Cash (₹)',
                                    type: 'number',
                                    min: 0,
                                    step: 'any',
                                    required: true,
                                    placeholder: 'Enter cash',
                                },
                            ]}
                            values={{
                                invest: editInvest,
                                income: editIncome,
                                cash: editCash,
                            }}
                            onChange={(name, value) => {
                                const setters = {
                                    invest: setEditInvest,
                                    income: setEditIncome,
                                    cash: setEditCash,
                                };

                                setters[name]?.(value);
                            }}
                            onSubmit={saveEditedRecord}
                            submitText="Save Changes"
                            isSubmitting={isEditSaving}
                            message={editMessage}
                        />
                    </div>
                )}

                {/* Daily Investment Dividing Table */}
                <div className="overflow-hidden rounded-2xl border border-[#D8E5D8] bg-white shadow-sm">
                    <div className="border-b border-[#D8E5D8] px-5 py-4">
                        <h3 className="font-semibold text-[#174D35]">
                            Daily Investment Dividing
                        </h3>
                        <p className="mt-1 text-sm text-[#52715D]">
                            Investment automatically divided between Deb, Puja and Lija
                        </p>
                    </div>

                    <Table
                        columns={[
                            {
                                key: 'date',
                                label: 'Date',
                                render: (row) => `${row.date.slice(8, 10)}-${row.date.slice(5, 7)}-${row.date.slice(0, 4)}`,
                            },
                            {
                                key: 'deb',
                                label: 'Deb',
                                render: (row) => (
                                    <span className="font-medium text-[#F87171]">
                                        -₹{Math.abs(row.deb).toFixed(2)}
                                    </span>
                                ),
                            },
                            {
                                key: 'puja',
                                label: 'Puja',
                                render: (row) => (
                                    <span className="font-medium text-[#F87171]">
                                        -₹{Math.abs(row.puja).toFixed(2)}
                                    </span>
                                ),
                            },
                            {
                                key: 'lija',
                                label: 'Lija',
                                render: (row) => (
                                    <span className="font-medium text-[#F87171]">
                                        -₹{Math.abs(row.lija).toFixed(2)}
                                    </span>
                                ),
                            },
                            {
                                key: 'invest',
                                label: 'Invest Price',
                                render: (row) => (
                                    <span className="font-semibold text-red-600">
                                        ₹{Number(row.invest || 0).toLocaleString('en-IN')}
                                    </span>
                                ),
                            },
                        ]}
                        data={filteredRecords.map((record) => {
                            const totalPaise = Math.round(
                                Number(record.invest || 0) * 100
                            );
                            const basePaise = Math.floor(totalPaise / 3);
                            const remainder = totalPaise - basePaise * 3;

                            return {
                                date: record.date,
                                invest: Number(record.invest || 0),
                                deb: basePaise / 100,
                                puja: (basePaise + (remainder >= 1 ? 1 : 0)) / 100,
                                lija: (basePaise + (remainder >= 2 ? 1 : 0)) / 100,
                            };
                        })}
                        getRowKey={(row) => row.date}
                        emptyMessage="No investment records for this month."
                        renderActions={(row) => {
                            const record = records.find(
                                (item) => item.date === row.date
                            );

                            return (
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => record && openEditModal(record)}
                                        className="rounded-lg border border-[#BBD7C1] px-3 py-2 font-medium text-[#176B45] hover:bg-[#F1F7F0]"
                                    >
                                        ✎ Edit
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setDeleteTarget(row)}
                                        disabled={deletingDate === row.date}
                                        className="rounded-lg border border-red-200 px-3 py-2 font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                                    >
                                        {deletingDate === row.date
                                            ? 'Deleting...'
                                            : '🗑 Delete'}
                                    </button>
                                </div>
                            );
                        }}
                    />
                </div>
            </div>

            <Warning
                open={Boolean(deleteTarget)}
                title="Delete Record?"
                message={
                    deleteTarget
                        ? `${deleteTarget.date} ra record permanently delete kariba ki? Ehi action undo karipariba nahi.`
                        : ''
                }
                confirmText="Confirm Delete"
                cancelText="Cancel"
                loading={isDeleting}
                onConfirm={confirmDelete}
                onCancel={() => {
                    if (!isDeleting) setDeleteTarget(null);
                }}
            />

        </DashboardLayout>
    );
}