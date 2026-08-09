'use client';

export default function SortableTableHeader({
    column,
    activeColumn,
    direction = 'asc',
    onSort,
    children,
    className = '',
    align = 'left'
}) {
    const isActive = activeColumn === column;
    const ariaSort = isActive ? (direction === 'asc' ? 'ascending' : 'descending') : undefined;
    const nextDirection = isActive && direction === 'asc' ? 'descending' : 'ascending';
    const justifyClass = align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start';

    return (
        <th scope="col" aria-sort={ariaSort} className={className}>
            <button
                type="button"
                onClick={() => onSort(column)}
                className={`group inline-flex min-h-11 w-full items-center gap-1.5 rounded-md text-inherit transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-lowest ${justifyClass}`}
                aria-label={`${children}. Activate to sort ${nextDirection}.`}
            >
                <span>{children}</span>
                <span className="material-symbols-outlined text-base" aria-hidden="true">
                    {isActive ? (direction === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
                </span>
            </button>
        </th>
    );
}
