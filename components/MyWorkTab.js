'use client';

import React from 'react';
import { useDashboard } from './DashboardContext';
import EmptyState from './EmptyState';
import Icon from './Icon';
import { getTaskCalculatedStatus, parseDate } from '../utils/helpers';

function getDueState(dateValue, completed) {
    if (completed) return { label: 'Completed', className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' };
    const normalizedDate = parseDate(dateValue);
    const due = new Date(`${normalizedDate}T00:00:00`);
    if (!normalizedDate || Number.isNaN(due.getTime())) {
        return { label: 'No due date', className: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border border-border' };
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = Math.round((due.getTime() - today.getTime()) / 86400000);
    if (days < 0) return { label: `${Math.abs(days)}d overdue`, className: 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20' };
    if (days === 0) return { label: 'Due today', className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20' };
    if (days <= 3) return { label: `Due in ${days}d`, className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20' };
    return { label: due.toLocaleDateString(), className: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border border-border' };
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
                    <p className="text-xs font-semibold text-primary">Personal workspace</p>
                    <h2 className="mt-1 text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Assigned tasks</h2>
                    <p className="mt-1 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">Tasks assigned to {userName || 'you'}.</p>
                </div>
                <div className="flex gap-2 text-xs" aria-label={`${openCount} open tasks and ${overdueCount} overdue tasks`}>
                    <span className="rounded-lg border border-border bg-surface px-3 py-1.5 font-medium text-zinc-700 dark:text-zinc-300">
                        <strong className="font-mono text-zinc-900 dark:text-zinc-100">{openCount}</strong> open
                    </span>
                    <span className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 font-medium text-red-600 dark:text-red-400">
                        <strong className="font-mono">{overdueCount}</strong> overdue
                    </span>
                </div>
            </header>

            <div className="sm:overflow-hidden sm:rounded-xl sm:border sm:border-border sm:bg-surface">
                {isInitialLoading ? (
                    <div className="space-y-2 sm:space-y-0" role="status" aria-label="Loading assigned tasks">
                        <span className="sr-only">Loading assigned tasks</span>
                        {[0, 1, 2].map((item) => (
                            <div key={item} aria-hidden="true" className="grid min-h-24 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 rounded-xl border border-border bg-surface px-4 py-3.5 sm:rounded-none sm:border-x-0 sm:border-t-0 sm:bg-transparent sm:px-5 sm:py-4">
                                <div className="min-w-0 space-y-2.5">
                                    <div className="h-4 w-3/4 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800 motion-reduce:animate-none" />
                                    <div className="h-3 w-2/5 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800 motion-reduce:animate-none" />
                                </div>
                                <div className="row-span-2 h-5 w-5 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800 motion-reduce:animate-none" />
                                <div className="h-6 w-20 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800 motion-reduce:animate-none" />
                            </div>
                        ))}
                    </div>
                ) : tasks.length === 0 ? (
                    <EmptyState icon="assignment" title="Your queue is clear" description="You have no assigned tasks right now. Check the Planner for upcoming work across the team." actionLabel="Open Planner" onAction={() => setCurrentView('calendar')} />
                ) : (
                    <div className="space-y-2 sm:divide-y sm:divide-border sm:space-y-0">
                        {tasks.map((task) => {
                            const dueState = getDueState(task.Date, getTaskCalculatedStatus(task) === 'Done');
                            return (
                                <button
                                    key={task.ID}
                                    type="button"
                                    onClick={() => openTask(task.ID)}
                                    aria-label={`Open task ${task['Content Title'] || task.ID}`}
                                    className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 rounded-xl border border-border bg-surface px-4 py-3.5 text-left transition-colors hover:bg-zinc-100/70 dark:hover:bg-zinc-800/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:rounded-none sm:border-0 sm:bg-transparent sm:px-5 sm:py-4 md:grid-cols-[minmax(0,1fr)_auto_auto] md:gap-3 cursor-pointer"
                                >
                                    <div className="min-w-0">
                                        <p className="line-clamp-2 text-sm font-semibold leading-snug text-zinc-900 dark:text-zinc-100 sm:truncate">
                                            {task['Content Title'] || 'Untitled task'}
                                        </p>
                                        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                                            {task.ID} &middot; {task.Category}
                                        </p>
                                    </div>
                                    <Icon name="chevron_right" size={18} className="text-zinc-400 row-span-2 md:order-3 md:row-span-1" aria-hidden="true" />
                                    <span className={`col-start-1 row-start-2 w-fit rounded-md px-2.5 py-0.5 text-[11px] font-medium font-mono md:col-start-2 md:row-start-1 ${dueState.className}`}>
                                        {dueState.label}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </section>
    );
}
