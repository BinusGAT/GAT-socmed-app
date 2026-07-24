'use client';

import React from 'react';
import { useDashboard } from './DashboardContext';

export default function Sidebar({ isOpen, toggleSidebar }) {
    const { 
        currentView, 
        setCurrentView, 
        isUnlocked, 
        setSelectedMeetingId,
        setIsNewPostDrawerOpen,
        lockWorkspace,
        showAlert,
        userRole,
        appSettingsData
    } = useDashboard();

    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', fillActive: true },
        { id: 'calendar', label: 'Calendar', icon: 'calendar_month' },
        { id: 'tasklist', label: 'Task List', icon: 'assignment', domId: 'navItemTasklist', restricted: true },
        { id: 'content', label: 'Posts library', icon: 'folder_open', domId: 'navItemContent', restricted: true },
        { id: 'meeting', label: 'Meeting Memo', icon: 'description', domId: 'navItemMeeting', restricted: true },
        { id: 'analytics', label: 'Analytics', icon: 'analytics', fillActive: true },
        { id: 'web-analytics', label: 'Web Analytics', icon: 'language', domId: 'navItemWebAnalytics', restricted: true }
    ];

    const visibleItems = navItems.filter(item => {
        if (userRole === 'Viewer') {
            return item.id === 'dashboard' || item.id === 'analytics' || item.id === 'web-analytics';
        }
        return !item.restricted || isUnlocked;
    });

    const handleNavClick = (id) => {
        if (id !== 'meeting') {
            setSelectedMeetingId(null);
        }
        setCurrentView(id);
        if (window.innerWidth <= 1024) {
            toggleSidebar();
        }
    };

    const handleNewPostClick = () => {
        if (!isUnlocked) {
            showAlert('🔒 Unlock workspace to add posts', 'warning');
            return;
        }
        setCurrentView('dashboard');
        setIsNewPostDrawerOpen(true);
        if (window.innerWidth <= 1024) {
            toggleSidebar();
        }
    };

    const handleLogoutClick = () => {
        if (isUnlocked) {
            lockWorkspace();
            showAlert('🔒 Workspace locked successfully', 'info');
        }
    };

    return (
        <aside className={`fixed left-0 top-0 h-full w-[280px] bg-surface-container-lowest border-r border-outline-variant/30 dark:bg-[#0c0d10] dark:border-[#22232a] flex flex-col justify-between py-stack-lg z-50 transition-transform duration-300 ${
            isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}>
            <div>
                {/* Brand */}
                <div className="px-container-padding mb-stack-lg flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 flex items-center justify-center overflow-hidden rounded-xl p-1 bg-surface-container-low border border-outline-variant/30">
                            <img src="/apple-touch-icon.png" className="w-8 h-8 object-contain rounded-md" alt="Logo" />
                        </div>
                        <div>
                            <h1 className="font-display-lg text-headline-sm font-bold text-on-surface leading-tight text-pretty">{appSettingsData?.app_name || 'Content'}</h1>
                            <p className="text-[9px] text-primary tracking-widest uppercase font-bold font-mono">{appSettingsData?.app_subtitle || 'Workspace'}</p>
                        </div>
                    </div>
                    {/* Close button on mobile */}
                    <button className="lg:hidden text-on-surface-variant hover:text-on-surface p-1.5 rounded-lg hover:bg-surface-container micro-interaction cursor-pointer" onClick={toggleSidebar} aria-label="Close sidebar">
                        <span className="material-symbols-outlined text-[22px]">close</span>
                    </button>
                </div>

                {/* + New Post Button */}
                {userRole === 'Admin' && (
                    <div className="px-4 mb-5">
                        <button 
                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 shadow-xs transition-all duration-150 cursor-pointer text-sm" 
                            onClick={handleNewPostClick}
                        >
                            <span className="material-symbols-outlined text-[18px]">add</span>
                            <span>New Post</span>
                        </button>
                    </div>
                )}
                
                {/* Navigation Links */}
                <nav className="px-3 space-y-1">
                    {visibleItems.map((item) => {
                        const isActive = currentView === item.id;
                        return (
                            <button
                                key={item.id}
                                id={item.domId}
                                onClick={() => handleNavClick(item.id)}
                                className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 transition-all duration-150 cursor-pointer relative group text-sm ${
                                    isActive 
                                        ? 'bg-zinc-100 text-zinc-900 font-semibold shadow-xs border border-zinc-200 dark:bg-zinc-800/90 dark:text-white dark:border-zinc-700/50' 
                                        : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/40 dark:hover:text-zinc-200'
                                }`}
                            >
                                <span className="material-symbols-outlined text-[19px] transition-transform duration-150 text-zinc-500 group-hover:text-zinc-900 dark:text-zinc-400 dark:group-hover:text-zinc-200" style={isActive ? { color: '#6366f1', fontVariationSettings: item.fillActive ? "'FILL' 1" : undefined } : undefined}>
                                    {item.icon}
                                </span>
                                <span>{item.label}</span>
                            </button>
                        );
                    })}
                </nav>
            </div>

            {/* Footer Links */}
            <div className="border-t border-outline-variant/20 pt-stack-md mx-container-padding space-y-1">
                {userRole === 'Admin' && isUnlocked && (
                    <button 
                        className={`w-full text-left py-2.5 px-3 rounded-lg flex items-center gap-3 transition-all duration-200 cursor-pointer ${
                            currentView === 'settings'
                                ? 'bg-surface-container-highest/60 text-primary font-semibold font-display-sm' 
                                : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface hover:translate-x-0.5'
                        }`} 
                        onClick={() => handleNavClick('settings')}
                        title="Workspace Settings"
                    >
                        <span className="material-symbols-outlined text-[20px]" style={currentView === 'settings' ? { fontVariationSettings: "'FILL' 1" } : undefined}>
                            settings
                        </span>
                        <span className="text-body-sm font-medium">Settings</span>
                    </button>
                )}
                <button 
                    className={`w-full text-left py-2.5 px-3 rounded-lg flex items-center gap-3 transition-all duration-200 cursor-pointer ${
                        isUnlocked 
                            ? 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface hover:translate-x-0.5' 
                            : 'text-on-surface-variant/40 cursor-not-allowed'
                    }`} 
                    onClick={handleLogoutClick} 
                    disabled={!isUnlocked} 
                    title={isUnlocked ? "Lock Workspace" : "Workspace Locked"}
                >
                    <span className="material-symbols-outlined text-[20px]">
                        {isUnlocked ? 'lock_open' : 'lock'}
                    </span>
                    <span className="text-body-sm font-medium">{isUnlocked ? 'Lock Workspace' : 'Locked'}</span>
                </button>
            </div>
        </aside>
    );
}
