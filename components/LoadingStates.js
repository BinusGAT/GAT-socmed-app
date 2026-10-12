'use client';

import Icon from './Icon';

export function DashboardSkeleton() {
    return (
        <div role="status" aria-live="polite" aria-label="Loading dashboard" className="space-y-6 animate-pulse">
            <span className="sr-only">Loading dashboard</span>
            <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-5">
                {Array.from({ length: 5 }, (_, index) => (
                    <div key={index} className="h-28 rounded-[10px] bg-muted/40 border border-border" />
                ))}
            </div>
            <div className="grid gap-6 lg:grid-cols-3">
                <div className="h-36 rounded-[10px] bg-muted/40 border border-border lg:col-span-2" />
                <div className="h-36 rounded-[10px] bg-muted/40 border border-border" />
            </div>
            <div className="h-96 rounded-[10px] bg-muted/40 border border-border" />
        </div>
    );
}

export function BackgroundActivity({ kind }) {
    const label = kind === 'sync' ? 'Syncing workspace data' : 'Updating workspace';

    return (
        <div
            role="status"
            aria-live="polite"
            className="fixed right-4 top-20 z-40 flex items-center gap-2 rounded-[8px] border border-border bg-surface/95 px-3 py-2 text-xs font-medium text-foreground shadow-sm backdrop-blur-md"
        >
            <Icon name="progress_activity" size={16} className="animate-spin text-primary" aria-hidden="true" />
            <span>{label}</span>
        </div>
    );
}
