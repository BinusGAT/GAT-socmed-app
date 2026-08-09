'use client';

export function DashboardSkeleton() {
    return (
        <div role="status" aria-live="polite" aria-label="Loading dashboard" className="space-y-6 animate-pulse">
            <span className="sr-only">Loading dashboard</span>
            <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-5">
                {Array.from({ length: 5 }, (_, index) => (
                    <div key={index} className="h-28 rounded-xl bg-surface-container border border-outline-variant/20" />
                ))}
            </div>
            <div className="grid gap-6 lg:grid-cols-3">
                <div className="h-36 rounded-xl bg-surface-container border border-outline-variant/20 lg:col-span-2" />
                <div className="h-36 rounded-xl bg-surface-container border border-outline-variant/20" />
            </div>
            <div className="h-96 rounded-xl bg-surface-container border border-outline-variant/20" />
        </div>
    );
}

export function BackgroundActivity({ kind }) {
    const label = kind === 'sync' ? 'Syncing workspace data' : 'Updating workspace';

    return (
        <div
            role="status"
            aria-live="polite"
            className="fixed right-4 top-20 z-40 flex items-center gap-2 rounded-lg border border-outline-variant/30 bg-surface-container/95 px-3 py-2 text-xs font-medium text-on-surface shadow-lg backdrop-blur-md"
        >
            <span className="material-symbols-outlined animate-spin text-base text-primary" aria-hidden="true">progress_activity</span>
            <span>{label}</span>
        </div>
    );
}
