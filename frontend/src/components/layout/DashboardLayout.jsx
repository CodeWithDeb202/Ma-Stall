'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Navbar from './Navbar';
import LandingNavbar from './LandingNavbar';
import Sidebar from './Sidebar';
import Footer from './Footer';
import Spinner from '../reusable/Spinner';

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [role, setRole] = useState(null);
  const [userId, setUserId] = useState(null);
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    let active = true;

    async function verifyAdmin() {
      try {
        const response = await fetch('/api/auth/session', {
          method: 'GET',
          cache: 'no-store',
          credentials: 'include',
        });

        const data = await response.json();

        if (!active) return;

        if (
          response.ok &&
          data.success === true &&
          data.authenticated === true &&
          ['admin', 'user'].includes(data.role)
        ) {
          setRole(data.role);
          setUserId(data.role === 'user' ? data.userId : null);
        } else {
          router.replace('/auth/admin/login');
        }
      } catch {
        if (active) router.replace('/auth/admin/login');
      } finally {
        if (active) setSessionChecked(true);
      }
    }

    verifyAdmin();

    return () => {
      active = false;
    };
  }, [router]);


  const activeSection =
    pathname === '/admin/overview'
      ? 'overview'
      : pathname === '/admin/dashboard/purchase-product-list'
        ? 'purchase-products'
        : pathname === '/admin/dashboard/stock-products'
          ? 'stock-products'
          : pathname === '/admin/dashboard/menu-items' ||
            (role === 'user' &&
            userId &&
            pathname === `/u/${userId}/dashboard/menu-items`)
            ? 'menu-items'
          : pathname === '/admin/dashboard/daily-buying-product-list'
            ? 'daily-buying'
            : pathname === '/admin/dashboard/total-revenue'
              ? 'total-revenue'
              : pathname === '/admin/dashboard/selling-product'
                ? 'selling-product'
                : pathname === '/admin/dashboard'
                  ? 'daily-invest'
                  : '';

  function handleSectionChange(section) {
    const routes = {
      overview: '/admin/overview',
      'purchase-products': '/admin/dashboard/purchase-product-list',
      'stock-products': '/admin/dashboard/stock-products',
      'menu-items':
        role === 'user'
          ? `/u/${userId}/dashboard/menu-items`
          : '/admin/dashboard/menu-items',
      'daily-invest': '/admin/dashboard',
      'daily-buying': '/admin/dashboard/daily-buying-product-list',
      'total-revenue': '/admin/dashboard/total-revenue',
      'selling-product': '/admin/dashboard/selling-product',
    };

    const target = routes[section];

    if (target && pathname !== target) {
      setIsNavigating(true);
      router.push(target);
    }

    setMobileMenuOpen(false);
  }

  if (!sessionChecked || !role) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#F8FBF7]">
        <Spinner label="Verifying access..." />
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[#F8FBF7] text-[#174D35]">
      {role === 'admin' ? <Navbar /> : <LandingNavbar showProfile />}

      <div className="flex min-h-0 min-w-0 flex-1">
        <aside className="hidden shrink-0 md:flex">
          <Sidebar
            activeSection={activeSection}
            onSectionChange={handleSectionChange}
            role={role}
          />
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="sticky top-0 z-40 flex shrink-0 items-center justify-between border-b border-[#D8E5D8] bg-white px-4 py-2 md:hidden">
            <span className="text-sm font-semibold text-[#174D35]">
              Menu
            </span>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((open) => !open)}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-dashboard-menu"
              aria-label={
                mobileMenuOpen
                  ? 'Close navigation menu'
                  : 'Open navigation menu'
              }
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#D8E5D8] bg-[#F8FBF7] text-xl text-[#176B45] transition hover:bg-[#E8F3E9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#28784F]"
            >
              {mobileMenuOpen ? '✕' : '☰'}
            </button>
          </div>

          {mobileMenuOpen && (
            <nav
              id="mobile-dashboard-menu"
              className="absolute left-0 right-0 top-[calc(var(--navbar-height,4rem)+3.5rem)] z-30 max-h-[70dvh] overflow-y-auto border-b border-[#D8E5D8] bg-white p-3 shadow-lg md:hidden"
            >
              <Sidebar
                activeSection={activeSection}
                onSectionChange={handleSectionChange}
                role={role}
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
