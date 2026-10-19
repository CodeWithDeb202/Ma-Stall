'use client';
import axiosFetch from "@/lib/axios-fetch";

import { useCallback, useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../layout/DashboardLayout';

import apiUrl from '@/services/api';

const COLORS = {
  invest: '#DC2626',
  income: '#16A34A',
  profit: '#9333EA',
};

function localDate(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function parseDate(value) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function shiftDate(value, amount) {
  const date = parseDate(value);
  date.setDate(date.getDate() + amount);
  return localDate(date);
}

function mondayOf(value) {
  const date = parseDate(value);
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return localDate(date);
}

function money(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function shortDate(value) {
  return parseDate(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
  });
}

function monthLabel(value) {
  return parseDate(`${value}-01`).toLocaleDateString('en-IN', {
    month: 'short',
    year: 'numeric',
  });
}

function summarize(records, products, start, end) {
  const daily = records.filter((r) => r.date >= start && r.date <= end);
  const purchases = products.filter((p) => p.date >= start && p.date <= end);

  const investment = daily.reduce((sum, r) => sum + Number(r.invest || 0), 0);
  const earning = daily.reduce((sum, r) => sum + Number(r.income || 0), 0);
  const productExpenses = purchases.reduce(
    (sum, p) => sum + Number(p.price || 0), 0
  );

  return {
    invest: investment + productExpenses,
    income: earning,
    profit: earning - (investment + productExpenses),
    productCount: purchases.length,
  };
}

function periodData(records, products, mode, start, end) {
  const keys = new Set();

  if (mode === 'daily') {
    for (let d = start; d <= end; d = shiftDate(d, 1)) keys.add(d);
  } else if (mode === 'weekly') {
    for (let d = start; d <= end; d = shiftDate(d, 7)) keys.add(d);
  } else if (mode === 'monthly') {
    let d = `${start.slice(0, 7)}-01`;
    while (d <= end) {
      keys.add(d.slice(0, 7));
      const date = parseDate(d);
      date.setMonth(date.getMonth() + 1);
      d = localDate(date);
    }
  } else {
    for (let year = Number(start.slice(0, 4)); year <= Number(end.slice(0, 4)); year++) {
      keys.add(String(year));
    }
  }

  const periods = [...keys];

  return periods.map((key) => {
    let from;
    let to;

    if (mode === 'daily') {
      from = key;
      to = key;
    } else if (mode === 'weekly') {
      from = key;
      to = shiftDate(key, 6);
    } else if (mode === 'monthly') {
      from = `${key}-01`;
      const [year, month] = key.split('-').map(Number);
      to = localDate(new Date(year, month, 0));
    } else {
      from = `${key}-01-01`;
      to = `${key}-12-31`;
    }

    const totals = summarize(records, products, from, to);

    let label = key;
    if (mode === 'daily') label = shortDate(key);
    if (mode === 'weekly') label = shortDate(key);
    if (mode === 'monthly') label = monthLabel(key);

    return { key, label, ...totals };
  });
}

function LineChart({ title, subtitle, data, mode }) {
  const width = 900;
  const height = 300;
  const left = 76;
  const right = 22;
  const top = 22;
  const bottom = 50;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;

  const values = data.flatMap((d) => [d.invest, d.income, d.profit]);
  const rawMin = Math.min(0, ...values);
  const rawMax = Math.max(0, ...values);
  const spread = rawMax - rawMin || 1;
  const min = rawMin - spread * 0.08;
  const max = rawMax + spread * 0.08;

  const x = (index) => left + (
    data.length <= 1 ? plotWidth / 2 : index * plotWidth / (data.length - 1)
  );
  const y = (value) => top + ((max - value) / (max - min)) * plotHeight;

  const series = [
    { key: 'invest', label: 'Total Invest', color: COLORS.invest },
    { key: 'income', label: 'Total Earning', color: COLORS.income },
    { key: 'profit', label: 'Profit / Loss', color: COLORS.profit },
  ];

  const labelIndexes = data.length <= 7
    ? data.map((_, i) => i)
    : [...new Set([0, Math.floor((data.length - 1) / 4), Math.floor((data.length - 1) / 2), Math.floor(3 * (data.length - 1) / 4), data.length - 1])];

  return (
    <section className="overflow-hidden rounded-2xl border border-[#D8E5D8] bg-white shadow-sm">
      <div className="border-b border-[#E5EEE4] px-5 py-4">
        <h2 className="font-semibold text-[#174D35]">{title}</h2>
        <p className="mt-1 text-sm text-[#52715D]">{subtitle}</p>
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-2 px-5 pt-4 text-sm">
        {series.map((item) => (
          <span key={item.key} className="flex items-center gap-2 text-[#52715D]">
            <span className="inline-block h-1 w-6 rounded" style={{ background: item.color }} />
            {item.label}
          </span>
        ))}
      </div>

      {data.length === 0 ? (
        <p className="p-8 text-center text-sm text-[#52715D]">No records available for this period.</p>
      ) : (
        <div className="w-full overflow-x-auto px-2 pb-3 pt-2">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            role="img"
            aria-label={`${title}: line chart comparing investment, earnings and profit or loss`}
            className="h-auto min-w-155 w-full"
          >
            {Array.from({ length: 5 }, (_, i) => {
              const value = max - ((max - min) * i) / 4;
              const yy = y(value);
              return (
                <g key={i}>
                  <line x1={left} x2={width - right} y1={yy} y2={yy} stroke="#E5EEE4" strokeDasharray="4 4" />
                  <text x={left - 10} y={yy + 4} textAnchor="end" fill="#52715D" fontSize="11">
                    {Math.abs(value) >= 1000
                      ? `${value < 0 ? '-' : ''}₹${(Math.abs(value) / 1000).toFixed(1)}k`
                      : `₹${Math.round(value)}`}
                  </text>
                </g>
              );
            })}

            {y(0) >= top && y(0) <= top + plotHeight && (
              <line x1={left} x2={width - right} y1={y(0)} y2={y(0)} stroke="#8CA394" strokeWidth="1.2" />
            )}

            {series.map((item) => {
              const points = data.map((d, i) => `${x(i)},${y(d[item.key])}`).join(' ');
              return (
                <g key={item.key}>
                  <polyline
                    points={points}
                    fill="none"
                    stroke={item.color}
                    strokeWidth="2.8"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                  {data.map((d, i) => (
                    <circle key={`${item.key}-${d.key}`} cx={x(i)} cy={y(d[item.key])} r="3.5" fill={item.color}>
                      <title>{`${d.label}: ${item.label} ${money(d[item.key])}`}</title>
                    </circle>
                  ))}
                </g>
              );
            })}

            {labelIndexes.map((index) => (
              <text
                key={`${data[index].key}-label`}
                x={x(index)}
                y={height - 20}
                textAnchor="middle"
                fill="#52715D"
                fontSize="11"
              >
                {data[index].label}
              </text>
            ))}
          </svg>
        </div>
      )}
    </section>
  );
}

export default function TotalRevenue() {
  const today = localDate(new Date());

  const [records, setRecords] = useState([]);
  const [products, setProducts] = useState([]);
  const [stockProducts, setStockProducts] = useState([]);
  const [permanentStockTotal, setPermanentStockTotal] = useState(0);
  const [permanentStockCount, setPermanentStockCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedWeek, setSelectedWeek] = useState(() => mondayOf(today));
  const [selectedMonth, setSelectedMonth] = useState(today.slice(0, 7));
  const [selectedYear, setSelectedYear] = useState(today.slice(0, 4));

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [recordsResponse, productsResponse] = await Promise.all([
        axiosFetch(`${apiUrl}/api/records`, {
          credentials: 'include',
          cache: 'no-store',
        }),
        axiosFetch(`${apiUrl}/api/daily-buying-products`, {
          credentials: 'include',
          cache: 'no-store',
        }),
      ]);

      if (recordsResponse.status === 401 || productsResponse.status === 401) {
        window.location.replace('/');
        return;
      }

      const [recordsResult, productsResult] = await Promise.all([
        recordsResponse.json(),
        productsResponse.json(),
      ]);

      if (!recordsResponse.ok || !recordsResult.success) {
        throw new Error(recordsResult.message || 'Daily records load heiparila nahi.');
      }
      if (!productsResponse.ok || !productsResult.success) {
        throw new Error(productsResult.message || 'Product records load heiparila nahi.');
      }

      setRecords(recordsResult.records || []);
      setProducts(productsResult.products || []);
    } catch (e) {
      setError(e.message || 'Backend connection check kara.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Load initial analytics data from the API.
    loadData();
  }, [loadData]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const week = params.get('week');
    const month = params.get('month');
    const year = params.get('year');

    if (week && /^\d{4}-\d{2}-\d{2}$/.test(week) && mondayOf(week) === week) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Restore the selected week from the URL.
      setSelectedWeek(week);
    }
    if (month && /^\d{4}-\d{2}$/.test(month)) setSelectedMonth(month);
    if (year && /^\d{4}$/.test(year)) setSelectedYear(year);
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('week', selectedWeek);
    url.searchParams.set('month', selectedMonth);
    url.searchParams.set('year', selectedYear);
    window.history.replaceState(null, '', url);
  }, [selectedWeek, selectedMonth, selectedYear]);

  const allDates = useMemo(
    () => [...records.map((r) => r.date), ...products.map((p) => p.date)]
      .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)),
    [records, products]
  );

  const weekOptions = useMemo(() => {
    const starts = new Set([mondayOf(today), mondayOf(selectedWeek)]);
    allDates.forEach((date) => starts.add(mondayOf(date)));
    return [...starts].sort((a, b) => b.localeCompare(a));
  }, [allDates, today, selectedWeek]);

  const monthOptions = useMemo(() => {
    return [...new Set([today.slice(0, 7), selectedMonth, ...allDates.map((d) => d.slice(0, 7))])]
      .sort((a, b) => b.localeCompare(a));
  }, [allDates, today, selectedMonth]);

  const yearOptions = useMemo(() => {
    return [...new Set([today.slice(0, 4), selectedYear, ...allDates.map((d) => d.slice(0, 4))])]
      .sort((a, b) => b.localeCompare(a));
  }, [allDates, today, selectedYear]);

  const monthStart = `${selectedMonth}-01`;
  const [monthYear, monthNumber] = selectedMonth.split('-').map(Number);
  const monthEnd = localDate(new Date(monthYear, monthNumber, 0));
  const weekEnd = shiftDate(selectedWeek, 6);
  const yearStart = `${selectedYear}-01-01`;
  const yearEnd = `${selectedYear}-12-31`;

  const dailyChart = useMemo(() => {
    const start = shiftDate(today, -6);
    return periodData(records, products, 'daily', start, today);
  }, [records, products, today]);

  const weeklyChart = useMemo(() => {
    const start = shiftDate(mondayOf(today), -7 * 7);
    return periodData(records, products, 'weekly', start, mondayOf(today));
  }, [records, products, today]);

  const monthlyChart = useMemo(() => {
    const date = parseDate(`${today.slice(0, 7)}-01`);
    date.setMonth(date.getMonth() - 11);
    const start = localDate(date);
    return periodData(records, products, 'monthly', start, today);
  }, [records, products, today]);

  const yearlyChart = useMemo(() => {
    const currentYear = Number(today.slice(0, 4));
    return periodData(
      records,
      products,
      'yearly',
      `${currentYear - 4}-01-01`,
      `${currentYear}-12-31`
    );
  }, [records, products, today]);

  const overall = useMemo(() => {
    if (!allDates.length) {
      return { invest: 0, income: 0, profit: 0, productCount: 0 };
    }
    return summarize(
      records,
      products,
      [...allDates].sort()[0],
      [...allDates].sort().at(-1)
    );
  }, [records, products, allDates]);

  const weekly = useMemo(() => {
    const summary = summarize(records, products, selectedWeek, weekEnd);

    const weeklyPermanentStockExpense = stockProducts
      .filter(
        (item) =>
          item.category === 'Permanent Stock' &&
          item.date >= selectedWeek &&
          item.date <= weekEnd
      )
      .reduce(
        (total, item) => total + Number(item.price || 0),
        0
      );

    return {
      ...summary,
      invest: summary.invest + weeklyPermanentStockExpense,
      profit: summary.profit - weeklyPermanentStockExpense,
    };
  }, [records, products, stockProducts, selectedWeek, weekEnd]);


  const monthly = useMemo(() => {
    const summary = summarize(records, products, monthStart, monthEnd);

    const monthlyPermanentStockExpense = stockProducts
      .filter(
        (item) =>
          item.category === 'Permanent Stock' &&
          item.date &&
          item.date >= monthStart &&
          item.date <= monthEnd
      )
      .reduce(
        (total, item) => total + Number(item.price || 0),
        0
      );

    return {
      ...summary,
      invest: summary.invest + monthlyPermanentStockExpense,
      profit: summary.profit - monthlyPermanentStockExpense,
    };
  }, [records, products, stockProducts, monthStart, monthEnd]);


  const yearly = useMemo(() => {
    const summary = summarize(records, products, yearStart, yearEnd);

    const yearlyPermanentStockExpense = stockProducts
      .filter(
        (item) =>
          item.category === 'Permanent Stock' &&
          item.date &&
          item.date >= yearStart &&
          item.date <= yearEnd
      )
      .reduce(
        (total, item) => total + Number(item.price || 0),
        0
      );

    return {
      ...summary,
      invest: summary.invest + yearlyPermanentStockExpense,
      profit: summary.profit - yearlyPermanentStockExpense,
    };
  }, [records, products, stockProducts, yearStart, yearEnd]);

  const totalDays = new Set(records.map((r) => r.date)).size;
  const totalMonths = new Set(records.map((r) => r.date.slice(0, 7))).size;
  const totalYears = new Set(records.map((r) => r.date.slice(0, 4))).size;

  const status = overall.profit > 0
    ? { label: 'You are in Profit', description: 'Recorded earnings exceed recorded investment, cash and product expenses.', color: 'border-green-300 bg-green-50 text-green-800', dot: 'bg-green-500' }
    : overall.profit < 0
      ? { label: 'You are in Loss', description: 'Recorded expenses exceed recorded earnings for the available records.', color: 'border-red-300 bg-red-50 text-red-800', dot: 'bg-red-500' }
      : { label: 'Break-even', description: 'Recorded net result is zero for the available records.', color: 'border-amber-300 bg-amber-50 text-amber-800', dot: 'bg-amber-500' };

  const cards = [
    { label: 'Total Days', value: totalDays },
    { label: 'Total Months', value: totalMonths },
    { label: 'Total Years', value: totalYears },
    { label: 'Total Invest', value: money(overall.invest + permanentStockTotal) },
    { label: 'Total Earning', value: money(overall.income) },
    { label: 'Net Profit / Loss', value: money(overall.profit - permanentStockTotal) },
    { label: 'Permanent Stock', value: permanentStockCount },
    { label: 'Stock products', value: overall.productCount },
  ];

  useEffect(() => {
    let cancelled = false;

    async function loadPermanentStock() {
      try {
        const response = await axiosFetch(`${apiUrl}/api/stock-products`, {
          credentials: 'include',
          cache: 'no-store',
        });
        if (!response.ok) return;

        const result = await response.json();

        if (!cancelled && result.success) {
          setStockProducts(result.products || []);
        }

        if (!cancelled && result.success) {
          const permanentStockProducts = (result.products || []).filter(
            (product) => product.category === 'Permanent Stock'
          );

          const total = permanentStockProducts.reduce(
            (sum, product) => sum + Number(product.price || 0),
            0
          );

          setPermanentStockTotal(total);
          setPermanentStockCount(permanentStockProducts.length);
        }
      } catch (error) {
        console.error('Could not load permanent stock total:', error);
      }
    }

    loadPermanentStock();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <DashboardLayout>
      <main className="mx-auto w-full max-w-[1600px] space-y-6 p-4 sm:p-6">
        <header>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#52715D]">Reports</p>
          <h1 className="mt-1 text-2xl font-bold text-[#174D35] sm:text-3xl">Reports &amp; Analytics</h1>
          <p className="mt-2 text-sm text-[#52715D]">
            Financial performance based on your saved daily records and product purchases.
          </p>
        </header>

        <section className={`rounded-2xl border p-5 shadow-sm ${status.color}`}>
          <div className="flex items-start gap-3">
            <span className={`mt-1 h-3 w-3 shrink-0 rounded-full ${status.dot}`} />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider">Financial Status</p>
              <h2 className="mt-1 text-xl font-bold">
                {loading ? 'Analyzing your records…' : status.label}
              </h2>
              <p className="mt-1 text-sm">{status.description}</p>
              <p className="mt-2 text-sm font-semibold">
                Recorded net result: {money(overall.profit - permanentStockTotal)}
              </p>
            </div>
          </div>
        </section>

        {error && (
          <section role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
            <button type="button" onClick={loadData} className="ml-3 font-semibold underline">
              Retry
            </button>
          </section>
        )}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <article key={card.label} className="rounded-2xl border border-[#D8E5D8] bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-[#52715D]">{card.label}</p>
              <p
                className={`mt-3 wrap-break-word text-2xl font-bold ${card.label === 'Total Invest'
                  ? 'text-red-600'
                  : 'text-[#176B45]'
                  }`}
              >
                {loading ? '…' : card.value}
              </p>
            </article>
          ))}
        </section>

        <section className="rounded-2xl border border-[#D8E5D8] bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="font-semibold text-[#174D35]">Daily Analytics</h2>
            <p className="mt-1 text-sm text-[#52715D]">Last 7 calendar days, including days with no saved entries.</p>
          </div>
          <LineChart title="Daily Financial Trend" subtitle="Investment, earning and net profit/loss" data={dailyChart} mode="daily" />
        </section>

        <section className="space-y-4 rounded-2xl border border-[#D8E5D8] bg-white p-5 shadow-sm">
          <div>
            <h2 className="font-semibold text-[#174D35]">Weekly Analytics</h2>
            <p className="mt-1 text-sm text-[#52715D]">Compare the last 8 Monday–Sunday weeks.</p>
          </div>
          <label className="block max-w-xl text-sm font-medium text-[#52715D]">
            Select week
            <select
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(e.target.value)}
              className="mt-2 w-full rounded-xl border border-[#D8E5D8] bg-white px-4 py-3 text-[#174D35]"
            >
              {weekOptions.map((start) => (
                <option key={start} value={start}>
                  Mon {shortDate(start)} {start.slice(0, 4)} – Sun {shortDate(shiftDate(start, 6))} {shiftDate(start, 6).slice(0, 4)}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              ['Total Invest', weekly.invest],
              ['Total Earning', weekly.income],
              ['Profit / Loss', weekly.profit],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-[#F1F7F0] p-4">
                <p className="text-sm text-[#52715D]">{label}</p>
                <p className={`mt-2 text-xl font-bold ${label === 'Total Invest' ? 'text-red-600' : label === 'Total Earning' ? 'text-[#176B45]' : value < 0 ? 'text-red-600' : 'text-[#176B45]'}`}>{label === 'Profit / Loss' && value > 0 ? '+' : label === 'Profit / Loss' && value < 0 ? '-' : ''}{money(Math.abs(value))}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-[#52715D]">
            Selected range: Monday {selectedWeek} to Sunday {weekEnd}.
          </p>
          <LineChart title="Weekly Financial Trend" subtitle="Each point represents one Monday–Sunday week" data={weeklyChart} mode="weekly" />
        </section>

        <section className="space-y-4 rounded-2xl border border-[#D8E5D8] bg-white p-5 shadow-sm">
          <div>
            <h2 className="font-semibold text-[#174D35]">Monthly Analytics</h2>
            <label className="mt-3 block max-w-sm text-sm font-medium text-[#52715D]">
              Select month
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="mt-2 w-full rounded-xl border border-[#D8E5D8] bg-white px-4 py-3 text-[#174D35]"
              >
                {monthOptions.map((month) => (
                  <option key={month} value={month}>{monthLabel(month)}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              ['Total Invest', monthly.invest],
              ['Total Earning', monthly.income],
              ['Profit / Loss', monthly.profit],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-[#F1F7F0] p-4">
                <p className="text-sm text-[#52715D]">{label}</p>
                <p className={`mt-2 text-xl font-bold ${label === 'Total Invest' ? 'text-red-600' : label === 'Total Earning' ? 'text-[#176B45]' : value < 0 ? 'text-red-600' : 'text-[#176B45]'}`}>{label === 'Profit / Loss' && value > 0 ? '+' : label === 'Profit / Loss' && value < 0 ? '-' : ''}{money(Math.abs(value))}</p>
              </div>
            ))}
          </div>
          <LineChart title="Monthly Financial Trend" subtitle="Last 12 months of recorded financial activity" data={monthlyChart} mode="monthly" />
        </section>

        <section className="space-y-4 rounded-2xl border border-[#D8E5D8] bg-white p-5 shadow-sm">
          <div>
            <h2 className="font-semibold text-[#174D35]">Yearly Analytics</h2>
            <label className="mt-3 block max-w-sm text-sm font-medium text-[#52715D]">
              Select year
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="mt-2 w-full rounded-xl border border-[#D8E5D8] bg-white px-4 py-3 text-[#174D35]"
              >
                {yearOptions.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              ['Total Invest', yearly.invest],
              ['Total Earning', yearly.income],
              ['Profit / Loss', yearly.profit],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-[#F1F7F0] p-4">
                <p className="text-sm text-[#52715D]">{label}</p>
                <p className={`mt-2 text-xl font-bold ${label === 'Total Invest' ? 'text-red-600' : label === 'Total Earning' ? 'text-[#176B45]' : value < 0 ? 'text-red-600' : 'text-[#176B45]'}`}>{label === 'Profit / Loss' && value > 0 ? '+' : label === 'Profit / Loss' && value < 0 ? '-' : ''}{money(Math.abs(value))}</p>
              </div>
            ))}
          </div>
          <LineChart title="Yearly Financial Trend" subtitle="Annual investment, earnings and net profit/loss" data={yearlyChart} mode="yearly" />
        </section>

        <p className="text-xs leading-5 text-[#52715D]">
          Calculation basis: Total Invest includes Daily Invest &amp; Income investment plus saved product purchase prices. Net Profit/Loss = Income − Daily Invest − Cash − Product Purchases. Product count is the number of saved product entries. Days, months and years count distinct dates in Daily Invest &amp; Income records.
        </p>
      </main>
    </DashboardLayout>
  );
}