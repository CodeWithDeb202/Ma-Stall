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
    const [stockKharcha, setStockKharcha] = useState('');
    const [income, setIncome] = useState('');
    const [cash, setCash] = useState('');
    const [purseCash, setPurseCash] = useState('');
    const [records, setRecords] = useState([]);
    const [dividingRecords, setDividingRecords] = useState([]);
    const [dividingDate, setDividingDate] = useState(getTodayDate);
    const [dividingDailyKharcha, setDividingDailyKharcha] = useState('');
    const [dividingStockKharcha, setDividingStockKharcha] = useState('');
    const [dividingIncome, setDividingIncome] = useState('');
    const [dividingCash, setDividingCash] = useState('');
    const [isDividingSaving, setIsDividingSaving] = useState(false);
    const [editingDividingRecord, setEditingDividingRecord] = useState(null);
    const [dividingEditValues, setDividingEditValues] = useState({});
    const [dividingDeleteTarget, setDividingDeleteTarget] = useState(null);
    const [isDividingDeleting, setIsDividingDeleting] = useState(false);
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
                showError('Records load heiparila nahi. Check the backend connection.');
            }
        }

        loadRecords();

        async function loadDividingRecords() {
            try {
                const response = await axiosFetch(apiUrl + '/api/daily-investment-dividing', { credentials: 'include', cache: 'no-store' });
                if (response.status === 401) { window.location.replace('/'); return; }
                if (!response.ok) throw new Error('Failed to load dividing records');
                const result = await response.json();
                const records = Array.isArray(result) ? result : (Array.isArray(result.records) ? result.records : []);
                setDividingRecords(records.filter((record) => record && typeof record.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(record.date)));
            } catch (error) {
                showError(error.message || 'Could not load Daily Investment Dividing records');
            }
        }

        loadDividingRecords();

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
                showError(result.message || 'Unable to update the record.');
                return;
            }
            setRecords((previous) =>
                previous.map((record) =>
                    record.date === result.record.date ? result.record : record
                ).sort((a, b) => b.date.localeCompare(a.date))
            );
            closeEditModal();
            showSuccess('Record updated successfully.');
        } catch {
            showError('Unable to connect to the backend. Check your internet or server connection.');
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
                showError(result.message || 'Unable to delete the record.');
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
            showError('Unable to connect to the backend. Check your internet or server connection.');
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
            showWarning('Select a date.');
            return;
        }

        const updates = {};
        if (invest !== '') updates.invest = Number(invest);
        if (stockKharcha !== '') updates.stockKharcha = Number(stockKharcha);
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
                showError(result.message || 'Unable to save the record.');
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

            showSuccess('Record saved successfully.');
            setDate(getTodayDate());
            setInvest('');
            setStockKharcha('');
            setIncome('');
            setCash('');
            setPurseCash('');
        } catch {
            showError('Unable to connect to the backend. Check your internet or server connection.');
        } finally {
            setIsSaving(false);
        }
    }

    async function saveDividingRecord(event) {
        event.preventDefault();
        if (!dividingDate || isDividingSaving) { showWarning('Select a date.'); return; }
        const values = { dailyKharcha: Number(dividingDailyKharcha || 0), stockKharcha: Number(dividingStockKharcha || 0), income: Number(dividingIncome || 0), cash: Number(dividingCash || 0) };
        if ([dividingDailyKharcha, dividingStockKharcha, dividingIncome, dividingCash].some((value) => value !== '' && (!Number.isFinite(Number(value)) || Number(value) < 0))) { showWarning('Amounts valid positive number heba darkar.'); return; }
        setIsDividingSaving(true);
        try {
            const response = await axiosFetch(apiUrl + '/api/daily-investment-dividing/' + dividingDate, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) });
            const result = await response.json();
            if (response.status === 401) { window.location.replace('/'); return; }
            if (!response.ok) { showError(result.message || 'Unable to save the dividing record.'); return; }
            const savedRecord = result.record;
            if (!savedRecord || typeof savedRecord.date !== 'string') {
                showError('The server returned an invalid dividing record. Please refresh and try again.');
                return;
            }
            setDividingRecords((previous) =>
                [savedRecord, ...previous.filter((record) => record.date !== savedRecord.date)]
                    .filter((record) => record && typeof record.date === 'string')
                    .sort((a, b) => b.date.localeCompare(a.date))
            );
            showSuccess('Daily investment dividing record saved successfully.');
            setDividingDate(getTodayDate()); setDividingDailyKharcha(''); setDividingStockKharcha(''); setDividingIncome(''); setDividingCash('');
        } catch { showError('Unable to save the dividing record.'); } finally { setIsDividingSaving(false); }
    }

    return (
        <DashboardLayout>
            <div className="mx-auto w-full max-w-[1600px] space-y-6 p-4 sm:p-6">
                <Form title="Daily Kharcha & Income"
                    fields={[
                        {
                            name: 'date',
                            label: 'Date',
                            type: 'date',
                            required: true,
                        },
                        {
                            name: 'invest',
                            label: 'Invest \u20B9',
                            type: 'number',
                            min: 0,
                            step: 'any',
                            placeholder: 'Enter daily kharcha',
                        },
                        {
                            name: 'income',
                            label: 'Income \u20B9',
                            type: 'number',
                            min: 0,
                            step: 'any',
                            placeholder: 'Enter income',
                        },
                        {
                            name: 'cash',
                            label: 'Cash \u20B9',
                            type: 'number',
                            min: 0,
                            step: 'any',
                            placeholder: 'Enter cash',
                        },
                        {
                            name: 'purseCash',
                            label: 'Total Cash in Purse \u20B9',
                            type: 'number',
                            min: 0,
                            step: 'any',
                            placeholder: 'Enter total purse cash (optional)',
                            required: false,
                        },
                    ]}
                    values={{ date, invest, stockKharcha, income, cash, purseCash }}
                    onChange={(name, value) => {
                        const setters = {
                            date: setDate,
                            invest: setInvest,
                            stockKharcha: setStockKharcha,
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
                                    {'\u20B9'}{Number(latest.purseCash).toLocaleString('en-IN', {
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
                                        {'\u20B9'}{(
                                            row.invest ? Number(row.invest) : (Number(row.dailyUsage) || 0)
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
                                        {'\u20B9'} {(row.income || 0).toLocaleString('en-IN')}
                                    </span>
                                ),
                            },
                            {
                                key: 'cash',
                                label: 'Cash',
                                render: (row) =>
                                    `\u20B9${(row.cash || 0).toLocaleString('en-IN')}`,
                            },
                            {
                                key: 'profit',
                                label: 'Profit / Loss',
                                render: (row) => {
                                    const profit = (row.income || 0) - (row.invest ? (row.invest || 0) : (row.dailyUsage || 0)) - (row.cash || 0);

                                    return (
                                        <span
                                            className={`font-semibold ${profit < 0
                                                ? 'text-red-600'
                                                : 'text-[#176B45]'
                                                }`}
                                        >
                                            {profit < 0 ? '-' : profit > 0 ? '+' : ''}{'\u20B9'}
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
                                    Edit
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setDeleteTarget(row)}
                                    disabled={deletingDate === row.date}
                                    className="rounded-lg border border-red-200 px-3 py-2 font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                                >
                                    {deletingDate === row.date
                                        ? 'Deleting...'
                                        : 'Delete'}
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
                            title={`Edit Record â€” ${editingRecord.date}`}
                            fields={[
                                {
                                    name: 'invest',
                                    label: 'Invest \u20B9',
                                    type: 'number',
                                    min: 0,
                                    step: 'any',
                                    required: true,
                                    placeholder: 'Enter daily kharcha',
                                },
                                {
                                    name: 'income',
                                    label: 'Income \u20B9',
                                    type: 'number',
                                    min: 0,
                                    step: 'any',
                                    required: true,
                                    placeholder: 'Enter income',
                                },
                                {
                                    name: 'cash',
                                    label: 'Cash \u20B9',
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

                <div className="mb-6 rounded-2xl border border-[#D8E5D8] bg-white p-5 shadow-sm">
                    <h3 className="mb-4 font-semibold text-[#174D35]">{editingDividingRecord ? 'Edit Daily Investment Dividing' : 'Add Daily Investment Dividing'}</h3>
                    <Form
                        title="Daily Investment Dividing Entry"
                        fields={[
                            { name: 'date', label: 'Date', type: 'date', required: true },
                            { name: 'dailyKharcha', label: 'Daily Kharcha \u20B9', type: 'number', required: true },
                            { name: 'stockKharcha', label: 'Stock Kharcha \u20B9', type: 'number', required: true },
                            { name: 'income', label: 'Total Income \u20B9', type: 'number', required: true },
                            { name: 'cash', label: 'Cash \u20B9', type: 'number', required: true },
                        ]}
                        values={{
                            date: dividingDate,
                            dailyKharcha: dividingDailyKharcha,
                            stockKharcha: dividingStockKharcha,
                            income: dividingIncome,
                            cash: dividingCash,
                        }}
                        onChange={(name, value) => {
                            const setters = {
                                date: setDividingDate,
                                dailyKharcha: setDividingDailyKharcha,
                                stockKharcha: setDividingStockKharcha,
                                income: setDividingIncome,
                                cash: setDividingCash,
                            };
                            setters[name]?.(value);
                        }}
                        onSubmit={saveDividingRecord}
                        submitText={editingDividingRecord ? 'Update Dividing Record' : 'Save Dividing Record'}
                        isSubmitting={isDividingSaving}
                    />
                    {editingDividingRecord && (
                        <button type="button" onClick={() => { setEditingDividingRecord(null); setDividingDate(getTodayDate()); setDividingDailyKharcha(''); setDividingStockKharcha(''); setDividingIncome(''); setDividingCash(''); }} className="mt-3 rounded-lg border border-gray-300 px-4 py-2 text-sm">Cancel Edit</button>
                    )}
                </div>

                {/* Daily Kharcha and Profit Table */}
                <div className="overflow-hidden rounded-2xl border border-[#D8E5D8] bg-white shadow-sm">
                    <div className="border-b border-[#D8E5D8] px-5 py-4">
                        <h3 className="font-semibold text-[#174D35]">Daily Investment Dividing</h3>
                        <p className="mt-1 text-sm text-[#52715D]">Profit = Total Income - Daily Kharcha - Stock Kharcha - Cash; Divide 3 = Profit / 3</p>
                    </div>
                    <Table
                        columns={[
                            { key: 'date', label: 'Date', render: (row) => String(row.date || '').length === 10 ? String(row.date).slice(8, 10) + '-' + String(row.date).slice(5, 7) + '-' + String(row.date).slice(0, 4) : '-' },
                            { key: 'dailyKharcha', label: 'Daily Kharcha', render: (row) => <span className='font-semibold text-red-600'>{'\u20B9 ' + row.dailyKharcha.toFixed(2)}</span> },
                            { key: 'stockKharcha', label: 'Stock Kharcha', render: (row) => <span className='font-semibold text-red-600'>{'\u20B9 ' + row.stockKharcha.toFixed(2)}</span> },
                            { key: 'income', label: 'Total Income', render: (row) => '\u20B9 ' + row.income.toFixed(2) },
                            { key: 'cash', label: 'Cash', render: (row) => '\u20B9 ' + row.cash.toFixed(2) },
                            { key: 'profit', label: 'Profit', render: (row) => <span className={row.profit < 0 ? 'font-semibold text-red-600' : 'font-semibold text-[#176B45]'}>{'\u20B9 ' + row.profit.toFixed(2)}</span> },
                            { key: 'divide3', label: 'Divide 3', render: (row) => '\u20B9 ' + row.divide3.toFixed(2) },
                        ]}
                        data={dividingRecords.map((record) => {
                            const dailyKharcha = Number(record.dailyKharcha || 0);
                            const stockKharcha = Number(record.stockKharcha || 0);
                            const income = Number(record.income || 0);
                            const cash = Number(record.cash || 0);
                            const profit = income - dailyKharcha - stockKharcha - cash;
                            return { ...record, dailyKharcha, stockKharcha, income, cash, profit, divide3: profit / 3 };
                        })}
                        getRowKey={(row) => row.date}
                        emptyMessage="No Daily Investment Dividing records yet."
                        renderActions={(row) => (
                            <div className="flex items-center gap-2">
                                <button type="button" onClick={() => { setEditingDividingRecord(row.date); setDividingDate(row.date); setDividingDailyKharcha(String(row.dailyKharcha)); setDividingStockKharcha(String(row.stockKharcha)); setDividingIncome(String(row.income)); setDividingCash(String(row.cash)); }} className="rounded-lg border border-[#BBD7C1] px-3 py-2 font-medium text-[#176B45] hover:bg-[#F1F7F0]">Edit</button>
                                <button
                                    type="button"
                                    onClick={() => setDividingDeleteTarget(row)}
                                    disabled={isDividingDeleting}
                                    className="rounded-lg border border-red-200 px-3 py-2 font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                                >
                                    Delete
                                </button>
                            </div>
                        )}
                    />
                </div>
            </div>

            <Warning
                open={Boolean(dividingDeleteTarget)}
                title="Delete Dividing Record?"
                message={
                    dividingDeleteTarget
                        ? `Are you sure you want to permanently delete the dividing record for ${dividingDeleteTarget.date}? This action cannot be undone.`
                        : ''
                }
                confirmText="Confirm Delete"
                cancelText="Cancel"
                loading={isDividingDeleting}
                onConfirm={async () => {
                    if (!dividingDeleteTarget || isDividingDeleting) return;

                    const dateToDelete = dividingDeleteTarget.date;
                    setIsDividingDeleting(true);

                    try {
                        const response = await axiosFetch(
                            apiUrl + '/api/daily-investment-dividing/' + dateToDelete,
                            { method: 'DELETE', credentials: 'include' }
                        );
                        const result = await response.json().catch(() => ({}));

                        if (response.status === 401) {
                            window.location.replace('/');
                            return;
                        }
                        if (!response.ok) {
                            throw new Error(result.message || 'Unable to delete the dividing record.');
                        }

                        setDividingRecords((previous) =>
                            previous.filter((item) => item.date !== dateToDelete)
                        );
                        setDividingDeleteTarget(null);
                        showSuccess('Dividing record deleted successfully.');
                    } catch (error) {
                        showError(error.message || 'Unable to delete the dividing record.');
                    } finally {
                        setIsDividingDeleting(false);
                    }
                }}
                onCancel={() => {
                    if (!isDividingDeleting) setDividingDeleteTarget(null);
                }}
            />

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


