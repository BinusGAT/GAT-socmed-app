import React from 'react';
import { useDashboard } from './DashboardContext';

export default function Sidebar({ isOpen, toggleSidebar }) {
    const { currentView, setCurrentView, isUnlocked, setSelectedMeetingId } = useDashboard();

    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: 'fa-gauge-high' },
        { id: 'calendar', label: 'Calendar', icon: 'fa-calendar-days' },
        { id: 'tasklist', label: 'Task List', icon: 'fa-list-check', domId: 'navItemTasklist', restricted: true },
        { id: 'content', label: 'Content', icon: 'fa-pen-to-square', domId: 'navItemContent', restricted: true },
        { id: 'meeting', label: 'Meeting Memo', icon: 'fa-handshake', domId: 'navItemMeeting', restricted: true },
        { id: 'analytics', label: 'Analytics', icon: 'fa-chart-line' }
    ];

    const visibleItems = navItems.filter(item => !item.restricted || isUnlocked);

    const handleNavClick = (id) => {
        if (id !== 'meeting') {
            setSelectedMeetingId(null);
        }
        setCurrentView(id);
        if (window.innerWidth <= 1024) {
            toggleSidebar(); // Close sidebar on mobile after clicking
        }
    };

    return (
        <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
            <div className="sidebar-brand">
                <div className="brand-icon-wrapper">
                    <span className="brand-icon">
                        <img src="/img/android-chrome-192x192.png" alt="logo" />
                    </span>
                </div>
                <span className="brand-highlight">GAT <span className="brand-text">ContentManager</span></span>
                <button className="sidebar-close" onClick={toggleSidebar} aria-label="Close sidebar">
                    <i className="fa-solid fa-xmark"></i>
                </button>
            </div>
            
            <nav className="sidebar-nav">
                {visibleItems.map((item) => (
                    <button
                        key={item.id}
                        id={item.domId}
                        onClick={() => handleNavClick(item.id)}
                        className={`nav-item ${currentView === item.id ? 'active' : ''}`}
                        style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}
                    >
                        <span className={`nav-icon icon-${item.id}`}>
                            <i className={`fa-solid ${item.icon}`}></i>
                        </span>
                        <span className="nav-text">{item.label}</span>
                        <span className="nav-arrow"><i className="fa-solid fa-chevron-right"></i></span>
                    </button>
                ))}
            </nav>

            <div className="sidebar-footer">
                <div className="file-status">
                    <span className="status-dot"></span>
                    <span>Systems Operational</span>
                </div>
            </div>
        </aside>
    );
}
