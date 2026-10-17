export default function Footer() {
  return (
    <footer className="flex min-h-12 shrink-0 items-center justify-center border-t border-[#D8E5D8] bg-white px-4 py-3 text-center text-xs text-[#52715D]">
      © {new Date().getFullYear()} Ma Stall Ledger. All rights reserved.
    </footer>
  );
}
