'use client';

import { useEffect, useState } from 'react';
import LandingNavbar from '@/components/layout/LandingNavbar';
import MenuItemCard from '@/components/reusable/MenuItemCard';
import apiUrl from '@/services/api';

export default function Home() {
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    async function loadMenuItems() {
      try {
        const response = await fetch(`${apiUrl}/api/menu-items/public`, {
          cache: 'no-store',
          signal: controller.signal,
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || 'Unable to load menu items.');
        }

        setMenuItems(Array.isArray(result.items) ? result.items : []);
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.message || 'Unable to load menu items.');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadMenuItems();
    return () => controller.abort();
  }, []);

  return (
    <>
      <LandingNavbar />

      <main className="min-h-[calc(100vh-4rem)] bg-[#F8FBF7] px-4 py-10 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-[#174B35] sm:text-4xl">
              Menu Items
            </h1>
            <p className="mt-2 text-sm text-gray-600 sm:text-base">
              Fresh, tasty, and healthy choices for every day.
            </p>
          </div>

          {loading ? (
            <p className="py-8 text-gray-600">Loading menu items...</p>
          ) : error ? (
            <p role="alert" className="py-8 text-red-600">{error}</p>
          ) : menuItems.length === 0 ? (
            <p className="py-8 text-gray-600">No menu items available yet.</p>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {menuItems.map((item) => (
                <MenuItemCard
                  key={item._id}
                  images={item.images?.map((img) => img.url).filter(Boolean) || []}
                  image={item.images?.[0]?.url || '/default-menu-item.png'}
                  name={item.name}
                  description={item.description}
                  price={item.price}
                  rating={item.rating ?? 0}
                  href={item._id ? `/menu-items/${item._id}` : undefined}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
