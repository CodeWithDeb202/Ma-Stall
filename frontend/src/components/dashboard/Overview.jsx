'use client';

import { useEffect, useMemo, useState } from 'react';
import Spinner from '../reusable/Spinner';

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})}`;

const dateText = (value) => {
  if (!value) return '';
  const [y, m, d] = value.split('-');
  return `${d}-${m}-${y}`;
};

async function loadList(url, key) {
  const response = await fetch(url, { credentials: 'include', cache: 'no-store' });
  if (!response.ok) throw new Error(`Could not load ${key}`);
  const data = await response.json();
  return data[key] || [];
}

export default function Overview() {
  // Use a stable initial date on server and browser to avoid hydration mismatch.
  const [year, setYear] = useState('2026');
  const [month, setMonth] = useState('01');
  const [day, setDay] = useState('01');
  const [datePreferenceLoaded, setDatePreferenceLoaded] = useState(false);

  useEffect(() => {
    try {
      const savedDate = localStorage.getItem('overview-selected-date');
      const initialDate = savedDate && /^\d{4}-\d{2}-\d{2}$/.test(savedDate)
        ? savedDate
        : today();

      setYear(initialDate.slice(0, 4));
      setMonth(initialDate.slice(5, 7));
      setDay(initialDate.slice(8, 10));
    } finally {
      setDatePreferenceLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!datePreferenceLoaded) return;
    try {
      localStorage.setItem('overview-selected-date', `${year}-${month}-${day}`);
    } catch (error) {
      console.error('Could not save selected overview date:', error);
    }
  }, [year, month, day, datePreferenceLoaded]);
  const [records, setRecords] = useState([]);
  const [dailyBuying, setDailyBuying] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [stock, setStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const selectedDate = `${year}-${month}-${day}`;

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const [r, d, p, s] = await Promise.all([
          loadList('/api/records', 'records'),
          loadList('/api/daily-buying-products', 'products'),
          loadList('/api/purchase-products', 'products'),
          loadList('/api/stock-products', 'products'),
        ]);

        if (active) {
          setRecords(r);
          setDailyBuying(d);
          setPurchases(p);
          setStock(s);
        }
      } catch (e) {
        if (active) setError(e.message || 'Overview data load heiparila nahi.');
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => { active = false; };
  }, []);

  const savedDates = useMemo(() => {
    const dates = new Set();

    [...records, ...dailyBuying, ...purchases, ...stock].forEach((item) => {
      const raw = item.date || item.createdAt;
      if (!raw) return;

      const value = String(raw).slice(0, 10);
      const match = value.match(/^(\d{2})-(\d{2})-(\d{4})$/);
      const normalized = match ? `${match[3]}-${match[2]}-${match[1]}` : value;

      if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
        dates.add(normalized);
      }
    });

    return [...dates].sort();
  }, [records, dailyBuying, purchases, stock]);

  const availableDates = useMemo(() => {
    const dates = new Set();

    [...records, ...dailyBuying, ...purchases, ...stock].forEach((item) => {
      const raw = item.date || item.createdAt;
      if (!raw) return;

      const value = String(raw).slice(0, 10);
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) dates.add(value);
    });

    return [...dates].sort((a, b) => b.localeCompare(a));
  }, [records, dailyBuying, purchases, stock]);

  const availableYears = useMemo(() => {
    const years = new Set(availableDates.map((value) => value.slice(0, 4)));
    return [...years].sort((a, b) => b.localeCompare(a));
  }, [availableDates]);

  const availableMonths = useMemo(() => {
    const months = new Set(
      availableDates
        .filter((value) => value.startsWith(`${year}-`))
        .map((value) => value.slice(5, 7))
    );

    return [...months].sort();
  }, [availableDates, year]);

  const availableDays = useMemo(() => {
    const days = new Set(
      availableDates
        .filter((value) => value.startsWith(`${year}-${month}-`))
        .map((value) => value.slice(8, 10))
    );

    return [...days].sort();
  }, [availableDates, year, month]);

  const daysInMonth = new Date(Number(year), Number(month), 0).getDate();
  const safeDay = String(Math.min(Number(day), daysInMonth)).padStart(2, '0');
  const date = `${year}-${month}-${safeDay}`;
  useEffect(() => {
    if (datePreferenceLoaded) {
      localStorage.setItem('overview-selected-date', date);
    }
  }, [date, datePreferenceLoaded]);

  const record = records.find((item) => item.date === date) || {};
  const buyingToday = dailyBuying.filter((item) => item.date === date);
  const purchasesToday = purchases.filter((item) => item.date === date);
  const dailyUsage = purchasesToday.filter((item) => item.category === 'Daily Usage');
  const stockPurchases = purchasesToday.filter((item) => item.category === 'Stock Product');
  const permanentStockToday = stock.filter((item) => {
    const itemDate = item.date || (item.createdAt ? String(item.createdAt).slice(0, 10) : '');
    return itemDate === date && String(item.category || '').toLowerCase().includes('permanent');
  });

  const invest = record.invest ? Number(record.invest || 0) : Number(record.dailyUsage || 0);
  const income = Number(record.income || 0);
  const cash = Number(record.cash || 0);
  const baseProfit = income - invest - cash;
  const dailyBuyingExpense = buyingToday.reduce(
    (sum, item) => sum + (Number(item.price) || 0),
    0
  );

  const dailyUsageExpense = dailyUsage.reduce(
    (sum, item) => sum + (Number(item.price) || 0),
    0
  );

  // Only subtract Daily Buying expenses for the selected date.
  const afterExpenses = baseProfit - dailyBuyingExpense;
  const profitShare = afterExpenses / 3;


  const cards = [
    { title: 'Daily Invest', value: money(invest), note: 'Investment for selected date', color: 'text-red-600' },
    { title: 'Daily Income', value: money(income), note: 'Income for selected date', color: 'text-green-700' },
    { title: 'Cash', value: money(cash), note: 'Cash recorded for selected date', color: 'text-amber-700' },
    { title: 'Daily Usage Products', value: dailyUsage.length, note: 'Products bought that day', color: 'text-indigo-700' },
    { title: 'Stock Products', value: stockPurchases.length, note: 'Stock-category purchases that day', color: 'text-sky-700' },
    { title: 'Permanent Stock', value: permanentStockToday.length, note: 'Permanent stock entries for that day', color: 'text-teal-700' },
    { title: 'Profit', value: money(baseProfit), note: 'Income − Invest − Cash', color: baseProfit >= 0 ? 'text-green-700' : 'text-red-600' },
    { title: 'Invest ÷ 3', value: money(invest / 3), note: 'One-third of daily investment', color: 'text-red-600' },
    { title: 'Daily Usage Expenses', value: money(dailyUsageExpense), note: 'Daily Usage purchases', color: 'text-red-600' },
    { title: 'Profit After Expenses', value: money(afterExpenses), note: 'Profit − Daily Buying Expenses − Permanent Stock Expenses', color: afterExpenses >= 0 ? 'text-green-700' : 'text-red-600' },
    { title: 'Profit After Expenses ÷ 3', value: money(profitShare), note: 'One-third share for each person', color: profitShare >= 0 ? 'text-green-700' : 'text-red-600' },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 md:p-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#52715D]">Overview</p>
        <h1 className="mt-1 text-2xl font-bold text-[#174D35] md:text-3xl">Daily Overview</h1>
        <p className="mt-2 text-sm text-[#52715D]">Review your investment, income, purchases and profit for a selected date.</p>
      </header>

      <section className="rounded-2xl border border-[#D8E5D8] bg-white p-4 shadow-sm md:p-5">
        <h2 className="mb-4 text-lg font-bold text-[#174D35]">Select Date</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <label className="text-sm font-medium text-[#174D35]">
            Year
            <select value={year} onChange={(e) => {
              const nextYear = e.target.value;
              setYear(nextYear);
              const nextMonth = availableDates.find((value) => value.startsWith(`${nextYear}-`))?.slice(5, 7)
                || (nextYear === today().slice(0, 4) ? today().slice(5, 7) : '01');
              setMonth(nextMonth);
              const nextDay = availableDates.find((value) => value.startsWith(`${nextYear}-${nextMonth}-`))?.slice(8, 10)
                || (nextYear === today().slice(0, 4) && nextMonth === today().slice(5, 7) ? today().slice(8, 10) : '01');
              setDay(nextDay);
            }} className="mt-2 w-full rounded-xl border border-[#D8E5D8] bg-white p-3">
              {availableYears.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium text-[#174D35]">
            Month
            <select value={month} onChange={(e) => setMonth(e.target.value)} className="mt-2 w-full rounded-xl border border-[#D8E5D8] bg-white p-3">
              {availableMonths.map((m) => (
                <option key={m} value={m}>{new Date(2000, Number(m) - 1, 1).toLocaleDateString('en-IN', { month: 'long' })}</option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-[#174D35]">
            Date
            <select value={safeDay} onChange={(e) => setDay(e.target.value)} className="mt-2 w-full rounded-xl border border-[#D8E5D8] bg-white p-3">
              {availableDays.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </label>
        </div>
        <p className="mt-4 text-sm text-[#52715D]">Showing data for <strong>{dateText(date)}</strong></p>
      </section>

      {loading ? (
        <div className="flex min-h-80 items-center justify-center rounded-2xl border border-[#D8E5D8] bg-white">
          <Spinner label="Loading overview..." />
        </div>
      ) : error ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error} Refresh the page and check that the backend is available.
        </div>
      ) : (
        <section>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <h2 className="text-xl font-bold text-[#174D35]">Daily Summary Cards</h2>
            <p className="text-sm text-[#52715D]">{dateText(date)}</p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {cards.map((card) => (
              <article key={card.title} className="rounded-2xl border border-[#D8E5D8] bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold text-[#52715D]">{card.title}</p>
                <p className={`mt-3 wrap-break-word text-2xl font-bold ${card.color}`}>{card.value}</p>
                <p className="mt-2 text-xs leading-5 text-[#52715D]">{card.note}</p>
              </article>
            ))}
          </div>
          <p className="mt-4 text-xs leading-5 text-[#52715D]">
            Note: product counts and expenses use records saved against the selected date. Total Cash in Purse is intentionally not displayed here.
          </p>
        </section>
      )}
    </div>
  );
}
