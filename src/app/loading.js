import React from 'react';

export default function RootLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading workspace"
      className="fixed inset-0 z-50 flex items-center justify-center bg-background p-4 text-on-surface overflow-hidden"
    >
      <div className="relative z-10 w-full max-w-md space-y-6 rounded-2xl border border-outline-variant/30 bg-surface-container/70 p-6 sm:p-8 shadow-2xl backdrop-blur-2xl animate-pulse">
        {/* Header Skeleton */}
        <div className="flex items-center gap-4 border-b border-outline-variant/20 pb-4">
          <div className="h-11 w-11 rounded-xl border border-primary/20 bg-primary-container/20" />
          <div className="flex-1 space-y-2">
            <div className="h-5 w-36 rounded-md bg-surface-container-high" />
            <div className="h-3 w-24 rounded-md bg-surface-container" />
          </div>
        </div>

        {/* Input Fields Skeleton */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <div className="h-3 w-20 rounded-md bg-surface-container-high" />
            <div className="h-10 w-full rounded-xl border border-outline-variant/30 bg-surface-container-low" />
          </div>
          <div className="space-y-1.5">
            <div className="h-3 w-28 rounded-md bg-surface-container-high" />
            <div className="h-10 w-full rounded-xl border border-outline-variant/30 bg-surface-container-low" />
          </div>
          <div className="flex gap-3 pt-2">
            <div className="h-10 flex-1 rounded-xl border border-outline-variant/30 bg-surface-container" />
            <div className="h-10 flex-1 rounded-xl bg-primary/20" />
          </div>
        </div>
      </div>
    </div>
  );
}
