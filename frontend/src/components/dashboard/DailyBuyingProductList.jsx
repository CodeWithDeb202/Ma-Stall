'use client';

import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';

import Form from '../reusable/Form';
import Table from '../reusable/Table';
import Warning from '../reusable/Warning';
import DashboardLayout from '../layout/DashboardLayout';

import apiUrl from '@/services/api';
import { showSuccess, showError, showWarning, getErrorMessage } from '@/lib/toast';

const formatMoney = (amount) =>
  `₹${Number(amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDate = (date) => {
  if (!date) return '';
  const [year, month, day] = date.split('-');
  return `${day}-${month}-${year}`;
};

const formatMonth = (month) => {
  if (!month) return '';
  return new Date(`${month}-01T00:00:00`).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });
};

export default function DailyBuyingProductList() {
  const [products, setProducts] = useState([]);
  const [stockProducts, setStockProducts] = useState([]);
  const [dailyRecords, setDailyRecords] = useState([]);
  const [entryDate, setEntryDate] = useState('');
  const [productName, setProductName] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info');
  const [editingProduct, setEditingProduct] = useState(null);
  const [editValues, setEditValues] = useState({
    productName: '',
    price: '',
    quantity: '',
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editMessage, setEditMessage] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [paymentStatuses, setPaymentStatuses] = useState({});
  const [payingPerson, setPayingPerson] = useState('');
  const [paymentError, setPaymentError] = useState('');



  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setIsLoading(true);

      try {
        const [productResponse, recordResponse, stockResponse] =
          await Promise.all([
            axios.get(`${apiUrl}/api/daily-buying-products`, {
              withCredentials: true,
              timeout: 15000,
            }),
            axios.get(`${apiUrl}/api/records`, {
              withCredentials: true,
              timeout: 15000,
            }),
            axios.get(`${apiUrl}/api/stock-products`, {
              withCredentials: true,
              timeout: 15000,
            }),
          ]);

        const productResult = productResponse.data;
        const recordResult = recordResponse.data;
        const stockResult = stockResponse.data;

        if (productResponse.status === 401 || recordResponse.status === 401) {
          window.location.replace('/');
          return;
        }

        if (!productResult.success) {
          throw new Error(
            productResult.message || 'Products load heiparila nahi.'
          );
        }

        if (!recordResult.success) {
          throw new Error(
            recordResult.message || 'Daily profit records load heiparila nahi.'
          );
        }

        if (!stockResult.success) {
          throw new Error(
            stockResult.message || 'Stock products load heiparila nahi.'
          );
        }

        if (cancelled) return;

        const loadedProducts = productResult.products || [];
        const loadedRecords = recordResult.records || [];
        const loadedStockProducts = stockResult.products || [];

        setProducts(loadedProducts);
        setDailyRecords(loadedRecords);
        setStockProducts(loadedStockProducts);

        if (loadedProducts.length > 0) {
          const latestDate = loadedProducts
            .map((item) => item.date)
            .sort((a, b) => b.localeCompare(a))[0];

          setSelectedMonth(latestDate.slice(0, 7));
          setSelectedDate(latestDate);
          setEntryDate(latestDate);
        } else {
          const today = new Date();
          const todayString = [
            today.getFullYear(),
            String(today.getMonth() + 1).padStart(2, '0'),
            String(today.getDate()).padStart(2, '0'),
          ].join('-');

          setEntryDate(todayString);
        }
      } catch (error) {
        if (!cancelled) {
          setMessage(error.message || 'Backend connection check kara.');
          setMessageType('error');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, []);


  useEffect(() => {
    let cancelled = false;

    async function loadPaymentStatuses() {
      setPaymentError('');
      if (!selectedDate) {
        setPaymentStatuses({});
        return;
      }

      try {
        const response = await axios.get(
          `${apiUrl}/api/daily-buying-payments?date=${encodeURIComponent(selectedDate)}`,
          {
            withCredentials: true,
            timeout: 15000,
          }
        );

        const result = response.data;

        if (!result.success) {
          throw new Error(result.message || 'Payment status load heiparila nahi.');
        }
        if (response.status === 401) {
          window.location.replace('/');
          return;
        }

        if (!result.success) {
          throw new Error(result.message || 'Payment status load heiparila nahi.');
        }

        if (!cancelled) {
          const statuses = {};
          (result.payments || []).forEach((payment) => {
            statuses[payment.person] = Boolean(payment.paid);
          });
          setPaymentStatuses(statuses);
        }
      } catch (error) {
        if (!cancelled) {
          setPaymentError(error.message || 'Payment status load heiparila nahi.');
        }
      }
    }

    loadPaymentStatuses();
    return () => {
      cancelled = true;
    };
  }, [selectedDate]);

  async function markPersonPaid(person) {
    if (!selectedDate || paymentStatuses[person] || payingPerson) return;

    setPayingPerson(person);
    setPaymentError('');

    try {
      const response = await axios.put(
        `${apiUrl}/api/daily-buying-payments/${encodeURIComponent(selectedDate)}/${encodeURIComponent(person)}`,
        {},
        {
          withCredentials: true,
          timeout: 15000,
        }
      );

      const result = response.data;

      if (!result.success) {
        throw new Error(result.message || 'Payment save heiparila nahi.');
      }

      if (response.status === 401) {
        window.location.replace('/');
        return;
      }

      if (!result.success) {
        throw new Error(result.message || 'Payment save heiparila nahi.');
      }

      setPaymentStatuses((previous) => ({ ...previous, [person]: true }));
    } catch (error) {
      setPaymentError(error.message || 'Payment save heiparila nahi.');
    } finally {
      setPayingPerson('');
    }
  }

  const availableMonths = useMemo(
    () =>
      [...new Set(products.map((item) => item.date.slice(0, 7)))].sort(
        (a, b) => b.localeCompare(a)
      ),
    [products]
  );

  const availableDates = useMemo(
    () =>
      [...new Set(
        products
          .filter((item) => item.date.startsWith(selectedMonth))
          .map((item) => item.date)
      )].sort((a, b) => b.localeCompare(a)),
    [products, selectedMonth]
  );

  const selectedProducts = useMemo(
    () =>
      products
        .filter((item) => item.date === selectedDate)
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)),
    [products, selectedDate]
  );

  const totalExpense = selectedProducts.reduce(
    (total, item) => total + Number(item.price || 0),
    0
  );

  const selectedDailyRecord = dailyRecords.find(
    (record) => record.date === selectedDate
  );
  const totalProfit = selectedDailyRecord ? Number(selectedDailyRecord.income || 0) - Number(selectedDailyRecord.invest || 0) - Number(selectedDailyRecord.cash || 0) : 0;

  const permanentStockExpense = stockProducts
    .filter(
      item =>
        item.category === 'Permanent Stock' &&
        item.date === selectedDate
    )
    .reduce(
      (total, item) => total + (Number(item.price) || 0),
      0
    );

  const profitAfterExpenses = totalProfit - totalExpense - permanentStockExpense;

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage('');

    if (!entryDate || !productName.trim() || price === '') {
      showWarning('Date, product name, price au quantity fill kara.');
      return;
    }

    const normalizedName = productName.trim().toLowerCase();

    const isDuplicate = products.some(
      (item) =>
        String(item.productName || '').trim().toLowerCase() === normalizedName
    );

    if (isDuplicate) {
      showWarning(`"${productName.trim()}" product already exists. Duplicate product add karipariba nahi.`);
      return;
    }

    const numericPrice = Number(price);
    const quantityText = String(quantity ?? '').trim() || '1';

    if (
      quantityText &&
      (
        !/^\d+(?:\.\d+)?\s*(?:kg|kgs|g|gm|gms|gram|grams|mg|l|ml|pcs|pc|packet|packets|piece|pieces)?$/i.test(quantityText) ||
        Number(quantityText.match(/^\d+(?:\.\d+)?/)[0]) <= 0
      )
    ) {
      showWarning('Quantity re 250g, 2kg, 1 packet ba 5 pcs emiti lekha.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await axios.post(
        `${apiUrl}/api/daily-buying-products`,
        {
          date: entryDate,
          productName: productName.trim(),
          price: numericPrice,
          quantity: quantityText,
        },
        {
          withCredentials: true,
          timeout: 15000,
        }
      );

      const result = response.data;

      if (!result.success) {
        throw new Error(result.message || 'Product save heiparila nahi.');
      }

      if (response.status === 401) {
        window.location.replace('/');
        return;
      }

      if (!result.success) {
        throw new Error(result.message || 'Product save heiparila nahi.');
      }

      const savedProduct = result.product;

      setProducts((previous) => [...previous, savedProduct]);
      setSelectedMonth(savedProduct.date.slice(0, 7));
      setSelectedDate(savedProduct.date);
      setProductName('');
      setPrice('');
      setQuantity('1');
      showSuccess('Product successfully saved.');
    } catch (error) {
      showError(getErrorMessage(error, 'Product save heiparila nahi.'));
    } finally {
      setIsSubmitting(false);
    }
  }


  function openEditModal(product) {
    setEditingProduct(product);
    setEditValues({
      productName: product.productName ?? '',
      price: product.price ?? '',
      quantity: product.quantity ?? '',
    });
    setEditMessage('');
  }

  async function handleUpdateProduct(event) {
    event.preventDefault();
    if (!editingProduct) return;

    const normalizedName = String(editValues.productName || '')
      .trim()
      .toLowerCase();

    if (!normalizedName) {
      setEditMessage('Product name khali rakhipariba nahi.');
      return;
    }

    const isDuplicate = products.some(
      (item) =>
        item._id !== editingProduct._id &&
        String(item.productName || '').trim().toLowerCase() === normalizedName
    );

    if (isDuplicate) {
      setEditMessage(
        `"${String(editValues.productName).trim()}" product already exists. Duplicate name use karipariba nahi.`
      );
      return;
    }

    setIsEditing(true);
    setEditMessage('');

    try {
      const response = await axios.put(
        `${apiUrl}/api/daily-buying-products/${editingProduct._id}`,
        {
          productName: editValues.productName,
          price: editValues.price === '' ? null : Number(editValues.price),
          quantity: editValues.quantity,
        },
        {
          withCredentials: true,
          timeout: 15000,
        }
      );

      const result = response.data;

      if (!result.success) {
        throw new Error(result.message || 'Product update heiparila nahi.');
      }

      if (response.status === 401) {
        window.location.replace('/');
        return;
      }

      if (!result.success) {
        throw new Error(result.message || 'Product update heiparila nahi.');
      }

      setProducts((previous) =>
        previous.map((item) =>
          item._id === result.product._id ? result.product : item
        )
      );
      setEditingProduct(null);
      showSuccess('Product successfully updated.');
    } catch (error) {
      setEditMessage(error.message || 'Product update heiparila nahi.');
    } finally {
      setIsEditing(false);
    }
  }

  async function handleDeleteProduct() {
    if (!deleteTarget) return;

    setIsDeleting(true);

    try {
      const response = await axios.delete(
        `${apiUrl}/api/daily-buying-products/${deleteTarget._id}`,
        {
          withCredentials: true,
          timeout: 15000,
        }
      );

      const result = response.data;

      if (!result.success) {
        throw new Error(result.message || 'Product delete heiparila nahi.');
      }

      if (response.status === 401) {
        window.location.replace('/');
        return;
      }

      if (!result.success) {
        throw new Error(result.message || 'Product delete heiparila nahi.');
      }

      setProducts((previous) =>
        previous.filter((item) => item._id !== deleteTarget._id)
      );
      showSuccess('Product successfully deleted.');
      setDeleteTarget(null);
    } catch (error) {
      showError(getErrorMessage(error, 'Product delete heiparila nahi.'));
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  }

  function handleMonthChange(month) {
    setSelectedMonth(month);

    const datesInMonth = products
      .filter((item) => item.date.startsWith(month))
      .map((item) => item.date)
      .sort((a, b) => b.localeCompare(a));

    setSelectedDate(datesInMonth[0] || '');
  }

  return (
    <DashboardLayout>
      <div className="mx-auto w-full max-w-[1600px] space-y-6 p-4 sm:p-6">
        <Form
          title="Daily Buying Product List"
          fields={[
            {
              name: 'date',
              label: 'Date',
              type: 'date',
              required: true,
            },
            {
              name: 'productName',
              label: 'Product Name',
              type: 'text',
              required: true,
              placeholder: 'Enter product name',
            },
            {
              name: 'price',
              label: 'Price (₹)',
              type: 'number',
              required: true,
              min: 0,
              step: 'any',
              placeholder: 'Enter price',
            },
            {
              name: 'quantity',
              label: 'Quantity',
              type: 'text',
              required: false,
              min: 1,
              step: 1,
              placeholder: 'Enter quantity',
            },
          ]}
          values={{ date: entryDate, productName, price, quantity }}
          onChange={(name, value) => {
            if (name === 'date') setEntryDate(value);
            if (name === 'productName') setProductName(value);
            if (name === 'price') setPrice(value);
            if (name === 'quantity') setQuantity(value);
          }}
          onSubmit={handleSubmit}
          submitText="Save Product"
          isSubmitting={isSubmitting}
          message={message}
          messageType={messageType}
        />

        <section className="rounded-2xl border border-[#D8E5D8] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#174D35]">
            Select Month & Date
          </h2>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-[#174D35]">
              Month
              <select
                value={selectedMonth}
                onChange={(event) => handleMonthChange(event.target.value)}
                className="mt-2 w-full rounded-lg border border-[#D8E5D8] bg-white p-3 outline-none focus:ring-2 focus:ring-[#176B45]"
              >
                <option value="">Select month</option>
                {availableMonths.map((month) => (
                  <option key={month} value={month}>
                    {formatMonth(month)}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-medium text-[#174D35]">
              Date
              <select
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                disabled={!availableDates.length}
                className="mt-2 w-full rounded-lg border border-[#D8E5D8] bg-white p-3 outline-none focus:ring-2 focus:ring-[#176B45] disabled:bg-gray-100"
              >
                <option value="">Select date</option>
                {availableDates.map((date) => (
                  <option key={date} value={date}>
                    {formatDate(date)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-[#D8E5D8] bg-white shadow-sm">
          <div className="border-b border-[#D8E5D8] px-5 py-4">
            <h2 className="font-semibold text-[#174D35]">Saved Products</h2>
            <p className="mt-1 text-sm text-[#52715D]">
              {selectedDate
                ? `Products saved on ${formatDate(selectedDate)}`
                : 'Select a date to view saved products.'}
            </p>
          </div>

          {isLoading ? (
            <p className="p-6 text-sm text-[#52715D]">Loading products...</p>
          ) : (
            <Table
              columns={[
                {
                  key: 'serial',
                  label: 'Sl. No.',
                  render: (row) => selectedProducts.findIndex((item) => item._id === row._id) + 1,
                },

                {
                  key: 'productName',
                  label: 'Product Name',
                  render: (row) => {
                    const name = String(row.productName || '').trim();

                    return name
                      ? name.charAt(0).toUpperCase() + name.slice(1)
                      : '';
                  },
                },

                {
                  key: 'price',
                  label: 'Price',
                  render: (row) => (
                    <span className="font-semibold text-red-600">
                      {formatMoney(row.price)}
                    </span>
                  ),
                },
                {
                  key: 'quantity',
                  label: 'Quantity',
                },
              ]}
              data={selectedProducts}
              getRowKey={(row) => row._id}
              emptyMessage="No products saved for this date."
              renderActions={(row) => (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openEditModal(row)}
                    className="rounded-lg border border-[#176B45] px-3 py-2 text-sm font-medium text-[#176B45] hover:bg-[#F1F7F0]"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(row)}
                    className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              )}
            />
          )}
        </section>

        <section className="overflow-hidden rounded-2xl border border-[#D8E5D8] bg-white shadow-sm">
          <div className="border-b border-[#D8E5D8] px-5 py-4">
            <h2 className="font-semibold text-[#174D35]">Daily Summary</h2>
            <p className="text-sm text-[#52715D]">
              Profit After Expenses = Total Profit − Daily Buying Expenses −
              Same-Date Permanent Stock Purchases.
            </p>
            <p className="mt-1 text-sm text-[#52715D]">
              {selectedDate
                ? `Summary for ${formatDate(selectedDate)}`
                : 'Select a date to view its summary.'}
            </p>
          </div>

          <Table
            columns={[
              {
                key: 'totalExpense',
                label: 'Total Expense',
                render: () => (
                  <span className="font-semibold text-red-600">
                    {formatMoney(totalExpense)}
                  </span>
                ),
              },
              {
                key: 'totalProfit',
                label: 'Total Profit',
                render: () => (
                  <span
                    className={`font-semibold ${totalProfit < 0 ? 'text-red-600' : 'text-[#176B45]'
                      }`}
                  >
                    {totalProfit < 0 ? '-' : totalProfit > 0 ? '+' : ''}
                    {formatMoney(Math.abs(totalProfit))}
                  </span>
                ),
              },
              {
                key: 'profitAfterExpenses',
                label: 'Profit After Expenses',
                render: () => (
                  <span
                    className={`font-bold ${profitAfterExpenses < 0
                      ? 'text-red-600'
                      : 'text-[#176B45]'
                      }`}
                  >
                    {profitAfterExpenses < 0
                      ? '-'
                      : profitAfterExpenses > 0
                        ? '+'
                        : ''}
                    {formatMoney(Math.abs(profitAfterExpenses))}
                  </span>
                ),
              },
            ]}
            data={selectedDate ? [{ id: selectedDate }] : []}
            getRowKey={(row) => row.id}
            emptyMessage="Select a date to view its summary."
          />
        </section>

        <section className="overflow-hidden rounded-2xl border border-[#D8E5D8] bg-white shadow-sm">
          <div className="border-b border-[#D8E5D8] px-5 py-4">
            <h2 className="font-semibold text-[#174D35]">Daily Profit Dividing</h2>
            <p className="mt-1 text-sm text-[#52715D]">
              {selectedDate
                ? `Profit share for ${formatDate(selectedDate)}`
                : 'Select a date to view profit shares.'}
            </p>
          </div>

          {paymentError && (
            <p role="alert" className="px-5 pt-4 text-sm text-red-600">
              {paymentError}
            </p>
          )}

          <Table
            columns={[
              {
                key: 'profitAfterExpenses',
                label: 'Profit After Expenses',
                render: () => (
                  <span className={`font-bold ${profitAfterExpenses < 0 ? 'text-red-600' : 'text-[#176B45]'
                    }`}>
                    {formatMoney(profitAfterExpenses)}
                  </span>
                ),
              },
              ...[
                { key: 'deb', label: 'Deb' },
                { key: 'puja', label: 'Puja' },
                { key: 'lija', label: 'Lija' },
              ].map((person) => ({
                key: person.key,
                label: person.label,
                render: () => {
                  const totalPaise = Math.round(profitAfterExpenses * 100);
                  const baseShare = Math.trunc(totalPaise / 3);
                  const remainder = totalPaise - baseShare * 3;
                  const order = ['deb', 'puja', 'lija'];
                  const position = order.indexOf(person.key);
                  const sharePaise =
                    baseShare +
                    (remainder > 0 && position < remainder ? 1 : 0) -
                    (remainder < 0 && position < Math.abs(remainder) ? 1 : 0);
                  const share = sharePaise / 100;
                  const isPaid = Boolean(paymentStatuses[person.key]);

                  return (
                    <div className="flex min-w-24 flex-col items-start gap-2">
                      <span
                        className={`rounded-md px-2 py-1 font-semibold ${share < 0
                          ? 'bg-red-50 text-red-600'
                          : 'bg-green-50 text-[#176B45]'
                          }`}
                      >
                        {share > 0 ? '+' : share < 0 ? '−' : ''}
                        {formatMoney(Math.abs(share))}
                      </span>
                      <button
                        type="button"
                        disabled={!selectedDate || isPaid || Boolean(payingPerson)}
                        onClick={() => markPersonPaid(person.key)}
                        className={`rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-70 ${isPaid
                          ? 'bg-green-600 text-white'
                          : 'bg-[#176B45] text-white hover:bg-[#145638]'
                          }`}
                      >
                        {isPaid
                          ? 'Paid'
                          : payingPerson === person.key
                            ? 'Saving...'
                            : 'Pay'}
                      </button>
                    </div>
                  );
                },
              })),
            ]}
            data={selectedDate ? [{ id: selectedDate }] : []}
            getRowKey={(row) => row.id}
            emptyMessage="Select a date to view profit shares."
          />
        </section>
      </div>

      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-[#F8FBF7] p-4 shadow-xl sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-[#174D35]">Edit Product</h2>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="rounded-lg px-3 py-2 text-gray-600 hover:bg-gray-100"
              >
                Close
              </button>
            </div>

            <Form
              title=""
              fields={[
                {
                  name: 'productName',
                  label: 'Product Name',
                  type: 'text',
                  required: false,
                  placeholder: 'Enter product name',
                },
                {
                  name: 'price',
                  label: 'Price (₹)',
                  type: 'number',
                  required: false,
                  min: 0,
                  step: 'any',
                  placeholder: 'Enter price or leave blank',
                },
                {
                  name: 'quantity',
                  label: 'Quantity',
                  type: 'text',
                  required: false,
                  placeholder: 'e.g. 250g, 2kg, 5 pcs',
                },
              ]}
              values={editValues}
              onChange={(name, value) =>
                setEditValues((previous) => ({
                  ...previous,
                  [name]: value,
                }))
              }
              onSubmit={handleUpdateProduct}
              submitText="Save Changes"
              isSubmitting={isEditing}
              message={editMessage}
              messageType="error"
            />
          </div>
        </div>
      )}

      <Warning
        open={Boolean(deleteTarget)}
        title="Delete Product"
        message={
          deleteTarget
            ? `Are you sure you want to delete "${deleteTarget.productName || 'this product'}"? Only this product will be deleted.`
            : ''
        }
        confirmText="Confirm Delete"
        cancelText="Cancel"
        loading={isDeleting}
        onCancel={() => {
          if (!isDeleting) setDeleteTarget(null);
        }}
        onConfirm={handleDeleteProduct}
      />

    </DashboardLayout>
  );
}