'use client';

import React, { useState } from 'react';
import { DashboardProvider, useDashboard } from '../../components/DashboardContext';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';
import { 
    UnlockModal, 
    DateRangeModal,
    DatePickerModal,
    CalendarExportModal,
    HelpGuideModal
} from '../../components/Modals';
import DashboardTab from '../../components/DashboardTab';
import CalendarTab from '../../components/CalendarTab';
import TaskListTab from '../../components/TaskListTab';
import ContentHubTab from '../../components/ContentHubTab';
import MeetingsTab from '../../components/MeetingsTab';
import AnalyticsTab from '../../components/AnalyticsTab';
import { formatDisplayDate } from '../../utils/helpers';

function DashboardAppContent() {
    const {
        currentView,
        isLoading,
        isUnlocked,
        globalAlert,
        showAlert,
        dateRange,
        currentData
    } = useDashboard();

    // Layout states
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Sync active view mode class and lock status to body element for CSS alignment
    React.useEffect(() => {
        if (typeof document === 'undefined') return;
        const classes = ['calendar-mode', 'tasklist-mode', 'meeting-mode', 'content-mode', 'analytics-mode'];
        classes.forEach(c => document.body.classList.remove(c));
        
        if (currentView === 'calendar') {
            document.body.classList.add('calendar-mode');
        } else if (currentView === 'tasklist') {
            document.body.classList.add('tasklist-mode');
        } else if (currentView === 'meeting') {
            document.body.classList.add('meeting-mode');
        } else if (currentView === 'content') {
            document.body.classList.add('content-mode');
        } else if (currentView === 'analytics') {
            document.body.classList.add('analytics-mode');
        }

        // CUD Lock Sync
        if (!isUnlocked) {
            document.body.classList.add('cud-locked');
        } else {
            document.body.classList.remove('cud-locked');
        }
    }, [currentView, isUnlocked]);

    // Modals state
    const [unlockOpen, setUnlockOpen] = useState(false);
    const [dateRangeOpen, setDateRangeOpen] = useState(false);
    const [calendarExportOpen, setCalendarExportOpen] = useState(false);
    const [helpOpen, setHelpOpen] = useState(false);
    
    // Date Picker state
    const [datePickerOpen, setDatePickerOpen] = useState(false);
    const [datePickerCallback, setDatePickerCallback] = useState(null);
    const [datePickerInitialDate, setDatePickerInitialDate] = useState('');

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };

    const openDatePicker = (callback, initialDate = '') => {
        setDatePickerCallback(() => callback);
        setDatePickerInitialDate(initialDate);
        setDatePickerOpen(true);
    };

    const handleDatePickerSelect = (dateStr) => {
        if (datePickerCallback) {
            datePickerCallback(dateStr);
        }
        setDatePickerOpen(false);
    };

    const handleExportAll = () => {
        if (currentData.length === 0) {
            showAlert('No data to export', 'error');
            return;
        }

        if (typeof window === 'undefined' || !window.XLSX) {
            showAlert('❌ Export library is loading. Please try again.', 'error');
            return;
        }

        try {
            const XLSX = window.XLSX;
            
            // Map headers to match Google Sheets format
            const headers = [
                'Date', 'ID', 'Content Title', 'PIC', 'Category', 'Platform', 
                'Views', 'Account Reach', 'Likes', 'Comments', 'Follows', 'Repost', 
                'Shares', 'Total Engagement', 'Engagement Rate (%)', 'KPI Score', 
                'KPI Summary', 'URL', 'Comment Text'
            ];

            const exportData = currentData.map(row => {
                const newRow = {};
                headers.forEach(h => {
                    newRow[h] = row[h] !== undefined ? row[h] : '';
                });
                return newRow;
            });

            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Content Performance Data');

            // Apply column widths
            const colWidths = headers.map(h => ({ wch: Math.max(h.length, 12) }));
            ws['!cols'] = colWidths;

            XLSX.writeFile(wb, `content_performance_${new Date().toISOString().slice(0, 10)}.xlsx`);
            showAlert('💾 Database exported to Excel successfully!', 'success');
        } catch (error) {
            showAlert(`❌ Export failed: ${error.message}`, 'error');
        }
    };

    // Date Range text display helper
    const getDateRangeText = () => {
        if (dateRange.mode === 'auto' || (!dateRange.start && !dateRange.end)) {
            return 'All Time';
        }
        if (dateRange.mode === 'custom') {
            return `${formatDisplayDate(dateRange.start)} - ${formatDisplayDate(dateRange.end)}`;
        }
        
        const modeLabels = {
            today: 'Today',
            yesterday: 'Yesterday',
            last7: 'Last 7 Days',
            last30: 'Last 30 Days',
            thisMonth: 'This Month',
            lastMonth: 'Last Month'
        };
        return modeLabels[dateRange.mode] || 'Filtered';
    };

    // Render active panel
    const renderActiveTab = () => {
        switch (currentView) {
            case 'dashboard':
                return <DashboardTab onOpenDatePicker={openDatePicker} />;
            case 'calendar':
                return <CalendarTab onOpenExport={() => setCalendarExportOpen(true)} />;
            case 'tasklist':
                return <TaskListTab onOpenDatePicker={openDatePicker} />;
            case 'content':
                return <ContentHubTab />;
            case 'meeting':
                return <MeetingsTab onOpenDatePicker={openDatePicker} />;
            case 'analytics':
                return <AnalyticsTab />;
            default:
                return <DashboardTab onOpenDatePicker={openDatePicker} />;
        }
    };

    return (
        <div className="app-container" style={{ display: 'flex', minHeight: '100vh', width: '100%', position: 'relative' }}>
            {/* Sidebar navigation */}
            <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
            {sidebarOpen && (
                <div className="sidebar-overlay active" onClick={toggleSidebar}></div>
            )}

            {/* Main Content Area */}
            <main className="main-content">
                <Topbar 
                    toggleSidebar={toggleSidebar} 
                    openUnlockModal={() => setUnlockOpen(true)}
                    openDateRangeModal={() => setDateRangeOpen(true)}
                    onExport={handleExportAll}
                    dateRangeText={getDateRangeText()}
                    openHelpModal={() => setHelpOpen(true)}
                />

                {/* Global loading spinner overlay */}
                {isLoading && (
                    <div className="loading-overlay" id="loadingOverlay" style={{ display: 'flex' }}>
                        <div className="loading-card">
                            <div className="loading-spinner"></div>
                            <span id="loadingMessage">Syncing with Database...</span>
                        </div>
                    </div>
                )}

                {/* Global Alert Notification Banner */}
                {globalAlert && (
                    <div className={`alert-banner alert-${globalAlert.type}`} style={{
                        position: 'fixed',
                        top: '24px',
                        right: '24px',
                        zIndex: 9999,
                        padding: '12px 20px',
                        borderRadius: 'var(--radius-md)',
                        boxShadow: 'var(--shadow-lg)',
                        animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        fontWeight: 500,
                        fontSize: '13px'
                    }}>
                        {globalAlert.type === 'error' ? (
                            <i className="fa-solid fa-circle-xmark" style={{ fontSize: '16px' }}></i>
                        ) : globalAlert.type === 'warning' ? (
                            <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: '16px' }}></i>
                        ) : globalAlert.type === 'info' ? (
                            <i className="fa-solid fa-circle-info" style={{ fontSize: '16px' }}></i>
                        ) : (
                            <i className="fa-solid fa-circle-check" style={{ fontSize: '16px' }}></i>
                        )}
                        <span>{globalAlert.message}</span>
                    </div>
                )}

                {renderActiveTab()}

                {/* Footer copyright */}
                <footer className="footer" style={{ padding: '16px 20px', borderTop: '1px solid var(--hairline)', background: 'var(--canvas)', fontSize: '11px', color: 'var(--ink-muted)', textAlign: 'center', marginTop: 'auto' }}>
                    <div>&copy; {new Date().getFullYear()} GAT ContentManager. All rights reserved.</div>
                </footer>
            </main>

            {/* Modals Overlays */}
            <UnlockModal isOpen={unlockOpen} onClose={() => setUnlockOpen(false)} />
            <DateRangeModal 
                isOpen={dateRangeOpen} 
                onClose={() => setDateRangeOpen(false)} 
                onOpenDatePicker={openDatePicker}
            />
            <DatePickerModal 
                isOpen={datePickerOpen} 
                onClose={() => setDatePickerOpen(false)} 
                onSelect={handleDatePickerSelect}
                initialDate={datePickerInitialDate}
            />
            <CalendarExportModal isOpen={calendarExportOpen} onClose={() => setCalendarExportOpen(false)} />
            <HelpGuideModal isOpen={helpOpen} onClose={() => setHelpOpen(false)} />
        </div>
    );
}

export default function Page() {
    return (
        <DashboardProvider>
            <DashboardAppContent />
        </DashboardProvider>
    );
}
