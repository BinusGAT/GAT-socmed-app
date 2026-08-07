'use client';

import React from 'react';
import { useDashboard } from './DashboardContext';

function getDueState(dateValue, completed) {
    if (completed) return { label: 'Completed', className: 'bg-emerald-500/10 text-emerald-500' };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(`${dateValue}T00:00:00`);
    const days = Math.round((due.getTime() - today.getTime()) / 86400000);
    if (days < 0) return { label: `${Math.abs(days)}d overdue`, className: 'bg-error/10 text-error' };
    if (days === 0) return { label: 'Due today', className: 'bg-amber-500/10 text-amber-500' };
    if (days <= 3) return { label: `Due in ${days}d`, className: 'bg-amber-500/10 text-amber-500' };
    return { label: new Date(`${dateValue}T00:00:00`).toLocaleDateString(), className: 'bg-surface-container-high text-on-surface-variant' };
}

export default function MyWorkTab() {
    const { scheduleData, userId, userName, setCurrentView } = useDashboard();
    const tasks = (scheduleData || [])
        .filter((task) => String(task.AssignedUserId || '') === String(userId || '') || (!task.AssignedUserId && task.PIC === userName))
        .sort((a, b) => String(a.Date || '').localeCompare(String(b.Date || '')));
    const openCount = tasks.filter((task) => Number(task.Status) !== 1).length;
    const overdueCount = tasks.filter((task) => Number(task.Status) !== 1 && new Date(`${task.Date}T00:00:00`) < new Date(new Date().setHours(0, 0, 0, 0))).length;

    return (
        <section className="space-y-6 max-w-6xl mx-auto">
            <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
                <div>
                    <p className="text-body-sm text-primary font-semibold">Personal workspace</p>
                    <h2 className="text-headline-md font-bold text-on-surface">My Work</h2>
                    <p className="text-body-sm text-on-surface-variant mt-1">Tasks assigned to {userName || 'you'}.</p>
                </div>
                <div className="flex gap-2 text-body-sm">
                    <span className="px-3 py-1.5 rounded-lg bg-surface-container-high text-on-surface-variant">{openCount} open</span>
                    <span className="px-3 py-1.5 rounded-lg bg-error/10 text-error">{overdueCount} overdue</span>
                </div>
            </header>

            <div className="glass-panel rounded-xl overflow-hidden">
                {tasks.length === 0 ? (
                    <div className="py-16 px-6 text-center">
                        <span className="material-symbols-outlined text-[42px] text-on-surface-variant/40">task_alt</span>
                        <h3 className="font-semibold text-on-surface mt-3">No tasks assigned</h3>
                        <p className="text-body-sm text-on-surface-variant mt-1">New assignments will appear here automatically.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-outline-variant/15">
                        {tasks.map((task) => {
                            const dueState = getDueState(task.Date, Number(task.Status) === 1);
                            return (
                                <button key={task.ID} type="button" onClick={() => setCurrentView('tasklist')} className="w-full text-left px-5 py-4 hover:bg-surface-container-low transition-colors grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-3 md:items-center">
                                    <div className="min-w-0">
                                        <p className="font-semibold text-on-surface truncate">{task['Content Title']}</p>
                                        <p className="text-[11px] text-on-surface-variant mt-1">{task.ID} · {task.Category}</p>
                                    </div>
                                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-semibold ${dueState.className}`}>{dueState.label}</span>
                                    <span className="material-symbols-outlined text-on-surface-variant text-[18px]">chevron_right</span>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </section>
    );
}
