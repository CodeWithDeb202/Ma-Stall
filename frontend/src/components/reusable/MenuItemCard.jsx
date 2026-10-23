'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function MenuItemCard({
  image = '/default-menu-item.png',
  images = [],
  name,
  description,
  price,
  rating = 4,
  href,
}) {
  const router = useRouter();
  const safeRating = Math.max(1, Math.min(5, Number(rating) || 1));

  const slides = [
    ...new Set(
      (Array.isArray(images) ? images : [])
        .filter((src) => typeof src === 'string' && src.trim())
    ),
  ];

  if (slides.length === 0) {
    slides.push(image || '/default-menu-item.png');
  }

  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (isHovered || slides.length <= 1) return;

    const interval = setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [isHovered, slides.length]);

  return (
    <article
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => {
        if (href) router.push(href);
      }}
      onKeyDown={(event) => {
        if (href && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          router.push(href);
        }
      }}
      role={href ? 'link' : undefined}
      tabIndex={href ? 0 : undefined}
      aria-label={href ? `View details for ${name}` : undefined}
      className={`group relative isolate h-80 overflow-hidden rounded-2xl bg-gray-200 shadow-md transition-[box-shadow] duration-500 ease-in-out hover:shadow-xl ${href ? 'cursor-pointer' : ''}`}
    >
      {slides.map((src, index) => (
        <Image
          key={src}
          src={src}
          alt={`${name} - image ${index + 1}`}
          fill
          unoptimized
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className={`object-cover transition-[opacity,transform] duration-700 ease-in-out group-hover:scale-105 ${
            index === activeIndex ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ zIndex: index === activeIndex ? 0 : -1 }}
          priority={index === 0}
        />
      ))}

      <div className="absolute inset-0 z-0 bg-linear-to-t from-black/90 via-black/30 to-transparent pointer-events-none" />

      <div className="absolute inset-x-0 bottom-0 z-10 p-3 sm:p-5 text-white">
        <div className="flex items-end justify-between gap-2">
          <h3 className="min-w-0 truncate text-sm font-extrabold capitalize drop-shadow-[0_2px_3px_rgba(0,0,0,1)] sm:text-xl">
            {name}
          </h3>

          <div
            className="flex shrink-0 items-center gap-1 rounded-full bg-black/50 px-2 py-1 text-xs sm:text-sm"
            aria-label={`Rating: ${safeRating} out of 5`}
          >
            <span className="text-amber-400" aria-hidden="true">★</span>
            <span>{safeRating}/5</span>
          </div>
        </div>
      </div>

      {slides.length > 1 && (
        <div
          className="absolute inset-x-0 bottom-2 z-20 flex items-center justify-center gap-1.5"
          aria-label={`Image ${activeIndex + 1} of ${slides.length}`}
        >
          {slides.map((src, index) => (
            <button
              key={src}
              type="button"
              aria-label={`Show image ${index + 1}`}
              aria-current={index === activeIndex ? 'true' : undefined}
              onClick={(event) => {
                event.stopPropagation();
                setActiveIndex(index);
              }}
              className={`m-0! min-h-0! shrink-0! p-0! h-2 w-2 rounded-full transition-[width,background-color] duration-500 ease-in-out ${
                index === activeIndex
                  ? 'w-4! bg-green-500'
                  : 'bg-white/70 hover:bg-white'
              }`}
            />
          ))}
        </div>
      )}

    </article>
  );
}
