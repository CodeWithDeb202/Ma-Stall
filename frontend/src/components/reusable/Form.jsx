
'use client';

export default function Form({
    title,
    fields = [],
    values = {},
    onChange,
    onSubmit,
    submitText = 'Submit',
    isSubmitting = false,
    message = '',
    messageType = 'info',
}) {

    const numberInputClass = '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none';

    return (
        <form
            onSubmit={onSubmit}
            className="rounded-2xl border border-[#D8E5D8] bg-white p-5"
        >
            {title && (
                <h2 className="text-xl font-semibold">{title}</h2>
            )}

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {fields.map((field) => (
                    <label
                        key={field.name}
                        className="text-sm font-medium"
                    >
                        {field.label}

                        <input
                            type={field.type || 'text'}
                            name={field.name}
                            value={values[field.name] ?? ''}
                            onWheel={(event) => {
                                if (field.type === 'number') {
                                    event.currentTarget.blur();
                                }
                            }}
                            onChange={(event) =>
                                onChange(field.name, event.target.value)
                            }
                            placeholder={field.placeholder || ''}
                            min={field.min}
                            step={field.step}
                            required={field.required || false}
                            disabled={field.disabled || false}
                            className={`mt-2 w-full rounded-lg border border-[#D8E5D8] p-3 outline-none focus:ring-2 focus:ring-[#176B45] disabled:bg-gray-100 ${field.type === 'number' ? numberInputClass : ''}`}
                        />
                    </label>
                ))}
            </div>

            <button
                type="submit"
                disabled={isSubmitting}
                className="mt-5 min-w-36 rounded-xl bg-[#176B45] px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-[#145638] focus:outline-none focus:ring-2 focus:ring-[#176B45] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
                {isSubmitting ? 'Saving...' : submitText}
            </button>

            {message && (
                <p
                    role="status"
                    className={`mt-3 rounded-lg px-3 py-2 text-sm ${messageType === 'error'
                            ? 'bg-red-50 text-red-700'
                            : 'bg-[#F1F7F0] text-[#52715D]'
                        }`}
                >
                    {message}
                </p>
            )}
        </form>
    );
}