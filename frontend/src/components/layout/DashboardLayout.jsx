'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import Footer from './Footer';
import Spinner from '../reusable/Spinner';

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      setIsNavigating(false);
    }, 1000);
  }, [pathname]);

  const activeSection =
    pathname === '/overview'
      ? 'overview'
      :
    pathname === '/dashboard/purchase-product-list'
      ? 'purchase-products'
      : pathname === '/dashboard/stock-products'
        ? 'stock-products'
        : pathname === '/dashboard/daily-buying-product-list'
          ? 'daily-buying'
          : pathname === '/dashboard/total-revenue'
            ? 'total-revenue'
            : pathname === '/dashboard/selling-product'
              ? 'selling-product'
              : pathname === '/dashboard'
              ? 'daily-invest'
              : '';

  function handleSectionChange(section) {
    const routes = {
      'overview': '/overview',
      'purchase-products': '/dashboard/purchase-product-list',
      'stock-products': '/dashboard/stock-products',
      'daily-invest': '/dashboard',
      'daily-buying': '/dashboard/daily-buying-product-list',
      'total-revenue': '/dashboard/total-revenue',
      'selling-product': '/dashboard/selling-product',
    };

    const target = routes[section];

    if (target && pathname !== target) {
      setIsNavigating(true);
      router.push(target);
    }

    setMobileMenuOpen(false);
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[#F8FBF7] text-[#174D35]">
      <Navbar />

      <div className="flex min-h-0 min-w-0 flex-1">
        {/* Desktop sidebar */}
        <aside className="hidden shrink-0 md:flex">
          <Sidebar
            activeSection={activeSection}
            onSectionChange={handleSectionChange}
          />
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {/* Mobile menu toggle */}
          <div className="sticky top-0 z-40 flex shrink-0 items-center justify-between border-b border-[#D8E5D8] bg-white px-4 py-2 md:hidden">
            <span className="text-sm font-semibold text-[#174D35]">
              Menu
            </span>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((open) => !open)}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-dashboard-menu"
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#D8E5D8] bg-[#F8FBF7] text-xl text-[#176B45] transition hover:bg-[#E8F3E9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#28784F]"
            >
              {mobileMenuOpen ? '✕' : '☰'}
            </button>
          </div>

          {/* Collapsible mobile navigation */}
          {mobileMenuOpen && (
            <nav
              id="mobile-dashboard-menu"
              className="absolute left-0 right-0 top-[calc(var(--navbar-height,4rem)+3.5rem)] z-30 max-h-[70dvh] overflow-y-auto border-b border-[#D8E5D8] bg-white p-3 shadow-lg md:hidden"
            >
              <Sidebar
                activeSection={activeSection}
                onSectionChange={handleSectionChange}
              />
            </nav>
          )}

          <main
            className="relative scrollbar-hide min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain"
            aria-busy={isNavigating}
          >
            {isNavigating ? (
              <Spinner label="Loading page..." />
            ) : (
              children
            )}
          </main>
        </div>
      </div>

      <Footer />
    </div>
  );
}
