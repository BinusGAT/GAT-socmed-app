import React from 'react';
import { useDashboard } from './DashboardContext';

export default function Topbar({ 
    toggleSidebar, 
    openUnlockModal, 
    openDbSettingsModal,
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
        refreshData 
    } = useDashboard();

    const getPageTitle = () => {
        switch (currentView) {
            case 'dashboard':
                return <><i className="fa-solid fa-gauge-high"></i> Dashboard</>;
            case 'calendar':
                return <><i className="fa-solid fa-calendar-days"></i> Calendar</>;
            case 'tasklist':
                return <><i className="fa-solid fa-list-check"></i> Task List</>;
            case 'content':
                return <><i className="fa-solid fa-pen-to-square"></i> Content Hub</>;
            case 'meeting':
                return <><i className="fa-solid fa-handshake"></i> Meeting Memos</>;
            case 'analytics':
                return <><i className="fa-solid fa-chart-line"></i> Analytics</>;
            default:
                return <><i className="fa-solid fa-gauge-high"></i> Dashboard</>;
        }
    };

    const handleAuthClick = () => {
        if (isUnlocked) {
            lockWorkspace();
        } else {
            openUnlockModal();
        }
    };

    return (
        <header className="topbar">
            <div className="topbar-left">
                <button onClick={toggleSidebar} id="sidebarToggle" className="sidebar-toggle" aria-label="Toggle sidebar">
                    <i className="fa-solid fa-bars"></i>
                </button>
                <h1 id="pageTitle">{getPageTitle()}</h1>
            </div>
            <div className="topbar-right">
                <div className="action-group">
                    {/* Unlock / Lock Toggle */}
                    <button 
                        className="btn btn-outline" 
                        id="authBtn" 
                        onClick={handleAuthClick}
                        title={isUnlocked ? `Lock Workspace (${userRole})` : "Workspace is locked. Enter PIN below."}
                        disabled={!isUnlocked}
                        style={!isUnlocked ? { cursor: 'default', opacity: 0.8 } : undefined}
                    >
                        <span className="btn-icon">
                            <i className={`fa-solid ${isUnlocked ? 'fa-lock-open text-success' : 'fa-lock text-danger'}`}></i>
                        </span>
                    </button>

                    {/* Dark/Light Mode */}
                    <button 
                        className="btn btn-outline" 
                        id="themeToggleBtn" 
                        onClick={toggleDarkMode}
                        title="Toggle dark mode"
                    >
                        <span className="btn-icon">
                            <i className={`fa-solid ${darkMode ? 'fa-sun' : 'fa-moon'}`}></i>
                        </span>
                    </button>

                    {/* Help & Operations Guide */}
                    {isUnlocked && (
                        <button 
                            className="btn btn-outline" 
                            id="helpGuideBtn" 
                            onClick={openHelpModal}
                            title="Help & Operations Guide"
                        >
                            <span className="btn-icon">
                                <i className="fa-solid fa-circle-question"></i>
                            </span>
                        </button>
                    )}

                    {/* Date Range Picker */}
                    <button 
                        className="btn btn-outline" 
                        id="dateRangeBtn" 
                        onClick={openDateRangeModal}
                        title="Select Date Range"
                    >
                        <span className="btn-icon"><i className="fa-solid fa-calendar-week"></i></span>
                        <span className="btn-text" id="dateRangeBtnText">{dateRangeText || 'All Time'}</span>
                        <i className="fa-solid fa-caret-down" style={{ fontSize: '10px', marginLeft: '4px' }}></i>
                    </button>

                    {/* Refresh Data */}
                    <button 
                        className="btn btn-outline" 
                        id="refreshBtn" 
                        onClick={refreshData} 
                        title="Reload data"
                    >
                        <span className="btn-icon"><i className="fa-solid fa-arrows-rotate"></i></span>
                        <span className="btn-text">Refresh</span>
                    </button>

                    {/* Export */}
                    <button 
                        className="btn btn-success" 
                        id="exportToExcelBtn" 
                        onClick={onExport} 
                        title="Export to Excel"
                    >
                        <span className="btn-icon"><i className="fa-solid fa-file-export"></i></span>
                        <span className="btn-text">Export</span>
                    </button>
                </div>
            </div>
        </header>
    );
}
