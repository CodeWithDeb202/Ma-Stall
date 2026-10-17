
'use client';

export default function Warning({
    open,
    title = 'Confirm Delete',
    message = 'Are you sure you want to delete this record?',
    confirmText = 'Confirm Delete',
    cancelText = 'Cancel',
    onConfirm,
    onCancel,
    loading = false,
}) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 p-4">
            <div
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="warning-title"
                className="w-full max-w-md rounded-2xl border border-[#D8E5D8] bg-white p-6 shadow-xl"
            >
                <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-xl text-red-600">
                        !
                    </div>

                    <h2
                        id="warning-title"
                        className="text-lg font-semibold text-[#174B35]"
                    >
                        {title}
                    </h2>
                </div>

                <p className="mb-6 text-sm leading-6 text-gray-600">
                    {message}
                </p>

                <div className="flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={loading}
                        className="rounded-lg border border-[#D8E5D8] px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                        {cancelText}
                    </button>

                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={loading}
                        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {loading ? 'Deleting...' : confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
