'use client';

import React, { useEffect, useRef, useState } from 'react';
import { canAccessView } from '../utils/rolePermissions';

const PRIMARY_ITEMS = [
    { id: 'dashboard', label: 'Home', icon: 'dashboard' },
    { id: 'my-work', label: 'My Work', icon: 'work_history' },
    { id: 'calendar', label: 'Planner', icon: 'calendar_month', restricted: true },
    { id: 'content', label: 'Library', icon: 'folder_open', restricted: true },
];

const SECONDARY_ITEMS = [
    { id: 'tasklist', label: 'Tasks', description: 'Manage scheduled work', icon: 'assignment', restricted: true },
    { id: 'meeting', label: 'Meeting memos', description: 'Review decisions and notes', icon: 'description', restricted: true },
    { id: 'analytics', label: 'Content analytics', description: 'Track content performance', icon: 'analytics' },
    { id: 'web-analytics', label: 'Web analytics', description: 'Review website activity', icon: 'language', restricted: true },
    { id: 'settings', label: 'Settings', description: 'Manage workspace preferences', icon: 'settings' },
];

function canShowItem(item, userRole, isUnlocked) {
    return canAccessView(userRole, item.id) && (!item.restricted || isUnlocked);
}

export default function MobileNavigation({ currentView, userRole, isUnlocked, onNavigate }) {
    const [isMoreOpen, setIsMoreOpen] = useState(false);
    const moreButtonRef = useRef(null);
    const sheetRef = useRef(null);
    const primaryCandidates = userRole === 'Viewer'
        ? [PRIMARY_ITEMS[0], ...SECONDARY_ITEMS.filter((item) => ['analytics', 'web-analytics'].includes(item.id))]
        : PRIMARY_ITEMS;
    const primaryItems = primaryCandidates.filter((item) => canShowItem(item, userRole, isUnlocked));
    const primaryIds = new Set(primaryItems.map((item) => item.id));
    const secondaryItems = SECONDARY_ITEMS.filter((item) => canShowItem(item, userRole, isUnlocked) && !primaryIds.has(item.id));
    const isSecondaryView = secondaryItems.some((item) => item.id === currentView);

    useEffect(() => {
        if (!isMoreOpen) return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        sheetRef.current?.querySelector('button')?.focus();

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                setIsMoreOpen(false);
                moreButtonRef.current?.focus();
                return;
            }
            if (event.key !== 'Tab') return;
            const focusable = [...(sheetRef.current?.querySelectorAll('button') || [])];
            if (!focusable.length) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isMoreOpen]);

    const navigate = (id) => {
        setIsMoreOpen(false);
        onNavigate(id);
    };

    return (
        <>
            {isMoreOpen && (
                <div className="lg:hidden fixed inset-0 z-[95]" role="presentation">
                    <button type="button" className="absolute inset-0 w-full bg-background/65 backdrop-blur-xs" aria-label="Close more navigation" onClick={() => setIsMoreOpen(false)} />
                    <section id="mobile-more-menu" ref={sheetRef} role="dialog" aria-modal="true" aria-labelledby="mobile-more-heading" className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-outline-variant/30 bg-surface-container-lowest px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl">
                        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-outline-variant" aria-hidden="true" />
                        <div className="mb-3 flex items-center justify-between">
                            <div>
                                <h2 id="mobile-more-heading" className="text-body-lg font-bold text-on-surface">More tools</h2>
                                <p className="text-xs text-on-surface-variant">Open secondary workspace areas.</p>
                            </div>
                            <button type="button" onClick={() => { setIsMoreOpen(false); moreButtonRef.current?.focus(); }} className="rounded-lg p-2 text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface" aria-label="Close more menu">
                                <span className="material-symbols-outlined text-[22px]" aria-hidden="true">close</span>
                            </button>
                        </div>
                        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                            {secondaryItems.map((item) => {
                                const isActive = currentView === item.id;
                                return (
                                    <button key={item.id} type="button" onClick={() => navigate(item.id)} aria-current={isActive ? 'page' : undefined} className={`flex min-h-14 items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${isActive ? 'bg-primary/12 text-primary' : 'text-on-surface hover:bg-surface-container-high'}`}>
                                        <span className="material-symbols-outlined text-[22px]" aria-hidden="true" style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}>{item.icon}</span>
                                        <span>
                                            <span className="block text-sm font-semibold">{item.label}</span>
                                            <span className="block text-xs text-on-surface-variant">{item.description}</span>
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </section>
                </div>
            )}

            <nav aria-label="Mobile primary navigation" className="lg:hidden fixed bottom-0 left-0 right-0 z-[90] flex h-20 w-full max-w-full items-stretch overflow-hidden border-t border-outline-variant/20 bg-surface-container-lowest/95 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur-md">
                {primaryItems.map((item) => {
                    const isActive = currentView === item.id;
                    return (
                        <button type="button" key={item.id} onClick={() => navigate(item.id)} aria-current={isActive ? 'page' : undefined} className={`flex min-w-0 flex-1 basis-0 flex-col items-center justify-center gap-1 overflow-hidden rounded-lg px-1 transition-colors micro-interaction ${isActive ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}>
                            <span className="material-symbols-outlined pointer-events-none text-[23px]" aria-hidden="true" style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}>{item.icon}</span>
                            <span className="pointer-events-none max-w-full truncate text-xs font-semibold">{item.label}</span>
                        </button>
                    );
                })}
                <button ref={moreButtonRef} type="button" onClick={() => setIsMoreOpen(true)} aria-expanded={isMoreOpen} aria-controls="mobile-more-menu" aria-current={isSecondaryView ? 'page' : undefined} className={`flex min-w-0 flex-1 basis-0 flex-col items-center justify-center gap-1 overflow-hidden rounded-lg px-1 transition-colors micro-interaction ${isSecondaryView || isMoreOpen ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}>
                    <span className="material-symbols-outlined pointer-events-none text-[23px]" aria-hidden="true">more_horiz</span>
                    <span className="pointer-events-none text-xs font-semibold">More</span>
                </button>
            </nav>
        </>
    );
}
