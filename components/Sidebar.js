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
        <aside className={`fixed left-0 top-0 h-full w-[280px] bg-gradient-to-b from-surface-container-lowest to-surface-container-low/80 border-r border-outline-variant/30 flex flex-col justify-between py-stack-lg z-50 transition-transform duration-300 ${
            isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}>
            <div>
                {/* Brand */}
                <div className="px-container-padding mb-stack-lg flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 flex items-center justify-center overflow-hidden rounded-xl p-1 bg-surface-container-low ring-1 ring-primary/10 shadow-sm shadow-primary/5">
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
                    <div className="px-container-padding mb-stack-lg">
                        <button 
                            className="w-full bg-primary text-on-primary font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-primary/10 hover:shadow-primary/20 hover:scale-[1.01] active:scale-[0.98] transition-all duration-200 shimmer-button cursor-pointer" 
                            onClick={handleNewPostClick}
                        >
                            <span className="material-symbols-outlined text-[20px]">add</span>
                            <span className="text-body-sm font-medium">New Post</span>
                        </button>
                    </div>
                )}
                
                {/* Navigation Links */}
                <nav className="space-y-1">
                    {visibleItems.map((item) => {
                        const isActive = currentView === item.id;
                        return (
                            <button
                                key={item.id}
                                id={item.domId}
                                onClick={() => handleNavClick(item.id)}
                                className={`w-full text-left px-container-padding py-3 flex items-center gap-3 transition-all duration-200 cursor-pointer relative group ${
                                    isActive 
                                        ? 'bg-surface-container-highest/60 text-primary font-semibold' 
                                        : 'text-on-surface-variant hover:bg-surface-container/50 hover:text-on-surface'
                                }`}
                            >
                                {isActive && <div className="active-nav-indicator" />}
                                <span className="material-symbols-outlined text-[20px] transition-transform duration-200 group-hover:scale-105 group-hover:translate-x-0.5" style={isActive && item.fillActive ? { fontVariationSettings: "'FILL' 1" } : undefined}>
                                    {item.icon}
                                </span>
                                <span className="text-body-sm font-medium">{item.label}</span>
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
