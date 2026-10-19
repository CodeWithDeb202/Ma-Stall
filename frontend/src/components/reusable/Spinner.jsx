export default function Spinner({ label = "Loading..." }) {
  return (
    <div
      className="flex h-full min-h-55 w-full flex-col items-center justify-center gap-4"
      role="status"
      aria-live="polite"
    >
      <div className="relative h-12 w-12 shrink-0">
        <div className="absolute inset-0 rounded-full border-4 border-[#D8E5D8]" />
        <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-[#176B45] border-r-[#176B45]" />
      </div>

      <p className="text-sm font-medium tracking-wide text-[#52715D]">
        {label}
      </p>
    </div>
  );
}
