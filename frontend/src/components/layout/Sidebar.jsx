'use client';

export default function Sidebar({ activeSection, onSectionChange, role = 'admin' }) {
    const menuItems = [
        { id: 'overview', label: 'Overview' },
        { id: 'purchase-products', label: 'Purchase Product List' },
        { id: 'daily-invest', label: 'Daily Invest & Income' },
        { id: 'daily-buying', label: 'Daily Buying Product List' },
        { id: 'stock-products', label: 'Stock' },
        { id: 'total-revenue', label: 'Total Revenue' },
        { id: 'selling-product', label: 'Selling Product' },
        { id: 'menu-items', label: 'Menu Items' },
    ];

    const visibleMenuItems = role === 'admin'
        ? menuItems
        : menuItems.filter((item) => item.id === 'menu-items');

    return (
        <aside className="flex w-full min-w-0 flex-col border-0 bg-white p-1 md:h-full md:w-64 md:shrink-0 md:border-r md:border-[#D8E5D8] md:p-4">
            <p className="mb-2 hidden px-3 text-xs font-semibold uppercase tracking-wider text-[#52715D] md:block md:mb-4">
                Menu
            </p>

            <nav className="flex min-w-0 flex-col items-stretch gap-1 overflow-visible pb-0">
                {visibleMenuItems.map((item) => {
                    const isActive = activeSection === item.id;

                    return (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                                if (!isActive) onSectionChange(item.id);
                            }}
                            aria-current={isActive ? 'page' : undefined}
                            className={`w-full min-w-0 whitespace-normal wrap-break-word rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition md:px-4 md:py-3 ${isActive
                                ? 'bg-[#E8F3E9] text-[#176B45] shadow-sm'
                                : 'text-[#174D35] hover:bg-[#F1F7F0]'
                                }`}
                        >
                            {item.label}
                        </button>
                    );
                })}
            </nav>
        </aside>
    );
}