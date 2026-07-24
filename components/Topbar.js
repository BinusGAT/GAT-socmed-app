'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useDashboard } from './DashboardContext';
import { parseDate } from '../utils/helpers';

export default function Topbar({ 
    toggleSidebar, 
    openUnlockModal, 
    openDateRangeModal, 
    onExport, 
    dateRangeText,
    openHelpModal
}) {
    const { 
        currentView, 
        isUnlocked, 
        userRole, 
        lockWorkspace, 
        darkMode, 
        toggleDarkMode, 
        refreshData,
        searchQuery,
        setSearchQuery,
        scheduleData,
        notificationsData,
        saveNotification,
        deleteNotification,
        showAlert
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

    // Helpers to generate notifications based on schedule data and custom broadcasts
    const getNotifications = () => {
        const list = [];

        // 1. Custom Broadcast notifications
        const customNotifs = (notificationsData || [])
            .filter(n => {
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

        // 2. Today's task uploads
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
                    text: `Upload today: "${task['Content Title'] || 'Untitled'}" [${task.Platform || 'All'}] by ${task.PIC || 'Team'}`
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

    return (
        <header className="fixed top-0 right-0 left-0 lg:left-[280px] h-16 bg-surface-container-lowest border-b border-outline-variant/30 dark:bg-[#0c0d10] dark:border-[#22232a] z-40 flex items-center justify-between px-container-padding">
            {/* Header Left (Menu Toggle and Title) */}
            <div className="flex items-center gap-4">
                <button 
                    onClick={toggleSidebar} 
                    id="sidebarToggle" 
                    className="block lg:hidden text-on-surface-variant hover:text-on-surface p-1.5 rounded-lg hover:bg-surface-container/60 transition-colors micro-interaction cursor-pointer" 
                    aria-label="Toggle sidebar"
                >
                    <span className="material-symbols-outlined text-[24px]">menu</span>
                </button>
                <h2 className="font-headline-md text-headline-md text-on-surface font-bold">
                    {getPageTitle()}
                </h2>
            </div>

            {/* Header Right */}
            <div className="flex items-center gap-4">
                {/* Search - only on dashboard and visible on md+ screen */}
                {currentView === 'dashboard' && (
                    <div className="relative w-48 md:w-72 hidden sm:block">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/70 flex items-center">
                            <span className="material-symbols-outlined text-[20px]">search</span>
                        </span>
                        <input 
                            type="text" 
                            className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg pl-10 pr-4 py-2 text-body-sm text-on-surface placeholder-on-surface-variant/40 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all" 
                            placeholder="Search posts..." 
                            value={searchQuery || ''}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                )}

                {/* Notifications */}
                <div className="relative">
                    <button 
                        className={`p-2 rounded-full hover:bg-surface-container transition-colors cursor-pointer relative micro-interaction ${
                            notificationsOpen ? 'text-primary' : 'text-on-surface-variant'
                        }`} 
                        title="Notifications"
                        onClick={() => setNotificationsOpen(!notificationsOpen)}
                    >
                        <span className="material-symbols-outlined text-[24px]">notifications</span>
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-500 rounded-full"></span>
                    </button>

                    {notificationsOpen && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setNotificationsOpen(false)}></div>
                            <div className="absolute right-0 mt-2 w-80 bg-surface-container border border-outline-variant/30 rounded-lg shadow-2xl z-50 overflow-hidden py-1">
                                <div className="px-4 py-2 flex items-center justify-between border-b border-outline-variant/15 bg-surface-container-lowest">
                                    <span className="text-body-sm font-bold text-on-surface">Notifications</span>
                                </div>
                                <div className="max-h-60 overflow-y-auto divide-y divide-outline-variant/10">
                                    {getNotifications().map((n, idx) => (
                                        <div key={n.id || idx} className={`px-4 py-3 text-[12px] leading-relaxed flex items-center justify-between gap-2.5 transition-colors ${
                                            n.isUrgent 
                                                ? 'bg-error-container/15 hover:bg-error-container/25 text-error border-l-4 border-error font-semibold' 
                                                : 'text-on-surface-variant/90 hover:bg-surface-container-low'
                                        }`}>
                                            <div className="flex items-start gap-2.5 flex-1 min-w-0">
                                                <span className={`material-symbols-outlined text-[16px] mt-0.5 ${n.isUrgent ? 'text-error animate-pulse' : 'text-primary'}`}>{n.icon}</span>
                                                <span className="break-words">{n.text}</span>
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
                                                    className="text-on-surface-variant/50 hover:text-error hover:scale-105 active:scale-95 transition-all p-1 rounded cursor-pointer flex items-center justify-center shrink-0"
                                                    title="Delete notification"
                                                >
                                                    <span className="material-symbols-outlined text-[14px]">delete</span>
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div className="h-8 w-px bg-outline-variant/30"></div>

                {/* User Profile / Menu */}
                <div className="relative">
                    <div 
                        className="flex items-center gap-3 cursor-pointer group micro-interaction select-none"
                        onClick={() => setProfileOpen(!profileOpen)}
                    >
                        <div className="text-right hidden md:block">
                            <p className="text-body-sm font-semibold text-on-surface group-hover:text-primary transition-colors">
                                {isUnlocked ? `${userRole} Account` : 'Guest Mode'}
                            </p>
                            <p className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">
                                 {isUnlocked 
                                     ? (userRole === 'Viewer' ? 'Viewer' : 'Staff Member') 
                                     : 'Visitor Mode'}
                            </p>
                        </div>
                        <div className="w-10 h-10 rounded-full border border-outline-variant group-hover:border-primary transition-colors flex items-center justify-center bg-surface-container-high text-on-surface-variant group-hover:text-primary">
                            <span className="material-symbols-outlined text-[24px]">account_circle</span>
                        </div>
                    </div>

                    {profileOpen && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)}></div>
                            <div className="absolute right-0 mt-2 w-56 bg-surface-container border border-outline-variant/30 rounded-lg shadow-2xl z-50 overflow-hidden py-1 font-body-sm text-body-sm">
                                <div className="px-4 py-2 border-b border-outline-variant/15 bg-surface-container-lowest flex justify-center">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                        isUnlocked ? 'bg-primary-container/20 text-primary border border-primary/25' : 'bg-error-container/25 text-error border border-error/20'
                                    }`}>
                                        {isUnlocked ? `Active: ${userRole}` : 'READ ONLY'}
                                    </span>
                                </div>
                                <div className="py-1">
                                    {/* Edit Mode Toggle */}
                                    <button 
                                        className="w-full text-left px-4 py-2.5 hover:bg-surface-container-high text-on-surface flex items-center gap-3 transition-colors cursor-pointer" 
                                        onClick={handleAuthClick}
                                    >
                                        <span className="material-symbols-outlined text-[18px] text-primary">
                                            {isUnlocked ? 'lock' : 'lock_open'}
                                        </span>
                                        <span>{isUnlocked ? 'Lock Workspace' : 'Enable Edit Mode'}</span>
                                    </button>

                                     {/* Refresh */}
                                     {isUnlocked && userRole !== 'Viewer' && (
                                         <button 
                                             className="w-full text-left px-4 py-2.5 hover:bg-surface-container-high text-on-surface flex items-center gap-3 transition-colors cursor-pointer" 
                                             onClick={() => { setProfileOpen(false); refreshData(); }}
                                         >
                                             <span className="material-symbols-outlined text-[18px] text-primary">sync</span>
                                             <span>Sync Database</span>
                                         </button>
                                     )}

                                     {/* Export to Excel */}
                                     {isUnlocked && userRole !== 'Viewer' && (
                                         <button 
                                             className="w-full text-left px-4 py-2.5 hover:bg-surface-container-high text-on-surface flex items-center gap-3 transition-colors cursor-pointer" 
                                             onClick={() => { setProfileOpen(false); onExport(); }}
                                         >
                                             <span className="material-symbols-outlined text-[18px] text-primary">download</span>
                                             <span>Export Database</span>
                                         </button>
                                     )}

                                     {/* Broadcast Notification */}
                                     {isUnlocked && userRole === 'Admin' && (
                                         <button 
                                             className="w-full text-left px-4 py-2.5 hover:bg-surface-container-high text-on-surface flex items-center gap-3 transition-colors cursor-pointer" 
                                             onClick={() => { setProfileOpen(false); setIsBroadcastModalOpen(true); }}
                                         >
                                             <span className="material-symbols-outlined text-[18px] text-primary">campaign</span>
                                             <span>Broadcast Notification</span>
                                         </button>
                                     )}

                                    {/* Date range picker trigger */}
                                    <button 
                                        className="w-full text-left px-4 py-2.5 hover:bg-surface-container-high text-on-surface flex items-center gap-3 transition-colors cursor-pointer" 
                                        onClick={() => { setProfileOpen(false); openDateRangeModal(); }}
                                    >
                                        <span className="material-symbols-outlined text-[18px] text-primary">date_range</span>
                                        <span className="truncate">Filter: {dateRangeText || 'All Time'}</span>
                                    </button>

                                    {/* Help Guide */}
                                    {isUnlocked && (
                                        <button 
                                            className="w-full text-left px-4 py-2.5 hover:bg-surface-container-high text-on-surface flex items-center gap-3 transition-colors cursor-pointer" 
                                            onClick={() => { setProfileOpen(false); openHelpModal(); }}
                                        >
                                            <span className="material-symbols-outlined text-[18px] text-primary">help</span>
                                            <span>Operations Help</span>
                                        </button>
                                    )}

                                    <div className="border-t border-outline-variant/15 my-1"></div>
                                    
                                    {/* Theme Switch */}
                                    <button 
                                        className="w-full text-left px-4 py-2.5 hover:bg-surface-container-high text-on-surface flex items-center gap-3 transition-colors cursor-pointer" 
                                        onClick={() => { setProfileOpen(false); toggleDarkMode(); }}
                                    >
                                        <span className="material-symbols-outlined text-[18px] text-primary">
                                            {darkMode ? 'light_mode' : 'dark_mode'}
                                        </span>
                                        <span>Switch Mode</span>
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
            {isBroadcastModalOpen && typeof window !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-background/60 backdrop-blur-xs px-4">
                    <div className="bg-surface-container border border-outline-variant/30 rounded-xl max-w-md w-full overflow-hidden shadow-2xl animate-scale-up">
                        <div className="px-5 py-4 border-b border-outline-variant/20 flex justify-between items-center bg-surface-container-lowest">
                            <h2 className="text-body-md font-bold text-on-surface flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary text-[22px]">campaign</span>
                                Broadcast Notification
                            </h2>
                            <button className="text-on-surface-variant hover:text-on-surface p-1 cursor-pointer" onClick={() => setIsBroadcastModalOpen(false)}>
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>
                        
                        <form onSubmit={handleBroadcastSubmit} autoComplete="off">
                            <div className="px-5 py-4 space-y-4">
                                <div className="space-y-1">
                                    <label className="text-body-sm font-semibold text-on-surface-variant">Message <span className="text-error">*</span></label>
                                    <textarea 
                                        rows={3}
                                        className="w-full bg-surface-container-low border border-outline-variant/30 rounded px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-primary resize-none" 
                                        placeholder="Enter notification message..." 
                                        required
                                        value={broadcastMessage}
                                        onChange={(e) => setBroadcastMessage(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-body-sm font-semibold text-on-surface-variant block mb-1">Target Roles <span className="text-error">*</span></label>
                                    <div className="flex flex-col gap-2.5 bg-surface-container-low border border-outline-variant/30 rounded p-3">
                                        <label className="flex items-center gap-2.5 text-body-sm text-on-surface cursor-pointer select-none">
                                            <input 
                                                type="checkbox" 
                                                checked={broadcastRoles.includes('Admin')} 
                                                onChange={() => handleRoleToggle('Admin')}
                                                className="w-4 h-4 rounded accent-primary cursor-pointer"
                                            />
                                            <span>Admin</span>
                                        </label>
                                        <label className="flex items-center gap-2.5 text-body-sm text-on-surface cursor-pointer select-none">
                                            <input 
                                                type="checkbox" 
                                                checked={broadcastRoles.includes('Creator')} 
                                                onChange={() => handleRoleToggle('Creator')}
                                                className="w-4 h-4 rounded accent-primary cursor-pointer"
                                            />
                                            <span>Creator</span>
                                        </label>
                                        <label className="flex items-center gap-2.5 text-body-sm text-on-surface cursor-pointer select-none">
                                            <input 
                                                type="checkbox" 
                                                checked={broadcastRoles.includes('Viewer')} 
                                                onChange={() => handleRoleToggle('Viewer')}
                                                className="w-4 h-4 rounded accent-primary cursor-pointer"
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
                                        className="w-4 h-4 rounded accent-error cursor-pointer"
                                    />
                                    <label htmlFor="isUrgentNotif" className="text-body-sm font-semibold text-error cursor-pointer select-none flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[16px] text-error">warning</span>
                                        Mark as Urgent (Red Scheme)
                                    </label>
                                </div>
                            </div>
                            
                            <div className="px-5 py-3 bg-surface-container-lowest border-t border-outline-variant/15 flex justify-end gap-2.5">
                                <button 
                                    type="button" 
                                    className="bg-surface-container border border-outline-variant/30 text-on-surface hover:bg-surface-container-high font-bold py-1.5 px-3 rounded text-[11px] uppercase transition-colors" 
                                    onClick={() => setIsBroadcastModalOpen(false)}
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    className="bg-primary text-on-primary hover:opacity-90 font-bold py-1.5 px-3 rounded text-[11px] uppercase transition-opacity flex items-center gap-1 cursor-pointer"
                                >
                                    <span className="material-symbols-outlined text-[15px]">send</span> Broadcast
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
