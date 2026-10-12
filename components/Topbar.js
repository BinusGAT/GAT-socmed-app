'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useDashboard } from './DashboardContext';
import { parseDate, getPicDisplayName } from '../utils/helpers';
import Icon from './Icon';

export default function Topbar({
    openUnlockModal,
    openDateRangeModal,
    onExport,
    isExporting = false,
    dateRangeText,
    openHelpModal
}) {
    const {
        currentView,
        isUnlocked,
        userRole,
        userName,
        userId,
        lockWorkspace,
        darkMode,
        toggleDarkMode,
        refreshData,
        isSyncing,
        searchQuery,
        setSearchQuery,
        scheduleData,
        notificationsData,
        saveNotification,
        deleteNotification,
        showAlert,
        sidebarCollapsed
    } = useDashboard();

    const [profileOpen, setProfileOpen] = useState(false);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
    const [broadcastMessage, setBroadcastMessage] = useState('');
    const [broadcastRoles, setBroadcastRoles] = useState(['Admin', 'Creator', 'Viewer']);
    const [isUrgent, setIsUrgent] = useState(false);

    const handleRoleToggle = (role) => {
        if (broadcastRoles.includes(role)) {
            setBroadcastRoles(broadcastRoles.filter(r => r !== role));
        } else {
            setBroadcastRoles([...broadcastRoles, role]);
        }
    };

    const handleBroadcastSubmit = async (e) => {
        e.preventDefault();
        if (!broadcastMessage.trim()) return;
        if (broadcastRoles.length === 0) {
            showAlert('Please select at least one target role.', 'error');
            return;
        }

        const targetStr = broadcastRoles.length === 3 ? 'All' : broadcastRoles.join(',');

        const success = await saveNotification({
            message: broadcastMessage.trim(),
            targetRole: targetStr,
            isUrgent: isUrgent
        });
        if (success) {
            setBroadcastMessage('');
            setBroadcastRoles(['Admin', 'Creator', 'Viewer']);
            setIsUrgent(false);
            setIsBroadcastModalOpen(false);
        }
    };

    const getNotifications = () => {
        const list = [];

        const customNotifs = (notificationsData || [])
            .filter(n => {
                if (n.targetUserId && String(n.targetUserId) !== String(userId || '')) return false;
                if (n.targetRole === 'All') return true;
                const roles = String(n.targetRole).split(',');
                if (isUnlocked && userRole && roles.includes(userRole)) return true;
                if (isUnlocked && userRole === 'Admin') return true;
                return false;
            })
            .map(n => ({
                id: n.id,
                icon: n.isUrgent === 1 || n.isUrgent === true ? 'warning' : 'campaign',
                text: n.targetRole === 'All'
                    ? `Broadcast: "${n.message}"`
                    : `[To ${n.targetRole}] Broadcast: "${n.message}"`,
                isCustom: true,
                isUrgent: n.isUrgent === 1 || n.isUrgent === true,
                createdAt: n.createdAt
            }));
        list.push(...customNotifs);

        const today = new Date();
        const y = today.getFullYear();
        const m = String(today.getMonth() + 1).padStart(2, '0');
        const d = String(today.getDate()).padStart(2, '0');
        const todayStr = `${y}-${m}-${d}`;

        const todayTasks = (scheduleData || []).filter(item => {
            if (!item.Date) return false;
            const parsed = parseDate(item.Date);
            return parsed === todayStr;
        });

        if (todayTasks.length > 0) {
            todayTasks.forEach(task => {
                list.push({
                    id: task.ID,
                    icon: 'task_alt',
                    text: `Upload today: "${task['Content Title'] || 'Untitled'}" [${task.Platform || 'All'}] by ${getPicDisplayName(task.PIC) || 'Team'}`
                });
            });
        }

        if (list.length === 0) {
            list.push({
                id: 'no-tasks',
                icon: 'info',
                text: 'No notifications or scheduled uploads today.'
            });
        }

        return list;
    };

    const getPageTitle = () => {
        switch (currentView) {
            case 'dashboard':
                return 'Dashboard';
            case 'my-work':
                return 'My Work';
            case 'calendar':
                return 'Content Planner';
            case 'tasklist':
                return 'Task List';
            case 'content':
                return 'Posts Library';
            case 'meeting':
                return 'Meeting Memo';
            case 'analytics':
                return 'Analytics';
            case 'web-analytics':
                return 'Web Analytics';
            case 'settings':
                return 'Settings';
            default:
                return 'Dashboard';
        }
    };

    const handleAuthClick = () => {
        setProfileOpen(false);
        if (isUnlocked) {
            lockWorkspace();
        } else {
            openUnlockModal();
        }
    };

    const notificationsList = getNotifications();
    const hasUrgent = notificationsList.some(n => n.isUrgent);

    return (
        <header
            className={`fixed top-0 right-0 left-0 h-14 bg-surface/85 backdrop-blur-md border-b border-border z-30 flex items-center justify-between px-4 sm:px-6 transition-all duration-200 ${
                sidebarCollapsed ? 'lg:left-16' : 'lg:left-[232px]'
            }`}
        >
            {/* Header Left: Page Title */}
            <div className="flex items-center gap-3 min-w-0">
                <h2 className="text-sm sm:text-base font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                    {getPageTitle()}
                </h2>
            </div>

            {/* Header Right: Search, Date Filter, Notifications, Profile */}
            <div className="flex items-center gap-2 sm:gap-3">
                {/* Search (only on dashboard) */}
                {currentView === 'dashboard' && (
                    <div className="relative w-40 sm:w-60 hidden sm:block">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none flex items-center">
                            <Icon name="search" size={15} />
                        </span>
                        <input
                            type="text"
                            className="w-full h-8 pl-8 pr-3 text-xs bg-zinc-100/70 dark:bg-zinc-800/60 border border-border rounded-lg text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                            placeholder="Search posts..."
                            value={searchQuery || ''}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                )}

                {/* Date range trigger */}
                <button
                    onClick={openDateRangeModal}
                    className="h-8 px-2.5 rounded-lg border border-border bg-surface hover:bg-zinc-100/70 dark:hover:bg-zinc-800/50 text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Filter by date range"
                >
                    <Icon name="date_range" size={14} className="text-zinc-400" />
                    <span className="truncate max-w-[110px] sm:max-w-none">{dateRangeText || 'All Time'}</span>
                </button>

                {/* Notifications Bell */}
                <div className="relative">
                    <button
                        className={`h-8 w-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer relative ${
                            notificationsOpen
                                ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-white'
                                : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100/70 dark:hover:bg-zinc-800/50'
                        }`}
                        title="Notifications"
                        onClick={() => setNotificationsOpen(!notificationsOpen)}
                        aria-label="Notifications"
                    >
                        <Icon name="notifications" size={17} />
                        {hasUrgent && (
                            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
                        )}
                    </button>

                    {notificationsOpen && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setNotificationsOpen(false)} />
                            <div className="absolute right-0 mt-1.5 w-80 bg-surface border border-border rounded-lg shadow-md z-50 overflow-hidden py-1">
                                <div className="px-3.5 py-2 flex items-center justify-between border-b border-border bg-zinc-50/50 dark:bg-zinc-900/50">
                                    <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Notifications</span>
                                </div>
                                <div className="max-h-60 overflow-y-auto divide-y divide-border">
                                    {notificationsList.map((n, idx) => (
                                        <div
                                            key={n.id || idx}
                                            className={`px-3.5 py-2.5 text-xs leading-relaxed flex items-center justify-between gap-2.5 transition-colors ${
                                                n.isUrgent
                                                    ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-l-2 border-red-500 font-medium'
                                                    : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
                                            }`}
                                        >
                                            <div className="flex items-start gap-2 flex-1 min-w-0">
                                                <Icon
                                                    name={n.icon}
                                                    size={15}
                                                    className={`mt-0.5 shrink-0 ${n.isUrgent ? 'text-red-500 animate-pulse' : 'text-primary'}`}
                                                />
                                                <span className="break-words text-[11px]">{n.text}</span>
                                            </div>
                                            {n.isCustom && isUnlocked && userRole === 'Admin' && (
                                                <button
                                                    type="button"
                                                    onClick={async (e) => {
                                                        e.stopPropagation();
                                                        if (confirm('Delete this broadcast notification?')) {
                                                            await deleteNotification(n.id);
                                                        }
                                                    }}
                                                    className="text-zinc-400 hover:text-red-500 p-1 rounded cursor-pointer shrink-0"
                                                    title="Delete notification"
                                                >
                                                    <Icon name="delete" size={13} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div className="h-4 w-px bg-border" />

                {/* User Profile / Menu */}
                <div className="relative">
                    <button
                        className="flex items-center gap-2 cursor-pointer select-none p-1 rounded-lg hover:bg-zinc-100/70 dark:hover:bg-zinc-800/50 transition-colors"
                        onClick={() => setProfileOpen(!profileOpen)}
                        aria-label="User menu"
                    >
                        <div className="text-right hidden sm:block">
                            <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100 leading-tight">
                                {isUnlocked ? (userName || `${userRole} Account`) : 'Guest'}
                            </p>
                            <p className="text-[10px] text-zinc-600 dark:text-zinc-400 uppercase tracking-wider font-mono">
                                {isUnlocked ? userRole : 'Read Only'}
                            </p>
                        </div>
                        <div className="w-8 h-8 rounded-full border border-border flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                            <Icon name="account_circle" size={18} />
                        </div>
                    </button>

                    {profileOpen && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                            <div className="absolute right-0 mt-1.5 w-56 bg-surface border border-border rounded-lg shadow-md z-50 overflow-hidden py-1 text-xs">
                                <div className="px-3.5 py-2 border-b border-border bg-zinc-50/50 dark:bg-zinc-900/50 flex justify-center">
                                    <span
                                        className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider font-mono ${
                                            isUnlocked
                                                ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20'
                                                : 'bg-zinc-200/50 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border border-border'
                                        }`}
                                    >
                                        {isUnlocked ? `Role: ${userRole}` : 'Read Only'}
                                    </span>
                                </div>
                                <div className="py-1">
                                    {/* Edit Mode Toggle */}
                                    <button
                                        className="w-full text-left px-3.5 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 text-zinc-800 dark:text-zinc-200 flex items-center gap-2.5 transition-colors cursor-pointer"
                                        onClick={handleAuthClick}
                                    >
                                        <Icon name={isUnlocked ? 'lock' : 'lock_open'} size={15} className="text-primary" />
                                        <span>{isUnlocked ? 'Lock Workspace' : 'Enable Edit Mode'}</span>
                                    </button>

                                    {/* Refresh */}
                                    {isUnlocked && userRole !== 'Viewer' && (
                                        <button
                                            className="w-full text-left px-3.5 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 text-zinc-800 dark:text-zinc-200 flex items-center gap-2.5 transition-colors cursor-pointer"
                                            onClick={() => { setProfileOpen(false); refreshData(); }}
                                            disabled={isSyncing}
                                            aria-busy={isSyncing ? 'true' : 'false'}
                                        >
                                            <Icon name="sync" size={15} className={`text-primary ${isSyncing ? 'animate-spin' : ''}`} />
                                            <span>{isSyncing ? 'Syncing database…' : 'Sync Database'}</span>
                                        </button>
                                    )}

                                    {/* Export to Excel */}
                                    {isUnlocked && userRole !== 'Viewer' && (
                                        <button
                                            className="w-full text-left px-3.5 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 text-zinc-800 dark:text-zinc-200 flex items-center gap-2.5 transition-colors cursor-pointer"
                                            onClick={() => { setProfileOpen(false); onExport(); }}
                                            disabled={isExporting}
                                            aria-busy={isExporting ? 'true' : 'false'}
                                        >
                                            <Icon name={isExporting ? 'progress_activity' : 'download'} size={15} className={`text-primary ${isExporting ? 'animate-spin' : ''}`} />
                                            <span>{isExporting ? 'Exporting…' : 'Export Database'}</span>
                                        </button>
                                    )}

                                    {/* Broadcast Notification */}
                                    {isUnlocked && userRole === 'Admin' && (
                                        <button
                                            className="w-full text-left px-3.5 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 text-zinc-800 dark:text-zinc-200 flex items-center gap-2.5 transition-colors cursor-pointer"
                                            onClick={() => { setProfileOpen(false); setIsBroadcastModalOpen(true); }}
                                        >
                                            <Icon name="campaign" size={15} className="text-primary" />
                                            <span>Broadcast Notification</span>
                                        </button>
                                    )}

                                    {/* Operations Help */}
                                    {isUnlocked && (
                                        <button
                                            className="w-full text-left px-3.5 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 text-zinc-800 dark:text-zinc-200 flex items-center gap-2.5 transition-colors cursor-pointer"
                                            onClick={() => { setProfileOpen(false); openHelpModal(); }}
                                        >
                                            <Icon name="help" size={15} className="text-primary" />
                                            <span>Operations Help</span>
                                        </button>
                                    )}

                                    <div className="border-t border-border my-1" />

                                    {/* Theme Switch */}
                                    <button
                                        className="w-full text-left px-3.5 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 text-zinc-800 dark:text-zinc-200 flex items-center gap-2.5 transition-colors cursor-pointer"
                                        onClick={() => { setProfileOpen(false); toggleDarkMode(); }}
                                    >
                                        <Icon name={darkMode ? 'light_mode' : 'dark_mode'} size={15} className="text-primary" />
                                        <span>Switch Mode</span>
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Broadcast Modal */}
            {isBroadcastModalOpen && typeof window !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 backdrop-blur-xs px-4">
                    <div className="bg-surface border border-border rounded-lg max-w-md w-full overflow-hidden shadow-lg animate-scale-up">
                        <div className="px-4 py-3.5 border-b border-border flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900/50">
                            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                                <Icon name="campaign" size={18} className="text-primary" />
                                Broadcast Notification
                            </h2>
                            <button
                                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 p-1 cursor-pointer rounded"
                                onClick={() => setIsBroadcastModalOpen(false)}
                            >
                                <Icon name="close" size={16} />
                            </button>
                        </div>

                        <form onSubmit={handleBroadcastSubmit} autoComplete="off">
                            <div className="p-4 space-y-3.5 text-xs">
                                <div className="space-y-1">
                                    <label className="font-medium text-zinc-700 dark:text-zinc-300">
                                        Message <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        rows={3}
                                        className="w-full bg-zinc-50 dark:bg-zinc-900/50 border border-border rounded-md px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-primary resize-none"
                                        placeholder="Enter notification message..."
                                        required
                                        value={broadcastMessage}
                                        onChange={(e) => setBroadcastMessage(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="font-medium text-zinc-700 dark:text-zinc-300 block">
                                        Target Roles <span className="text-red-500">*</span>
                                    </label>
                                    <div className="flex flex-col gap-2 bg-zinc-50 dark:bg-zinc-900/50 border border-border rounded-md p-2.5">
                                        <label className="flex items-center gap-2 text-zinc-800 dark:text-zinc-200 cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                checked={broadcastRoles.includes('Admin')}
                                                onChange={() => handleRoleToggle('Admin')}
                                                className="w-3.5 h-3.5 rounded accent-primary cursor-pointer"
                                            />
                                            <span>Admin</span>
                                        </label>
                                        <label className="flex items-center gap-2 text-zinc-800 dark:text-zinc-200 cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                checked={broadcastRoles.includes('Creator')}
                                                onChange={() => handleRoleToggle('Creator')}
                                                className="w-3.5 h-3.5 rounded accent-primary cursor-pointer"
                                            />
                                            <span>Creator</span>
                                        </label>
                                        <label className="flex items-center gap-2 text-zinc-800 dark:text-zinc-200 cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                checked={broadcastRoles.includes('Viewer')}
                                                onChange={() => handleRoleToggle('Viewer')}
                                                className="w-3.5 h-3.5 rounded accent-primary cursor-pointer"
                                            />
                                            <span>Viewer</span>
                                        </label>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 pt-1">
                                    <input
                                        type="checkbox"
                                        id="isUrgentNotif"
                                        checked={isUrgent}
                                        onChange={(e) => setIsUrgent(e.target.checked)}
                                        className="w-3.5 h-3.5 rounded accent-red-500 cursor-pointer"
                                    />
                                    <label htmlFor="isUrgentNotif" className="font-medium text-red-500 cursor-pointer select-none flex items-center gap-1">
                                        <Icon name="warning" size={14} className="text-red-500" />
                                        Mark as Urgent
                                    </label>
                                </div>
                            </div>

                            <div className="px-4 py-3 bg-zinc-50/50 dark:bg-zinc-900/50 border-t border-border flex justify-end gap-2 text-xs">
                                <button
                                    type="button"
                                    className="border border-border text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-medium py-1.5 px-3 rounded-md transition-colors"
                                    onClick={() => setIsBroadcastModalOpen(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="bg-primary text-on-primary hover:opacity-90 font-medium py-1.5 px-3 rounded-md transition-opacity flex items-center gap-1 cursor-pointer"
                                >
                                    <Icon name="send" size={13} />
                                    <span>Broadcast</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}
        </header>
    );
}
