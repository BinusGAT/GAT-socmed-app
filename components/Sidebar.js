'use client';

import React from 'react';
import { useDashboard } from './DashboardContext';
import { canAccessView } from '../utils/rolePermissions';
import Icon from './Icon';

export default function Sidebar() {
    const {
        currentView,
        setCurrentView,
        isUnlocked,
        setSelectedMeetingId,
        setIsNewPostDrawerOpen,
        lockWorkspace,
        showAlert,
        userRole,
        appSettingsData,
        sidebarCollapsed,
        toggleSidebar
    } = useDashboard();

    const navGroups = [
        {
            label: 'Overview',
            items: [
                { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', fillActive: true },
                { id: 'my-work', label: 'My Work', icon: 'work_history', fillActive: true }
            ]
        },
        {
            label: 'Planning',
            items: [
                { id: 'calendar', label: 'Calendar', icon: 'calendar_month' },
                { id: 'tasklist', label: 'Task List', icon: 'assignment', domId: 'navItemTasklist', restricted: true }
            ]
        },
        {
            label: 'Content',
            items: [
                { id: 'content', label: 'Posts library', icon: 'folder_open', domId: 'navItemContent', restricted: true },
                { id: 'meeting', label: 'Meeting Memo', icon: 'description', domId: 'navItemMeeting', restricted: true }
            ]
        },
        {
            label: 'Insights',
            items: [
                { id: 'analytics', label: 'Analytics', icon: 'analytics', fillActive: true },
                { id: 'web-analytics', label: 'Web Analytics', icon: 'language', domId: 'navItemWebAnalytics', restricted: true }
            ]
        }
    ];

    const visibleGroups = navGroups
        .map(group => ({
            ...group,
            items: group.items.filter(item => canAccessView(userRole, item.id) && (!item.restricted || isUnlocked))
        }))
        .filter(group => group.items.length > 0);

    const handleNavClick = (id) => {
        if (id !== 'meeting') {
            setSelectedMeetingId(null);
        }
        setCurrentView(id);
    };

    const handleNewPostClick = () => {
        if (!isUnlocked) {
            showAlert('Unlock workspace to add posts', 'warning');
            return;
        }
        setCurrentView('dashboard');
        setIsNewPostDrawerOpen(true);
    };

    const handleLogoutClick = () => {
        if (isUnlocked) {
            lockWorkspace();
            showAlert('Workspace locked successfully', 'info');
        }
    };

    return (
        <aside
            className={`sticky top-0 h-screen shrink-0 hidden flex-col justify-between border-r border-border bg-surface py-3.5 2k:py-5 z-30 transition-all duration-200 lg:flex ${
                sidebarCollapsed ? 'w-16 2k:w-20 px-2' : 'w-[232px] 2k:w-[280px] px-3 2k:px-4'
            }`}
        >
            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
                {/* Brand & Collapse Header */}
                {!sidebarCollapsed ? (
                    <div className="mb-4 2k:mb-5 flex items-center justify-between px-1.5">
                        <div className="flex items-center gap-2.5 2k:gap-3 min-w-0">
                            <div className="w-8 h-8 2k:w-10 2k:h-10 flex items-center justify-center overflow-hidden rounded-lg p-0.5 bg-surface border border-border shrink-0">
                                <img src="/apple-touch-icon.png" className="w-6 h-6 2k:w-7 2k:h-7 object-contain rounded" alt="Logo" />
                            </div>
                            <div className="min-w-0">
                                <h1 className="text-sm 2k:text-base font-semibold text-zinc-900 dark:text-zinc-100 truncate leading-tight">
                                    {appSettingsData?.app_name || 'GAT'}
                                </h1>
                                <p className="text-[9px] 2k:text-xs text-primary tracking-wider uppercase font-semibold font-mono truncate">
                                    {appSettingsData?.app_subtitle || 'Workspace'}
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={toggleSidebar}
                            className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 p-1.5 2k:p-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                            aria-label="Collapse sidebar"
                            title="Collapse sidebar"
                        >
                            <Icon name="chevron_left" size={16} className="2k:scale-110" />
                        </button>
                    </div>
                ) : (
                    <div className="mb-4 2k:mb-5 flex flex-col items-center gap-2">
                        <div className="w-9 h-9 2k:w-11 2k:h-11 flex items-center justify-center overflow-hidden rounded-lg p-1 bg-surface border border-border">
                            <img src="/apple-touch-icon.png" className="w-7 h-7 2k:w-8 2k:h-8 object-contain rounded" alt="Logo" />
                        </div>
                        <button
                            type="button"
                            onClick={toggleSidebar}
                            className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 p-1.5 2k:p-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                            aria-label="Expand sidebar"
                            title="Expand sidebar"
                        >
                            <Icon name="chevron_right" size={16} className="2k:scale-110" />
                        </button>
                    </div>
                )}

                {/* + New Post Button (Admin only) */}
                {userRole === 'Admin' && (
                    <div className="mb-4 2k:mb-5">
                        {!sidebarCollapsed ? (
                            <button
                                className="w-full bg-primary hover:opacity-90 text-on-primary font-medium py-2 px-3 2k:py-2.5 2k:px-4 rounded-lg flex items-center justify-center gap-2 text-xs 2k:text-sm shadow-xs transition-opacity cursor-pointer active:scale-[0.98]"
                                onClick={handleNewPostClick}
                            >
                                <Icon name="add" size={16} weight="bold" className="2k:scale-110" />
                                <span>New Post</span>
                            </button>
                        ) : (
                            <div className="flex justify-center">
                                <button
                                    className="w-10 h-10 2k:w-12 2k:h-12 bg-primary hover:opacity-90 text-on-primary rounded-lg flex items-center justify-center shadow-xs transition-opacity cursor-pointer active:scale-[0.98]"
                                    onClick={handleNewPostClick}
                                    aria-label="New Post"
                                    title="New Post"
                                >
                                    <Icon name="add" size={18} weight="bold" className="2k:scale-110" />
                                    <span className="sr-only">New Post</span>
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Navigation Links */}
                <nav aria-label="Primary navigation" className="space-y-3.5 2k:space-y-5">
                    {visibleGroups.map((group) => (
                        <section key={group.label} aria-labelledby={`nav-group-${group.label.toLowerCase()}`}>
                            {!sidebarCollapsed && (
                                <h2
                                    id={`nav-group-${group.label.toLowerCase()}`}
                                    className="mb-1 2k:mb-1.5 px-2 text-[10px] 2k:text-xs font-semibold uppercase tracking-[0.12em] text-zinc-600 dark:text-zinc-400 font-mono"
                                >
                                    {group.label}
                                </h2>
                            )}
                            <div className="space-y-0.5 2k:space-y-1">
                                {group.items.map((item) => {
                                    const isActive = currentView === item.id;
                                    if (sidebarCollapsed) {
                                        return (
                                            <button
                                                key={item.id}
                                                id={item.domId}
                                                onClick={() => handleNavClick(item.id)}
                                                title={item.label}
                                                aria-label={item.label}
                                                className={`w-10 h-10 2k:w-12 2k:h-12 mx-auto rounded-lg flex items-center justify-center transition-colors cursor-pointer relative ${
                                                    isActive
                                                        ? 'bg-orange-500/10 text-orange-800 dark:text-orange-400 border border-orange-500/20'
                                                        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/50'
                                                }`}
                                            >
                                                <Icon
                                                    name={item.icon}
                                                    size={18}
                                                    weight={isActive && item.fillActive ? 'fill' : 'regular'}
                                                    className={isActive ? 'text-primary 2k:scale-110' : 'text-zinc-500 dark:text-zinc-400 2k:scale-110'}
                                                />
                                                <span className="sr-only">{item.label}</span>
                                            </button>
                                        );
                                    }

                                    return (
                                        <button
                                            key={item.id}
                                            id={item.domId}
                                            onClick={() => handleNavClick(item.id)}
                                            className={`w-full text-left px-2.5 py-1.5 2k:px-3 2k:py-2.5 rounded-lg flex items-center gap-2.5 2k:gap-3 transition-colors cursor-pointer text-xs 2k:text-sm relative ${
                                                isActive
                                                    ? 'bg-orange-500/10 text-orange-800 dark:text-orange-400 font-semibold border border-orange-500/20'
                                                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/50'
                                            }`}
                                        >
                                            <Icon
                                                name={item.icon}
                                                size={18}
                                                weight={isActive && item.fillActive ? 'fill' : 'regular'}
                                                className={isActive ? 'text-primary 2k:scale-110' : 'text-zinc-500 dark:text-zinc-400 2k:scale-110'}
                                            />
                                            <span className="truncate">{item.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </section>
                    ))}
                </nav>
            </div>

            {/* Footer Links */}
            <div className={`shrink-0 space-y-1 2k:space-y-1.5 border-t border-border pt-3 2k:pt-4 ${sidebarCollapsed ? 'flex flex-col items-center' : 'px-1'}`}>
                {isUnlocked && canAccessView(userRole, 'settings') && (
                    sidebarCollapsed ? (
                        <button
                            className={`w-10 h-10 2k:w-12 2k:h-12 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                                currentView === 'settings'
                                    ? 'bg-orange-500/10 text-orange-800 dark:text-orange-400 border border-orange-500/20'
                                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/50'
                            }`}
                            onClick={() => handleNavClick('settings')}
                            title="Workspace Settings"
                            aria-label="Settings"
                        >
                            <Icon name="settings" size={18} weight={currentView === 'settings' ? 'fill' : 'regular'} className="2k:scale-110" />
                            <span className="sr-only">Settings</span>
                        </button>
                    ) : (
                        <button
                            className={`w-full text-left py-2 px-2.5 2k:py-2.5 2k:px-3 rounded-lg flex items-center gap-2.5 2k:gap-3 transition-colors cursor-pointer text-xs 2k:text-sm ${
                                currentView === 'settings'
                                    ? 'bg-orange-500/10 text-orange-800 dark:text-orange-400 font-semibold border border-orange-500/20'
                                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/50'
                            }`}
                            onClick={() => handleNavClick('settings')}
                            title="Workspace Settings"
                        >
                            <Icon name="settings" size={18} weight={currentView === 'settings' ? 'fill' : 'regular'} className="2k:scale-110" />
                            <span className="font-medium">Settings</span>
                        </button>
                    )
                )}

                {sidebarCollapsed ? (
                    <button
                        className={`w-10 h-10 2k:w-12 2k:h-12 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                            isUnlocked
                                ? 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/50'
                                : 'text-zinc-400 dark:text-zinc-600 cursor-not-allowed'
                        }`}
                        onClick={handleLogoutClick}
                        disabled={!isUnlocked}
                        title={isUnlocked ? 'Lock Workspace' : 'Workspace Locked'}
                        aria-label={isUnlocked ? 'Lock Workspace' : 'Locked'}
                    >
                        <Icon name={isUnlocked ? 'lock_open' : 'lock'} size={18} className="2k:scale-110" />
                        <span className="sr-only">{isUnlocked ? 'Lock Workspace' : 'Locked'}</span>
                    </button>
                ) : (
                    <button
                        className={`w-full text-left py-2 px-2.5 2k:py-2.5 2k:px-3 rounded-lg flex items-center gap-2.5 2k:gap-3 transition-colors cursor-pointer text-xs 2k:text-sm ${
                            isUnlocked
                                ? 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/50'
                                : 'text-zinc-400 dark:text-zinc-600 cursor-not-allowed'
                        }`}
                        onClick={handleLogoutClick}
                        disabled={!isUnlocked}
                        title={isUnlocked ? 'Lock Workspace' : 'Workspace Locked'}
                    >
                        <Icon name={isUnlocked ? 'lock_open' : 'lock'} size={18} className="2k:scale-110" />
                        <span className="font-medium">{isUnlocked ? 'Lock Workspace' : 'Locked'}</span>
                    </button>
                )}
            </div>
        </aside>
    );
}
