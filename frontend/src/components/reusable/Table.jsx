'use client';

export default function Table({
    columns = [],
    data = [],
    getRowKey,
    emptyMessage = 'No records found.',
    renderActions,
    fitToContainer = false,
    onRowClick,
}) {
    return (
        <div className="w-full min-w-0 max-w-full overflow-x-auto overscroll-x-contain rounded-xl border border-[#D8E5D8] bg-white">
            <table className={"w-full text-left text-sm " + (fitToContainer ? "table-fixed" : "min-w-max")}>
                <thead className="bg-[#174D35] text-white">
                    <tr>
                        {columns.map((column) => (
                            <th
                                key={column.key}
                                scope="col"
                                className={(fitToContainer ? "whitespace-normal break-words " : "whitespace-nowrap ") + "px-3 py-3.5 text-xs font-bold uppercase tracking-wide sm:px-5 sm:text-sm"}
                            >
                                {column.label}
                            </th>
                        ))}
                        {renderActions && (
                            <th scope="col" className="whitespace-nowrap px-3 py-3.5 text-xs font-bold uppercase tracking-wide sm:px-5 sm:text-sm">
                                Action
                            </th>
                        )}
                    </tr>
                </thead>

                <tbody>
                    {data.length === 0 ? (
                        <tr>
                            <td
                                colSpan={columns.length + (renderActions ? 1 : 0)}
                                className="px-3 py-10 text-center text-sm text-[#52715D] sm:px-5"
                            >
                                {emptyMessage}
                            </td>
                        </tr>
                    ) : (
                        data.map((row, index) => (
                            <tr
                                key={getRowKey ? getRowKey(row) : index}
                                className={`border-t border-[#E5EEE4] transition-colors hover:bg-[#E8F3E9] ${index % 2 === 1 ? 'bg-[#F8FBF7]' : 'bg-white'} ${onRowClick ? 'cursor-pointer' : ''}`}
                                onClick={onRowClick ? () => onRowClick(row) : undefined}
                            >
                                {columns.map((column) => (
                                    <td
                                        key={column.key}
                                        className={"px-3 py-3.5 text-[#174D35] sm:px-5 sm:py-4 " + (fitToContainer ? "break-words" : "")}
                                    >
                                        {column.render
                                            ? column.render(row, index)
                                            : row[column.key]}
                                    </td>
                                ))}
                                {renderActions && (
                                    <td className="whitespace-nowrap px-3 py-3.5 sm:px-5 sm:py-4">
                                        {renderActions(row)}
                                    </td>
                                )}
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}