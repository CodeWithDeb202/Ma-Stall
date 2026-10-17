'use client';

export default function Navbar() {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-[#D8E5D8] bg-white px-4 sm:px-6">
      <div>
        <h1 className="text-lg font-bold tracking-tight text-[#174D35] sm:text-xl">
          Ma Stall Ledger
        </h1>
        <p className="hidden text-xs text-[#52715D] sm:block">
          Daily investment and income management
        </p>
      </div>

      <div className="rounded-full border border-[#D8E5D8] bg-[#F1F7F0] px-3 py-1.5 text-xs font-semibold text-[#176B45]">
        Dashboard
      </div>
    </header>
  );
}
