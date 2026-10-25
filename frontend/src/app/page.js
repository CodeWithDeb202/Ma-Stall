import LandingNavbar from '@/components/layout/LandingNavbar';
import MenuItemCard from '@/components/reusable/MenuItemCard';

export const revalidate = 60;

async function getMenuItems() {
  const backendUrl =
    process.env.BACKEND_URL || 'https://ma-stall.onrender.com';

  try {
    const response = await fetch(
      `${backendUrl}/api/menu-items/public`,
      {
        next: { revalidate: 60 },
        signal: AbortSignal.timeout(8000),
      }
    );

    if (!response.ok) return [];

    const result = await response.json();

    return result.success && Array.isArray(result.items)
      ? result.items
      : [];
  } catch (error) {
    console.error('Unable to load public menu items:', error.message);
    return [];
  }
}

export default async function Home() {
  const menuItems = await getMenuItems();

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

          {menuItems.length === 0 ? (
            <p className="py-8 text-gray-600">
              No menu items available right now. Please refresh shortly.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {menuItems.map((item, index) => (
                <MenuItemCard
                  key={item._id}
                  images={item.images?.map((img) => img.url).filter(Boolean) || []}
                  image={item.images?.[0]?.url || '/default-menu-item.webp'}
                  name={item.name}
                  description={item.description}
                  price={item.price}
                  rating={item.rating ?? 0}
                  priority={index === 0}
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
