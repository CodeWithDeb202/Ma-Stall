'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import DashboardLayout from '../layout/DashboardLayout';
import MenuItemCard from '../reusable/MenuItemCard';
import { showSuccess, showError, showWarning } from '@/lib/toast';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
];

const inputClass =
  'w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-green-700 focus:ring-2 focus:ring-green-100';

export default function MenuItems() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const draftKey = 'ma-stall-menu-item-draft';
  const [draftReady, setDraftReady] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [ingredientDraft, setIngredientDraft] = useState('');
  const [ingredients, setIngredients] = useState([]);
  const [price, setPrice] = useState('');
  const [offer, setOffer] = useState('');
  const [files, setFiles] = useState([]);
  const previews = useMemo(() => files.map((file) => URL.createObjectURL(file)), [files]);

  useEffect(() => {
    Promise.resolve().then(() => {
      try {
        const saved = sessionStorage.getItem(draftKey);
        if (saved) {
          const draft = JSON.parse(saved);
          if (typeof draft.name === 'string') setName(draft.name);
          if (typeof draft.description === 'string') setDescription(draft.description);
          if (typeof draft.ingredientDraft === 'string') setIngredientDraft(draft.ingredientDraft);
          if (Array.isArray(draft.ingredients)) setIngredients(draft.ingredients);
          if (typeof draft.price === 'string') setPrice(draft.price);
          if (typeof draft.offer === 'string') setOffer(draft.offer);
        }
      } catch (error) {
        console.error('Could not restore menu draft:', error);
      } finally {
        setDraftReady(true);
      }
    });
  }, []);

  useEffect(() => {
    if (!draftReady) return;
    try {
      const draft = { name, description, ingredientDraft, ingredients, price, offer };
      sessionStorage.setItem(draftKey, JSON.stringify(draft));
    } catch (error) {
      console.error('Could not save menu draft:', error);
    }
  }, [draftReady, name, description, ingredientDraft, ingredients, price, offer]);


  const loadItems = useCallback(async () => {
    setLoading(true);

    try {
      const response = await fetch('/api/menu-items', {
        credentials: 'include',
        cache: 'no-store',
      });

      const result = await response.json();

      if (!response.ok || result.success === false) {
        throw new Error(result.message || 'Unable to load menu items.');
      }

      setItems(Array.isArray(result.items) ? result.items : []);
    } catch (error) {
      showError(error.message || 'Unable to load menu items.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Fetch initial menu items.
    loadItems();
  }, [loadItems]);

  useEffect(() => {
    return () => {
      previews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previews]);

  function addIngredient() {
    const value = ingredientDraft.trim();

    if (!value) {
      showWarning('Enter an ingredient name.');
      return;
    }

    if (ingredients.some((item) => item.trim().normalize('NFC').toLowerCase() === value.normalize('NFC').toLowerCase())) {
      showWarning('This ingredient has already been added.');
      return;
    }

    setIngredients((previous) => [...previous, value]);
    setIngredientDraft('');
  }

  function handleImageChange(event) {
    const selected = Array.from(event.target.files || []);

    if (selected.length < 1 || selected.length > 5) {
      setFiles([]);
      event.target.value = '';
      showWarning('Select between 1 and 5 images.');
      return;
    }

    const invalidFile = selected.find(
      (file) =>
        !ALLOWED_TYPES.includes(file.type) || file.size > MAX_FILE_SIZE,
    );

    if (invalidFile) {
      setFiles([]);
      event.target.value = '';
      showWarning('Upload JPEG, PNG, WEBP, or AVIF images. Each image must be under 5 MB.');
      return;
    }

    setFiles(selected);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!name.trim() || !description.trim()) {
      showWarning('Enter a name and description.');
      return;
    }

    if (ingredients.length === 0) {
      showWarning('Add at least one ingredient.');
      return;
    }

    if (!/^\d+(\.\d{1,2})?$/.test(price) || Number(price) <= 0) {
      showWarning('Enter a valid positive price, e.g. 120 or 120.50.');
      return;
    }

    if (files.length < 1 || files.length > 5) {
      showWarning('Select between 1 and 5 images.');
      return;
    }

    setSaving(true);

    try {
      const formData = new FormData();

      formData.append('name', name.trim());
      formData.append('description', description.trim());
      formData.append('ingredients', JSON.stringify(ingredients));
      formData.append('price', price);
      formData.append('offer', offer.trim());

      files.forEach((file) => formData.append('images', file));

      const response = await fetch('/api/menu-items', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok || result.success === false) {
        throw new Error(result.message || 'Unable to save the menu item.');
      }

      if (result.item) {
        setItems((previous) => [
          result.item,
          ...previous.filter((item) => item._id !== result.item._id),
        ]);
      } else {
        await loadItems();
      }

      setName('');
      setDescription('');
      setIngredientDraft('');
      setIngredients([]);
      setPrice('');
      setOffer('');
      setFiles([]);
      sessionStorage.removeItem(draftKey);

      const fileInput = document.getElementById('menu-item-images');
      if (fileInput) fileInput.value = '';

      showSuccess('Menu item saved successfully!');
    } catch (error) {
      showError(error.message || 'Unable to save the menu item.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardLayout>
      <main className="min-h-screen bg-gray-50">
        <div className="mx-auto w-full max-w-[1600px] space-y-6 p-4 sm:p-6">
          <header>
            <p className="text-sm font-semibold uppercase tracking-wider text-green-700">
              Menu Management
            </p>
            <h1 className="mt-2 text-3xl font-bold text-gray-900">
              Menu Items
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Nua menu item add kara ebam saved items manage kara.
            </p>
          </header>

          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
            <h2 className="text-xl font-bold text-gray-900">
              Add New Menu Item
            </h2>

            <form onSubmit={handleSubmit} className="mt-6 space-y-6">
              <div>
                <label
                  htmlFor="menu-item-images"
                  className="mb-2 block text-sm font-semibold text-gray-700"
                >
                  Item Images <span className="text-red-600">*</span>
                </label>
                <input
                  id="menu-item-images"
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  onChange={handleImageChange}
                  required
                  className={inputClass}
                />
                <p className="mt-2 text-xs text-gray-500">
                  1–5 images. JPEG, PNG, WEBP, AVIF; maximum 5MB per image.
                </p>

                {previews.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
                    {previews.map((src, index) => (
                      <div
                        key={src}
                        className="overflow-hidden rounded-xl border border-gray-200"
                      >
                        <Image
                          src={src}
                          alt={`Preview ${index + 1}`}
                          width={320}
                          height={112}
                          unoptimized
                          className="h-28 w-full object-cover"
                        />
                        <p className="p-2 text-xs text-gray-500">
                          Image {index + 1}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="menu-item-name"
                    className="mb-2 block text-sm font-semibold text-gray-700"
                  >
                    Item Name <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="menu-item-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    maxLength={120}
                    required
                    placeholder="e.g. Paneer Butter Masala"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label
                    htmlFor="menu-item-price"
                    className="mb-2 block text-sm font-semibold text-gray-700"
                  >
                    Price (₹) <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="menu-item-price"
                    type="text"
                    inputMode="decimal"
                    value={price}
                    onChange={(event) => setPrice(event.target.value)}
                    pattern="[0-9]+([.][0-9]{1,2})?"
                    title="Enter a positive price, e.g. 120 or 120.50"
                    required
                    placeholder="e.g. 120"
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="menu-item-description"
                  className="mb-2 block text-sm font-semibold text-gray-700"
                >
                  Description <span className="text-red-600">*</span>
                </label>
                <textarea
                  id="menu-item-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  maxLength={500}
                  required
                  rows={3}
                  placeholder="Describe the menu item..."
                  className={inputClass}
                />
              </div>

              <div>
                <label
                  htmlFor="menu-item-ingredient"
                  className="mb-2 block text-sm font-semibold text-gray-700"
                >
                  Ingredients <span className="text-red-600">*</span>
                </label>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <input
                    id="menu-item-ingredient"
                    value={ingredientDraft}
                    onChange={(event) =>
                      setIngredientDraft(event.target.value)
                    }
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        addIngredient();
                      }
                    }}
                    placeholder="Enter one ingredient"
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={addIngredient}
                    className="rounded-xl bg-green-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-green-800"
                  >
                    + Add
                  </button>
                </div>

                {ingredients.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {ingredients.map((ingredient) => (
                      <span
                        key={ingredient}
                        className="inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-2 text-sm text-green-800"
                      >
                        {ingredient.charAt(0).toUpperCase() + ingredient.slice(1)}
                        <button
                          type="button"
                          aria-label={`Remove ${ingredient}`}
                          onClick={() =>
                            setIngredients((previous) =>
                              previous.filter((item) => item !== ingredient),
                            )
                          }
                          className="font-bold text-green-800 hover:text-red-600"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label
                  htmlFor="menu-item-offer"
                  className="mb-2 block text-sm font-semibold text-gray-700"
                >
                  Offer <span className="font-normal text-gray-400">(Optional)</span>
                </label>
                <input
                  id="menu-item-offer"
                  value={offer}
                  onChange={(event) => setOffer(event.target.value)}
                  maxLength={100}
                  placeholder="e.g. 10% off"
                  className={inputClass}
                />
              </div>

              <div className="flex flex-col gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setName('');
                    setDescription('');
                    setIngredientDraft('');
                    setIngredients([]);
                    setPrice('');
                    setOffer('');
                    setFiles([]);
                    sessionStorage.removeItem(draftKey);
                    const input = document.getElementById('menu-item-images');
                    if (input) input.value = '';
                  }}
                  disabled={saving}
                  className="rounded-xl border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Clear Form
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-green-700 px-7 py-3 text-sm font-semibold text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? 'Saving...' : 'Save Menu Item'}
                </button>
              </div>
            </form>
          </section>

          <section>
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Saved Menu Items
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  {items.length} item{items.length === 1 ? '' : 's'} saved
                </p>
              </div>
              <button
                type="button"
                onClick={loadItems}
                disabled={loading}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Refresh'}
              </button>
            </div>

            {loading ? (
              <p className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-500">
                Loading menu items...
              </p>
            ) : items.length === 0 ? (
              <p className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">
                Ebe parjyanta menu item save heini. Upara form use kari first
                item add kara.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {items.map((item) => (
                  <div key={item._id}>
                    <MenuItemCard
                      images={item.images?.map((img) => img.url).filter(Boolean) || []}
                      image={item.images?.[0]?.url || '/default-menu-item.png'}
                      name={item.name}
                      description={item.description}
                      price={item.price}
                      rating={item.rating ?? 0}
                      href={`/admin/dashboard/menu-items/${item._id}`}
                    />
                    {item.offer && (
                      <p className="mt-2 text-sm font-semibold text-green-700">
                        Offer: {item.offer}
                      </p>
                    )}
                    {Array.isArray(item.ingredients) &&
                      item.ingredients.length > 0 && (
                        <p className="mt-1 text-xs text-gray-500">
                          Ingredients: {item.ingredients.join(', ')}
                        </p>
                      )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </DashboardLayout>
  );
}
