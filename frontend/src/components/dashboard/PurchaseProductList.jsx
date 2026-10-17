'use client';

import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../layout/DashboardLayout';
import Table from '../reusable/Table';
import Warning from '../reusable/Warning';

const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const categories = ['Daily Usage', 'Stock Product'];

const todayString = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const money = (value) => value == null || value === ''
  ? '—'
  : `₹${Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const displayDate = (date) => {
  if (!date) return '';
  const [y, m, d] = date.split('-');
  return `${d}-${m}-${y}`;
};

export default function PurchaseProductList() {
  const [products, setProducts] = useState([]);
  const [entryDate, setEntryDate] = useState(todayString());
  const [selectedDate, setSelectedDate] = useState('');
  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState('Daily Usage');
  const [dateLocked, setDateLocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [modalProduct, setModalProduct] = useState(null);
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [modalSaving, setModalSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  async function loadProducts() {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${apiUrl}/api/purchase-products`, {
        credentials: 'include',
        cache: 'no-store',
      });
      if (response.status === 401) {
        window.location.replace('/');
        return;
      }
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Products load heiparila nahi.');

      const rows = result.products || [];
      setProducts(rows);

      const dates = [...new Set(rows.map((item) => item.date))].sort((a, b) => b.localeCompare(a));
      if (dates.length) {
        setSelectedDate((previous) => previous && dates.includes(previous) ? previous : dates[0]);
        setEntryDate((previous) => previous || dates[0]);
      }
    } catch (err) {
      setError(err.message || 'Backend connection check kara.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Load initial product data from the API.
    loadProducts();
  }, []);

  const availableDates = useMemo(
    () => [...new Set(products.map((item) => item.date))].sort((a, b) => b.localeCompare(a)),
    [products]
  );

  const selectedProducts = useMemo(
    () => products.filter((item) => item.date === selectedDate),
    [products, selectedDate]
  );

  const totals = useMemo(() => {
    const result = { 'Daily Usage': 0, 'Stock Product': 0 };
    selectedProducts.forEach((item) => {
      if (item.checked && item.price != null) {
        result[item.category] += Number(item.price) || 0;
      }
    });
    return result;
  }, [selectedProducts]);

  async function addProduct(event) {
    event.preventDefault();
    setMessage('');
    setError('');

    if (!entryDate || !productName.trim()) {
      setError('Date au product name enter kara.');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`${apiUrl}/api/purchase-products`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: entryDate, productName: productName.trim(), category }),
      });

      if (response.status === 401) {
        window.location.replace('/');
        return;
      }
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Product save heiparila nahi.');

      setProducts((previous) => [...previous, result.product]);
      setSelectedDate(entryDate);
      setDateLocked(true);
      setProductName('');
      setMessage('Product successfully saved.');
    } catch (err) {
      setError(err.message || 'Product save heiparila nahi.');
    } finally {
      setSaving(false);
    }
  }

  function resetEntry() {
    setEntryDate(todayString());
    setProductName('');
    setCategory('Daily Usage');
    setDateLocked(false);
    setMessage('');
    setError('');
  }

  function openQuantityModal(product) {
    if (product.checked) {
      clearProductDetails(product);
      return;
    }
    setModalProduct(product);
    setQuantity(product.quantity || '');
    setPrice(product.price == null ? '' : String(product.price));
    setError('');
  }

  async function clearProductDetails(product) {
    setError('');
    try {
      const response = await fetch(`${apiUrl}/api/purchase-products/${product._id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checked: false }),
      });
      if (response.status === 401) {
        window.location.replace('/');
        return;
      }
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Checkbox update heiparila nahi.');
      setProducts((previous) => previous.map((item) => item._id === product._id ? result.product : item));
    } catch (err) {
      setError(err.message || 'Checkbox update heiparila nahi.');
    }
  }

  async function saveProductDetails(event) {
    event.preventDefault();
    if (!modalProduct) return;

    setModalSaving(true);
    setError('');
    try {
      const response = await fetch(`${apiUrl}/api/purchase-products/${modalProduct._id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checked: true, quantity, price }),
      });
      if (response.status === 401) {
        window.location.replace('/');
        return;
      }
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Details save heiparila nahi.');
      setProducts((previous) => previous.map((item) => item._id === modalProduct._id ? result.product : item));
      setModalProduct(null);
      setQuantity('');
      setPrice('');
      setMessage('Product details saved.');
    } catch (err) {
      setError(err.message || 'Details save heiparila nahi.');
    } finally {
      setModalSaving(false);
    }
  }

  async function confirmDeleteProduct() {
    if (!deleteTarget || deleteLoading) return;

    setDeleteLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch(
        `${apiUrl}/api/purchase-products/${deleteTarget._id}`,
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
        throw new Error(result.message || 'Product delete heiparila nahi.');
      }

      setProducts((previous) =>
        previous.filter((item) => item._id !== deleteTarget._id)
      );

      if (modalProduct?._id === deleteTarget._id) {
        setModalProduct(null);
      }

      setMessage(`"${deleteTarget.productName}" successfully deleted.`);
      setDeleteTarget(null);
    } catch (err) {
      setError(err.message || 'Product delete heiparila nahi.');
    } finally {
      setDeleteLoading(false);
    }
  }

  const columns = [
    { key: 'serial', label: 'Sl. No.', render: (_, index) => Number(index) + 1 },
    { key: 'productName', label: 'Product Name' },
    { key: 'category', label: 'Category' },
    { key: 'quantity', label: 'Quantity', render: (row) => row.checked && row.quantity ? row.quantity : '—' },
    { key: 'price', label: 'Price', render: (row) => row.checked ? money(row.price) : '—' },
    {
      key: 'checked',
      label: 'Add Details',
      render: (row) => (
        <input
          aria-label={`Add quantity and price for ${row.productName}`}
          type="checkbox"
          checked={Boolean(row.checked)}
          onChange={() => openQuantityModal(row)}
          className="h-5 w-5 accent-[#176B45]"
        />
      ),
    },
  ];

  return (
    <DashboardLayout>
      <div className="mx-auto w-full max-w-7xl space-y-6 p-4 md:p-6">
        <header>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#52715D]">Purchases</p>
          <h1 className="mt-1 text-2xl font-bold text-[#174D35] md:text-3xl">Purchase Product List</h1>
          <p className="mt-2 text-sm text-[#52715D]">Date-wise product records, optional quantity and price details.</p>
        </header>

        <section className="rounded-2xl border border-[#D8E5D8] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Add Product</h2>
          <form onSubmit={addProduct} className="mt-4 grid grid-cols-1 items-end gap-4 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_auto]">
            <label className="text-sm font-medium">
              Date
              <input
                type="date"
                value={entryDate}
                disabled={dateLocked || saving}
                required
                onChange={(event) => setEntryDate(event.target.value)}
                className="mt-2 w-full rounded-lg border border-[#D8E5D8] p-3 outline-none focus:ring-2 focus:ring-[#176B45] disabled:bg-gray-100"
              />
              {dateLocked && <span className="mt-1 block text-xs text-[#52715D]">Date locked. Reset click kari nua date select kara.</span>}
            </label>

            <label className="text-sm font-medium">
              Product Name
              <input
                value={productName}
                onChange={(event) => setProductName(event.target.value)}
                maxLength={150}
                placeholder="Enter product name"
                required
                className="mt-2 w-full rounded-lg border border-[#D8E5D8] p-3 outline-none focus:ring-2 focus:ring-[#176B45]"
              />
            </label>

            <label className="text-sm font-medium">
              Category
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="mt-2 w-full rounded-lg border border-[#D8E5D8] bg-white p-3 outline-none focus:ring-2 focus:ring-[#176B45]"
              >
                {categories.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>

            <div className="flex min-h-12 items-center gap-3">
              <button disabled={saving} className="rounded-xl bg-[#176B45] px-5 py-3 font-semibold text-white hover:bg-[#145638] disabled:opacity-60">
                {saving ? 'Saving...' : 'Add Product'}
              </button>
              <button type="button" onClick={resetEntry} className="rounded-xl border border-[#D8E5D8] px-5 py-3 font-semibold text-[#174D35] hover:bg-[#F1F7F0]">
                Reset
              </button>
            </div>
          </form>
          {message && <p role="status" className="mt-4 rounded-lg bg-[#F1F7F0] p-3 text-sm text-[#176B45]">{message}</p>}
          {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        </section>

        <section className="overflow-hidden rounded-2xl border border-[#D8E5D8] bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-[#D8E5D8] p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Saved Products</h2>
              <p className="mt-1 text-sm text-[#52715D]">{selectedDate ? `Products for ${displayDate(selectedDate)}` : 'Select a date to view products.'}</p>
            </div>
            <label className="text-sm font-medium">
              Select Date
              <select
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                className="mt-2 block min-w-56 rounded-lg border border-[#D8E5D8] bg-white p-3"
              >
                <option value="">Select date</option>
                {availableDates.map((date) => <option key={date} value={date}>{displayDate(date)}</option>)}
              </select>
            </label>
          </div>

          {loading ? (
            <p className="p-8 text-center text-[#52715D]">Loading products...</p>
          ) : (
            <Table
              columns={columns}
              data={selectedProducts}
              getRowKey={(row) => row._id}
              emptyMessage="No products saved for this date."
              renderActions={(row) => (
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setMessage('');
                    setDeleteTarget(row);
                  }}
                  className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                >
                  Delete
                </button>
              )}
            />
          )}
          <p className="border-t border-[#E5EEE4] px-5 py-3 text-xs text-[#52715D]">
            Checkbox tick kale quantity/price optional details save heba. Tick thiba checkbox puni click kale details clear heba.
          </p>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-bold">Category-wise Purchase Summary</h2>
            <p className="mt-1 text-sm text-[#52715D]">Selected date: {selectedDate ? displayDate(selectedDate) : 'No date selected'}</p>
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {categories.map((item) => {
              const rows = selectedProducts.filter((product) => product.category === item);
              const checkedCount = rows.filter((product) => product.checked).length;
              return (
                <section key={item} className="overflow-hidden rounded-2xl border border-[#D8E5D8] bg-white shadow-sm">
                  <div className="border-b border-[#D8E5D8] p-5">
                    <h3 className="text-lg font-semibold">{item}</h3>
                    <p className="mt-1 text-sm text-[#52715D]">{rows.length} products listed</p>
                    <p className="mt-3 text-2xl font-bold text-[#176B45]">{money(totals[item])}</p>
                    <p className="text-xs text-[#52715D]">Total saved price · {checkedCount} product(s) with details</p>
                  </div>
                  <Table
                    columns={[
                      { key: 'productName', label: 'Product Name' },
                      { key: 'quantity', label: 'Quantity', render: (row) => row.checked && row.quantity ? row.quantity : '—' },
                      { key: 'price', label: 'Price', render: (row) => row.checked ? money(row.price) : '—' },
                    ]}
                    data={rows}
                    getRowKey={(row) => row._id}
                    emptyMessage={`No ${item.toLowerCase()} products for this date.`}
                  />
                </section>
              );
            })}
          </div>
        </section>
      </div>

      {modalProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !modalSaving) setModalProduct(null); }}>
          <form onSubmit={saveProductDetails} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-xl font-bold">Product Details</h2>
            <p className="mt-1 text-sm text-[#52715D]">{modalProduct.productName}</p>

            <label className="mt-5 block text-sm font-medium">
              Quantity <span className="font-normal text-[#52715D]">(optional)</span>
              <input
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                maxLength={40}
                placeholder="e.g. 2 kg, 500 g, 5 pcs"
                className="mt-2 w-full rounded-lg border border-[#D8E5D8] p-3 outline-none focus:ring-2 focus:ring-[#176B45]"
              />
            </label>

            <label className="mt-4 block text-sm font-medium">
              Price <span className="font-normal text-[#52715D]">(optional)</span>
              <input
                type="text"
                inputMode="decimal"
                value={price}
                onChange={(event) => {
                  const value = event.target.value;
                  if (/^\d*\.?\d*$/.test(value)) setPrice(value);
                }}
                placeholder="Enter price"
                className="mt-2 w-full rounded-lg border border-[#D8E5D8] p-3 outline-none focus:ring-2 focus:ring-[#176B45]"
              />
            </label>

            {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}

            <div className="mt-6 flex justify-end gap-3">
              <button type="button" disabled={modalSaving} onClick={() => setModalProduct(null)} className="rounded-lg border border-[#D8E5D8] px-4 py-2 font-semibold">
                Cancel
              </button>
              <button disabled={modalSaving} className="rounded-lg bg-[#176B45] px-4 py-2 font-semibold text-white disabled:opacity-60">
                {modalSaving ? 'Saving...' : 'Save Details'}
              </button>
            </div>
          </form>
        </div>
      )}

      <Warning
        open={Boolean(deleteTarget)}
        title="Delete Product?"
        message={
          deleteTarget
            ? `Are you sure you want to delete "${deleteTarget.productName}"? This action cannot be undone.`
            : 'Are you sure you want to delete this product?'
        }
        confirmText="Delete Product"
        cancelText="Cancel"
        onConfirm={confirmDeleteProduct}
        onCancel={() => {
          if (!deleteLoading) setDeleteTarget(null);
        }}
        loading={deleteLoading}
      />
    </DashboardLayout>
  );
}
