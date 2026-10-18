'use client';
import axiosFetch from "@/lib/axios-fetch";

import { useCallback, useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../layout/DashboardLayout';
import Table from '../reusable/Table';
import Warning from '../reusable/Warning';

import apiUrl from '@/services/api';
import { showSuccess, showError, showWarning } from '@/lib/toast';
const modalStorageKey = 'ma-stall-stock-edit-modal';

const money = value =>
  value == null || value === ''
    ? '—'
    : `₹${Number(value).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;

const displayDate = date => {
  if (!date) return 'N/A';
  const [year, month, day] = date.split('-');
  return `${day}-${month}-${year}`;
};

const capitalizeProductName = name =>
  String(name ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, char => char.toUpperCase());

export default function StockProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectionLocked, setSelectionLocked] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editDate, setEditDate] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editQuantity, setEditQuantity] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    date: '',
    productName: '',
    quantity: '',
    price: '',
    category: 'Permanent Stock'
  });

  const request = useCallback(async (url, options = {}) => {
    const response = await axiosFetch(`${apiUrl}${url}`, {
      ...options,
      credentials: 'include',
      cache: 'no-store',
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers || {})
      }
    });

    if (response.status === 401) {
      window.location.replace('/');
      throw new Error('Session expire heichi. Punithare login kara.');
    }

    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Request fail hela.');
    }
    return result;
  }, []);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const result = await request('/api/stock-products');
      setProducts(result.products || []);
    } catch (err) {
      showError(err.message || 'Stock products load heiparila nahi.');
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Load initial stock data from the API.
    loadProducts();
  }, [loadProducts]);

  // Restore an edit modal after refresh once the products have loaded.
  useEffect(() => {
    if (loading || typeof window === 'undefined') return;
    try {
      const savedId = localStorage.getItem(modalStorageKey);
      if (!savedId) return;
      const product = products.find(item => item._id === savedId);
      if (product) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- Restore the saved edit modal after loading.
        setEditing(product);
        setEditDate(product.date || '');
        setEditQuantity(product.quantity || '');
        setEditPrice(
          product.price == null ? '' : String(product.price)
        );
      } else {
        localStorage.removeItem(modalStorageKey);
      }
    } catch { }
  }, [loading, products]);

  function openEdit(product) {
    setError('');
    setMessage('');
    setEditing(product);
    setEditDate(product.date || '');
    setEditQuantity(product.quantity || '');
    setEditPrice(
      product.price == null ? '' : String(product.price)
    );
    try {
      localStorage.setItem(modalStorageKey, product._id);
    } catch { }
  }

  function closeEdit() {
    setEditing(null);
    try {
      localStorage.removeItem(modalStorageKey);
    } catch { }
  }

  async function addProduct(event) {
    event.preventDefault();
    const enteredPrice = form.price.trim();
    if (
      enteredPrice !== '' &&
      (!/^\d+(\.\d{1,2})?$/.test(enteredPrice) ||
        !Number.isFinite(Number(enteredPrice)) ||
        Number(enteredPrice) < 0)
    ) {
      showWarning('Price re valid amount dia (e.g. 100 or 100.50).');
      return;
    }

    const normalizeName = name =>
      String(name ?? '')
        .trim()
        .replace(/\s+/g, ' ')
        .toLowerCase();

    const enteredName = normalizeName(form.productName);

    if (!enteredName) {
      showWarning('Product name dia.');
      return;
    }

    const duplicate = products.some(
      product =>
        normalizeName(product.productName) === enteredName
    );

    if (duplicate) {
      showWarning(
        `"${form.productName.trim()}" product already achhi. Puni add karipariba nahi.`
      );
      return;
    }

    setSaving(true);
    setMessage('');
    setError('');

    try {
      const result = await request('/api/stock-products', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          productName: capitalizeProductName(form.productName),
          price: form.price.trim() === '' ? '' : Number(form.price)
        })
      });
      setProducts(previous => [...previous, result.product]);

      setSelectionLocked(true);
      setForm(previous => ({
        ...previous,
        productName: '',
        quantity: '',
        price: ''
      }));
      showSuccess('Stock product successfully saved.');
    } catch (err) {
      showError(err.message || 'Product save heiparila nahi.');
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit(event) {
    event.preventDefault();
    if (!editing || saving) return;

    setSaving(true);
    setError('');
    setMessage('');

    try {
      const payload = {
        date: editDate,
        quantity: editQuantity
      };

      if (editing.category === 'Permanent Stock') {
        payload.price = editPrice;
      }

      const result = await request(
        `/api/stock-products/${editing._id}`,
        {
          method: 'PUT',
          body: JSON.stringify(payload)
        }
      );

      setProducts(previous =>
        previous.map(item =>
          item._id === editing._id ? result.product : item
        )
      );

      closeEdit();
      showSuccess('Stock product updated successfully.');
    } catch (err) {
      showError(err.message || 'Product update heiparila nahi.');
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    setError('');

    try {
      await request(`/api/stock-products/${deleteTarget._id}`, { method: 'DELETE' });
      setProducts(previous => previous.filter(item => item._id !== deleteTarget._id));
      if (editing?._id === deleteTarget._id) closeEdit();
      showSuccess(`"${deleteTarget.productName}" successfully deleted.`);
      setDeleteTarget(null);
    } catch (err) {
      showError(err.message || 'Product delete heiparila nahi.');
    } finally {
      setDeleting(false);
    }
  }

  const permanentProducts = useMemo(
    () => products.filter(item => item.category === 'Permanent Stock'),
    [products]
  );

  const regularProducts = useMemo(
    () => products.filter(item => item.category === 'Stock Products'),
    [products]
  );

  const totalPermanentPrice = useMemo(
    () => permanentProducts.reduce((total, item) => total + (Number(item.price) || 0), 0),
    [permanentProducts]
  );

  const permanentColumns = [
    { key: 'serial', label: 'Sl. No.', render: (_, index) => index + 1 },
    { key: 'date', label: 'Date', render: row => displayDate(row.date) },
    { key: 'productName', label: 'Product Name', render: row => capitalizeProductName(row.productName) },
    { key: 'quantity', label: 'Quantity', render: row => row.quantity || '—' },
    { key: 'price', label: 'Price', render: row => money(row.price) }
  ];

  const stockColumns = [
    { key: 'serial', label: 'Sl. No.', render: (_, index) => index + 1 },
    { key: 'productName', label: 'Product Name', render: row => capitalizeProductName(row.productName) },
    { key: 'quantity', label: 'Quantity', render: row => row.quantity || '—' },
    { key: 'date', label: 'Date', render: row => displayDate(row.date) }
  ];

  return (
    <DashboardLayout>
      <div className="mx-auto w-full max-w-7xl space-y-6 p-4 md:p-6">
        <header>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#52715D]">Inventory</p>
          <h1 className="mt-1 text-2xl font-bold text-[#174D35] md:text-3xl">Stock Products</h1>
          <p className="mt-2 text-sm text-[#52715D]">
            Manage permanent inventory and products held in stock.
          </p>
        </header>

        <section className="rounded-2xl border border-[#D8E5D8] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Add Stock Product</h2>
          <form onSubmit={addProduct} className="mt-4 grid grid-cols-1 items-end gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <label className="text-sm font-medium">
              Date <span className="font-normal text-[#52715D]">(optional)</span>
              <input
                type="date"
                value={form.date}
                disabled={selectionLocked}
                onChange={e => setForm({ ...form, date: e.target.value })}
                className="mt-2 w-full rounded-lg border border-[#D8E5D8] p-3 outline-none focus:ring-2 focus:ring-[#176B45]"
              />
            </label>

            <label className="text-sm font-medium">
              Product Name
              <input
                required
                maxLength={150}
                value={form.productName}
                onChange={e => setForm({ ...form, productName: e.target.value })}
                placeholder="Enter product name"
                className="mt-2 w-full rounded-lg border border-[#D8E5D8] p-3 outline-none focus:ring-2 focus:ring-[#176B45]"
              />
            </label>

            <label className="text-sm font-medium">
              Quantity <span className="font-normal text-[#52715D]">(optional)</span>
              <input
                maxLength={40}
                value={form.quantity}
                onChange={e => setForm({ ...form, quantity: e.target.value })}
                placeholder="e.g. 2 pcs"
                className="mt-2 w-full rounded-lg border border-[#D8E5D8] p-3 outline-none focus:ring-2 focus:ring-[#176B45]"
              />
            </label>

            <label className="text-sm font-medium">
              Price <span className="font-normal text-[#52715D]">(optional)</span>
              <input
                type="text"
                inputMode="decimal"
                value={form.price}
                onChange={e => setForm({ ...form, price: e.target.value })}
                placeholder="Enter price"
                className="mt-2 w-full rounded-lg border border-[#D8E5D8] p-3 outline-none focus:ring-2 focus:ring-[#176B45]"
              />
            </label>

            <label className="text-sm font-medium">
              Category
              <select
                required
                value={form.category}
                disabled={selectionLocked}
                onChange={e => setForm({ ...form, category: e.target.value })}
                className="mt-2 w-full rounded-lg border border-[#D8E5D8] bg-white p-3 outline-none focus:ring-2 focus:ring-[#176B45]"
              >
                <option value="Permanent Stock">Permanent Stock</option>
                <option value="Stock Products">Stock Products</option>
              </select>
            </label>

            <div className="flex flex-wrap gap-3 sm:col-span-2 xl:col-span-5">
              <button disabled={saving} className="rounded-xl bg-[#176B45] px-6 py-3 font-semibold text-white hover:bg-[#145638] disabled:opacity-60">
                {saving ? 'Saving...' : 'Add Product'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setForm({
                    date: '',
                    productName: '',
                    quantity: '',
                    price: '',
                    category: 'Permanent Stock'
                  });
                  setSelectionLocked(false);
                }}
                className="rounded-xl border border-[#D8E5D8] px-5 py-3 font-semibold hover:bg-[#F1F7F0]"
              >
                Reset
              </button>
            </div>
          </form>

          {message && <p role="status" className="mt-4 rounded-lg bg-[#F1F7F0] p-3 text-sm text-[#176B45]">{message}</p>}
          {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        </section>

        <section className="overflow-hidden rounded-2xl border border-[#D8E5D8] bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-[#D8E5D8] p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Permanent Stock</h2>
              <p className="mt-1 text-sm text-[#52715D]">Durable products intended for long-term use.</p>
            </div>
            <div className="rounded-xl bg-[#F1F7F0] px-4 py-3">
              <p className="text-xs text-[#52715D]">Total Price</p>
              <p className="text-xl font-bold text-[#176B45]">{money(totalPermanentPrice)}</p>
            </div>
          </div>
          {loading ? (
            <p className="p-8 text-center text-[#52715D]">Loading products...</p>
          ) : (
            <Table
              columns={permanentColumns}
              data={permanentProducts}
              getRowKey={row => row._id}
              emptyMessage="No permanent stock products saved."

              renderActions={row => (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(row)}
                    className="rounded-lg border border-[#D8E5D8] px-3 py-2 text-sm font-semibold text-[#176B45] hover:bg-[#F1F7F0]"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(row)}
                    className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              )}

            />
          )}
        </section>

        <section className="overflow-hidden rounded-2xl border border-[#D8E5D8] bg-white shadow-sm">
          <div className="border-b border-[#D8E5D8] p-5">
            <h2 className="text-lg font-semibold">Stock Products</h2>
            <p className="mt-1 text-sm text-[#52715D]">Edit quantity/date or delete an individual product.</p>
          </div>
          {loading ? (
            <p className="p-8 text-center text-[#52715D]">Loading products...</p>
          ) : (
            <Table
              columns={stockColumns}
              data={regularProducts}
              getRowKey={row => row._id}
              emptyMessage="No stock products saved."
              renderActions={row => (
                <div className="flex gap-2">
                  <button type="button" onClick={() => openEdit(row)} className="rounded-lg border border-[#D8E5D8] px-3 py-2 text-sm font-semibold text-[#176B45] hover:bg-[#F1F7F0]">
                    Edit
                  </button>
                  <button type="button" onClick={() => setDeleteTarget(row)} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50">
                    Delete
                  </button>
                </div>
              )}
            />
          )}
        </section>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form onSubmit={saveEdit} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-xl font-bold text-[#174D35]">Edit Stock Product</h2>
            <p className="mt-1 text-sm text-[#52715D]">{editing.productName}</p>

            {editing.category === 'Permanent Stock' && (
              <label className="mt-4 block text-sm font-medium text-[#52715D]">
                Price
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editPrice}
                  onChange={e => setEditPrice(e.target.value)}
                  required
                  className="mt-2 w-full rounded-xl border border-[#D8E5D8] px-4 py-3 text-[#174D35] outline-none focus:border-[#176B45]"
                />
              </label>
            )}

            <label className="mt-5 block text-sm font-medium">
              Quantity
              <input
                value={editQuantity}
                onChange={e => setEditQuantity(e.target.value)}
                maxLength={40}
                placeholder="Enter quantity"
                className="mt-2 w-full rounded-lg border border-[#D8E5D8] p-3 outline-none focus:ring-2 focus:ring-[#176B45]"
              />
            </label>

            <label className="mt-4 block text-sm font-medium">
              Date <span className="font-normal text-[#52715D]">(optional)</span>
              <input
                type="date"
                value={editDate}
                onChange={e => setEditDate(e.target.value)}
                className="mt-2 w-full rounded-lg border border-[#D8E5D8] p-3 outline-none focus:ring-2 focus:ring-[#176B45]"
              />
            </label>

            {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" disabled={saving} onClick={closeEdit} className="rounded-lg border border-[#D8E5D8] px-4 py-2 font-semibold">
                Close
              </button>
              <button disabled={saving} className="rounded-lg bg-[#176B45] px-4 py-2 font-semibold text-white disabled:opacity-60">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      <Warning
        open={Boolean(deleteTarget)}
        title="Delete Stock Product?"
        message={deleteTarget ? `Are you sure you want to delete "${deleteTarget.productName}"? This cannot be undone.` : 'Delete this product?'}
        confirmText="Delete Product"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={() => { if (!deleting) setDeleteTarget(null); }}
        loading={deleting}
      />
    </DashboardLayout>
  );
}
