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
            className={`fixed left-0 top-0 hidden h-full flex-col justify-between border-r border-border bg-surface py-3.5 z-30 transition-all duration-200 lg:flex ${
                sidebarCollapsed ? 'w-16 px-2' : 'w-[232px] px-3'
            }`}
        >
            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
                {/* Brand & Collapse Header */}
                {!sidebarCollapsed ? (
                    <div className="mb-4 flex items-center justify-between px-1.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 flex items-center justify-center overflow-hidden rounded-lg p-0.5 bg-surface border border-border shrink-0">
                                <img src="/apple-touch-icon.png" className="w-6 h-6 object-contain rounded" alt="Logo" />
                            </div>
                            <div className="min-w-0">
                                <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate leading-tight">
                                    {appSettingsData?.app_name || 'GAT'}
                                </h1>
                                <p className="text-[9px] text-primary tracking-wider uppercase font-semibold font-mono truncate">
                                    {appSettingsData?.app_subtitle || 'Workspace'}
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={toggleSidebar}
                            className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                            aria-label="Collapse sidebar"
                            title="Collapse sidebar"
                        >
                            <Icon name="chevron_left" size={16} />
                        </button>
                    </div>
                ) : (
                    <div className="mb-4 flex flex-col items-center gap-2">
                        <div className="w-9 h-9 flex items-center justify-center overflow-hidden rounded-lg p-1 bg-surface border border-border">
                            <img src="/apple-touch-icon.png" className="w-7 h-7 object-contain rounded" alt="Logo" />
                        </div>
                        <button
                            type="button"
                            onClick={toggleSidebar}
                            className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                            aria-label="Expand sidebar"
                            title="Expand sidebar"
                        >
                            <Icon name="chevron_right" size={16} />
                        </button>
                    </div>
                )}

                {/* + New Post Button (Admin only) */}
                {userRole === 'Admin' && (
                    <div className="mb-4">
                        {!sidebarCollapsed ? (
                            <button
                                className="w-full bg-primary hover:opacity-90 text-on-primary font-medium py-2 px-3 rounded-lg flex items-center justify-center gap-2 text-xs shadow-xs transition-opacity cursor-pointer active:scale-[0.98]"
                                onClick={handleNewPostClick}
                            >
                                <Icon name="add" size={16} weight="bold" />
                                <span>New Post</span>
                            </button>
                        ) : (
                            <div className="flex justify-center">
                                <button
                                    className="w-10 h-10 bg-primary hover:opacity-90 text-on-primary rounded-lg flex items-center justify-center shadow-xs transition-opacity cursor-pointer active:scale-[0.98]"
                                    onClick={handleNewPostClick}
                                    aria-label="New Post"
                                    title="New Post"
                                >
                                    <Icon name="add" size={18} weight="bold" />
                                    <span className="sr-only">New Post</span>
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Navigation Links */}
                <nav aria-label="Primary navigation" className="space-y-3.5">
                    {visibleGroups.map((group) => (
                        <section key={group.label} aria-labelledby={`nav-group-${group.label.toLowerCase()}`}>
                            {!sidebarCollapsed && (
                                <h2
                                    id={`nav-group-${group.label.toLowerCase()}`}
                                    className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-600 dark:text-zinc-400 font-mono"
                                >
                                    {group.label}
                                </h2>
                            )}
                            <div className="space-y-0.5">
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
                                                className={`w-10 h-10 mx-auto rounded-lg flex items-center justify-center transition-colors cursor-pointer relative ${
                                                    isActive
                                                        ? 'bg-orange-500/10 text-orange-800 dark:text-orange-400 border border-orange-500/20'
                                                        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/50'
                                                }`}
                                            >
                                                <Icon
                                                    name={item.icon}
                                                    size={18}
                                                    weight={isActive && item.fillActive ? 'fill' : 'regular'}
                                                    className={isActive ? 'text-primary' : 'text-zinc-500 dark:text-zinc-400'}
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
                                            className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer text-xs relative ${
                                                isActive
                                                    ? 'bg-orange-500/10 text-orange-800 dark:text-orange-400 font-semibold border border-orange-500/20'
                                                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/50'
                                            }`}
                                        >
                                            <Icon
                                                name={item.icon}
                                                size={18}
                                                weight={isActive && item.fillActive ? 'fill' : 'regular'}
                                                className={isActive ? 'text-primary' : 'text-zinc-500 dark:text-zinc-400'}
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
            <div className={`shrink-0 space-y-1 border-t border-border pt-3 ${sidebarCollapsed ? 'flex flex-col items-center' : 'px-1'}`}>
                {isUnlocked && canAccessView(userRole, 'settings') && (
                    sidebarCollapsed ? (
                        <button
                            className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                                currentView === 'settings'
                                    ? 'bg-orange-500/10 text-orange-800 dark:text-orange-400 border border-orange-500/20'
                                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/50'
                            }`}
                            onClick={() => handleNavClick('settings')}
                            title="Workspace Settings"
                            aria-label="Settings"
                        >
                            <Icon name="settings" size={18} weight={currentView === 'settings' ? 'fill' : 'regular'} />
                            <span className="sr-only">Settings</span>
                        </button>
                    ) : (
                        <button
                            className={`w-full text-left py-2 px-2.5 rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer text-xs ${
                                currentView === 'settings'
                                    ? 'bg-orange-500/10 text-orange-800 dark:text-orange-400 font-semibold border border-orange-500/20'
                                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/50'
                            }`}
                            onClick={() => handleNavClick('settings')}
                            title="Workspace Settings"
                        >
                            <Icon name="settings" size={18} weight={currentView === 'settings' ? 'fill' : 'regular'} />
                            <span className="font-medium">Settings</span>
                        </button>
                    )
                )}

                {sidebarCollapsed ? (
                    <button
                        className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                            isUnlocked
                                ? 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/50'
                                : 'text-zinc-400 dark:text-zinc-600 cursor-not-allowed'
                        }`}
                        onClick={handleLogoutClick}
                        disabled={!isUnlocked}
                        title={isUnlocked ? 'Lock Workspace' : 'Workspace Locked'}
                        aria-label={isUnlocked ? 'Lock Workspace' : 'Locked'}
                    >
                        <Icon name={isUnlocked ? 'lock_open' : 'lock'} size={18} />
                        <span className="sr-only">{isUnlocked ? 'Lock Workspace' : 'Locked'}</span>
                    </button>
                ) : (
                    <button
                        className={`w-full text-left py-2 px-2.5 rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer text-xs ${
                            isUnlocked
                                ? 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/50'
                                : 'text-zinc-400 dark:text-zinc-600 cursor-not-allowed'
                        }`}
                        onClick={handleLogoutClick}
                        disabled={!isUnlocked}
                        title={isUnlocked ? 'Lock Workspace' : 'Workspace Locked'}
                    >
                        <Icon name={isUnlocked ? 'lock_open' : 'lock'} size={18} />
                        <span className="font-medium">{isUnlocked ? 'Lock Workspace' : 'Locked'}</span>
                    </button>
                )}
            </div>
        </aside>
    );
}
