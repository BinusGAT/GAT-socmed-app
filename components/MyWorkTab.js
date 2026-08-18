'use client';

import React from 'react';
import { useDashboard } from './DashboardContext';
import EmptyState from './EmptyState';
import { getTaskCalculatedStatus, parseDate } from '../utils/helpers';

function getDueState(dateValue, completed) {
    if (completed) return { label: 'Completed', className: 'bg-emerald-500/10 text-emerald-500' };
    const normalizedDate = parseDate(dateValue);
    const due = new Date(`${normalizedDate}T00:00:00`);
    if (!normalizedDate || Number.isNaN(due.getTime())) {
        return { label: 'No due date', className: 'bg-surface-container-high text-on-surface-variant' };
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = Math.round((due.getTime() - today.getTime()) / 86400000);
    if (days < 0) return { label: `${Math.abs(days)}d overdue`, className: 'bg-error/10 text-error' };
    if (days === 0) return { label: 'Due today', className: 'bg-amber-500/10 text-amber-500' };
    if (days <= 3) return { label: `Due in ${days}d`, className: 'bg-amber-500/10 text-amber-500' };
    return { label: due.toLocaleDateString(), className: 'bg-surface-container-high text-on-surface-variant' };
}

export default function MyWorkTab() {
    const { scheduleData, userId, userName, isInitialLoading, setCurrentView, setSelectedTaskId } = useDashboard();

    const openTask = (taskId) => {
        setSelectedTaskId(taskId);
        setCurrentView('tasklist');
    };
    const normalizedUserName = String(userName || '').trim().toLowerCase();
    const userFirstName = normalizedUserName.split(/\s+/)[0];
    const tasks = (scheduleData || [])
        .filter((task) => {
            if (String(task.AssignedUserId || '') === String(userId || '')) return true;
            if (task.AssignedUserId || !task.PIC || !normalizedUserName) return false;
            const normalizedPic = String(task.PIC).trim().toLowerCase();
            return normalizedPic === normalizedUserName || normalizedPic.split(/\s+/)[0] === userFirstName;
        })
        .sort((a, b) => String(a.Date || '').localeCompare(String(b.Date || '')));
    const taskStatuses = tasks.map((task) => getTaskCalculatedStatus(task));
    const openCount = taskStatuses.filter((status) => status !== 'Done').length;
    const overdueCount = taskStatuses.filter((status) => status === 'Overdue').length;

    return (
        <section className="mx-auto max-w-6xl space-y-4 sm:space-y-6">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
                <div>
                    <p className="text-xs font-semibold text-primary sm:text-body-sm">Personal workspace</p>
                    <h2 className="mt-1 text-headline-md font-bold tracking-tight text-on-surface">Assigned tasks</h2>
                    <p className="mt-1 text-body-sm text-on-surface-variant">Tasks assigned to {userName || 'you'}.</p>
                </div>
                <div className="flex gap-2 text-xs sm:text-body-sm" aria-label={`${openCount} open tasks and ${overdueCount} overdue tasks`}>
                    <span className="rounded-lg bg-surface-container-high px-3 py-2 font-semibold text-on-surface-variant"><strong className="font-tabular text-on-surface">{openCount}</strong> open</span>
                    <span className="rounded-lg bg-error/10 px-3 py-2 font-semibold text-error"><strong className="font-tabular">{overdueCount}</strong> overdue</span>
                </div>
            </header>

            <div className="sm:overflow-hidden sm:rounded-xl sm:border sm:border-outline-variant/25 sm:bg-surface-container-low">
                {isInitialLoading ? (
                    <div className="space-y-2 sm:space-y-0" role="status" aria-label="Loading assigned tasks">
                        <span className="sr-only">Loading assigned tasks</span>
                        {[0, 1, 2].map((item) => (
                            <div key={item} aria-hidden="true" className="grid min-h-24 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 rounded-xl border border-outline-variant/20 bg-surface-container px-4 py-3.5 sm:rounded-none sm:border-x-0 sm:border-t-0 sm:bg-transparent sm:px-5 sm:py-4">
                                <div className="min-w-0 space-y-2.5">
                                    <div className="h-4 w-3/4 animate-pulse rounded bg-surface-container-highest motion-reduce:animate-none" />
                                    <div className="h-3 w-2/5 animate-pulse rounded bg-surface-container-high motion-reduce:animate-none" />
                                </div>
                                <div className="row-span-2 h-5 w-5 animate-pulse rounded bg-surface-container-high motion-reduce:animate-none" />
                                <div className="h-6 w-20 animate-pulse rounded-md bg-surface-container-high motion-reduce:animate-none" />
                            </div>
                        ))}
                    </div>
                ) : tasks.length === 0 ? (
                    <EmptyState icon="assignment" title="Your queue is clear" description="You have no assigned tasks right now. Check the Planner for upcoming work across the team." actionLabel="Open Planner" onAction={() => setCurrentView('calendar')} />
                ) : (
                    <div className="space-y-2 sm:divide-y sm:divide-outline-variant/15 sm:space-y-0">
                        {tasks.map((task) => {
                            const dueState = getDueState(task.Date, getTaskCalculatedStatus(task) === 'Done');
                            return (
                                <button key={task.ID} type="button" onClick={() => openTask(task.ID)} aria-label={`Open task ${task['Content Title'] || task.ID}`} className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 rounded-xl border border-outline-variant/25 bg-surface-container px-4 py-3.5 text-left transition-colors hover:bg-surface-container-high focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:rounded-none sm:border-0 sm:bg-transparent sm:px-5 sm:py-4 md:grid-cols-[minmax(0,1fr)_auto_auto] md:gap-3">
                                    <div className="min-w-0">
                                        <p className="line-clamp-2 text-body-md font-semibold leading-snug text-on-surface sm:truncate">{task['Content Title'] || 'Untitled task'}</p>
                                        <p className="mt-1 text-xs text-on-surface-variant">{task.ID} · {task.Category}</p>
                                    </div>
                                    <span className="material-symbols-outlined row-span-2 text-[22px] text-on-surface-variant md:order-3 md:row-span-1" aria-hidden="true">chevron_right</span>
                                    <span className={`col-start-1 row-start-2 w-fit rounded-md px-2.5 py-1 text-[11px] font-semibold md:col-start-2 md:row-start-1 ${dueState.className}`}>{dueState.label}</span>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </section>
    );
}
