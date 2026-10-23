'use client';

import Image from 'next/image';

export default function Navbar() {
  return (
    <header className="flex min-h-16 shrink-0 items-center justify-between gap-3 border-b border-[#D8E5D8] bg-white px-3 py-2 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border-2 border-[#176B45] bg-white shadow-sm sm:h-11 sm:w-11">
          <Image
            src="/om-sai-krishna-logo.webp"
            alt="Omm Sai Krishna logo"
            width={44}
            height={44}
            priority
            className="h-full w-full rounded-full object-contain"
          />
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-base font-bold tracking-tight text-[#174D35] sm:text-xl">
            Omm Sai Krishna
          </h1>
          <p className="hidden text-xs text-[#52715D] sm:block">
            Daily investment and income management
          </p>
        </div>
      </div>

      <div className="rounded-full border border-[#D8E5D8] bg-[#F1F7F0] px-3 py-1.5 text-xs font-semibold text-[#176B45]">
        Dashboard
      </div>
    </header>
  );
}
