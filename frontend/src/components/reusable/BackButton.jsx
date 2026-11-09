import Link from "next/link";

export default function BackButton({ href = "/", label = "Back to home" }) {
    return (
        <Link
            href={href}
            className="mb-6 inline-flex self-start w-fit items-center gap-2 rounded-xl border border-green-200 bg-white px-4 py-3 font-semibold text-green-800 transition hover:bg-green-50"
        >
            <span aria-hidden="true">←</span>
            {label}
        </Link>
    );
}
