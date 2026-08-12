'use client';

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Script from 'next/script';
import { DashboardProvider, useDashboard } from '../../components/DashboardContext';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';
import { formatDisplayDate } from '../../utils/helpers';
import LockScreen from '../../components/LockScreen';
import { BackgroundActivity, DashboardSkeleton } from '../../components/LoadingStates';
import MobileNavigation from '../../components/MobileNavigation';
import { canAccessView, getDefaultView, isKnownView } from '../../utils/rolePermissions';

const viewLoadingFallback = () => <DashboardSkeleton />;
const dynamicView = (loader) => dynamic(loader, { loading: viewLoadingFallback });
const DashboardTab = dynamicView(() => import('../../components/DashboardTab'));
const CalendarTab = dynamicView(() => import('../../components/CalendarTab'));
const TaskListTab = dynamicView(() => import('../../components/TaskListTab'));
const ContentHubTab = dynamicView(() => import('../../components/ContentHubTab'));
const MeetingsTab = dynamicView(() => import('../../components/MeetingsTab'));
const AnalyticsTab = dynamicView(() => import('../../components/AnalyticsTab'));
const WebAnalyticsTab = dynamicView(() => import('../../components/WebAnalyticsTab'));
const SettingsTab = dynamicView(() => import('../../components/SettingsTab'));
const MyWorkTab = dynamicView(() => import('../../components/MyWorkTab'));

const UnlockModal = dynamic(() => import('../../components/Modals').then((module) => module.UnlockModal));
const DateRangeModal = dynamic(() => import('../../components/Modals').then((module) => module.DateRangeModal));
const DatePickerModal = dynamic(() => import('../../components/Modals').then((module) => module.DatePickerModal));
const CalendarExportModal = dynamic(() => import('../../components/Modals').then((module) => module.CalendarExportModal));
const HelpGuideModal = dynamic(() => import('../../components/Modals').then((module) => module.HelpGuideModal));

const loadBrowserScript = (src, globalName) => {
    if (window[globalName]) return Promise.resolve(window[globalName]);
    return new Promise((resolve, reject) => {
        const existing = document.querySelector(`script[src="${src}"]`);
        const script = existing || document.createElement('script');
        script.addEventListener('load', () => resolve(window[globalName]), { once: true });
        script.addEventListener('error', () => reject(new Error(`Failed to load ${globalName}`)), { once: true });
        if (!existing) {
            script.src = src;
            script.async = true;
            document.head.appendChild(script);
        }
    });
};

function DashboardAppContent() {
    const {
        currentView,
        setCurrentView,
        isLoading,
        loadingPhase,
        isInitialLoading,
        isUnlocked,
        userRole,
        globalAlert,
        showAlert,
        connectionState,
        retryConnection,
        dateRange,
        currentData,
        setSelectedMeetingId,
        appSettingsData
    } = useDashboard();

    // Layout states
    const [isExporting, setIsExporting] = useState(false);
    const [chartReady, setChartReady] = useState(false);
    const [chartRequested, setChartRequested] = useState(false);
    const requestChart = useCallback(() => setChartRequested(true), []);

    useEffect(() => {
        if (!userRole || !isKnownView(currentView) || canAccessView(userRole, currentView)) return;
        setCurrentView(getDefaultView(userRole));
    }, [currentView, setCurrentView, userRole]);

    // Sync active view mode class and lock status to body element for CSS alignment
    useEffect(() => {
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

    const handleExportAll = async () => {
        if (isExporting) return;
        if (currentData.length === 0) {
            showAlert('No data to export', 'error');
            return;
        }

        setIsExporting(true);
        try {
            await loadBrowserScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js', 'XLSX');
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
        } finally {
            setIsExporting(false);
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
        let view = currentView;
        if (!isKnownView(view)) {
            return (
                <section className="mx-auto flex min-h-[55vh] max-w-xl flex-col items-start justify-center px-3 py-10" role="alert" aria-labelledby="invalid-view-title">
                    <span className="material-symbols-outlined mb-5 text-4xl text-on-surface-variant" aria-hidden="true">wrong_location</span>
                    <p className="text-xs font-semibold text-primary">Navigation error</p>
                    <h2 id="invalid-view-title" className="mt-2 text-headline-lg font-bold tracking-tight text-on-surface">This workspace view does not exist</h2>
                    <p className="mt-3 max-w-md text-body-md leading-relaxed text-on-surface-variant">The link may be outdated or incomplete. Return home to continue working without losing your session.</p>
                    <button type="button" onClick={() => setCurrentView(getDefaultView(userRole))} className="mt-6 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Return home</button>
                </section>
            );
        }
        if (!canAccessView(userRole, view)) {
            view = getDefaultView(userRole);
        }
        switch (view) {
            case 'dashboard':
                return <DashboardTab onOpenDatePicker={openDatePicker} chartReady={chartReady} onChartNeeded={requestChart} />;
            case 'my-work':
                return <MyWorkTab />;
            case 'calendar':
                return <CalendarTab onOpenExport={() => setCalendarExportOpen(true)} />;
            case 'tasklist':
                return <TaskListTab onOpenDatePicker={openDatePicker} />;
            case 'content':
                return <ContentHubTab />;
            case 'meeting':
                return <MeetingsTab onOpenDatePicker={openDatePicker} />;
            case 'analytics':
                return <AnalyticsTab chartReady={chartReady} />;
            case 'web-analytics':
                return <WebAnalyticsTab />;
            case 'settings':
                return <SettingsTab />;
            default:
                return <DashboardTab onOpenDatePicker={openDatePicker} chartReady={chartReady} onChartNeeded={requestChart} />;
        }
    };

    const handleMobileNavClick = (id) => {
        if (id !== 'meeting') {
            setSelectedMeetingId(null);
        }
        setCurrentView(id);
    };

    if (!isUnlocked) {
        return (
            <main id="main-content" className="flex min-h-screen w-full justify-center items-center bg-background relative overflow-hidden">
                {isLoading && (
                    <div className="fixed inset-0 bg-background/40 backdrop-blur-md flex items-center justify-center z-[9999] animate-fade-in">
                        <div className="noise-overlay"></div>
                        <div className="bg-surface-container/70 backdrop-blur-xl border border-outline-variant/30 rounded-2xl p-6 flex flex-col items-center gap-4 max-w-[280px] shadow-2xl relative">
                            <div className="relative w-12 h-12 flex items-center justify-center">
                                <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-ping"></div>
                                <div className="w-8 h-8 border-3 border-primary/10 border-t-primary rounded-full animate-spin"></div>
                            </div>
                            <span className="text-body-sm text-on-surface font-bold tracking-wide">Authenticating...</span>
                        </div>
                    </div>
                )}

                {globalAlert && (
                    <div role={globalAlert.type === 'error' ? 'alert' : 'status'} aria-live={globalAlert.type === 'error' ? 'assertive' : 'polite'} className={`fixed top-6 right-6 z-[10000] flex items-center gap-3 py-3.5 px-5 rounded-xl shadow-2xl animate-slide-in text-body-sm font-semibold border ${globalAlert.type === 'error'
                            ? 'bg-error/10 border-error/25 text-error shadow-[0_4px_20px_rgba(186,26,26,0.12)]'
                            : globalAlert.type === 'warning'
                                ? 'bg-amber-500/10 border-amber-500/25 text-amber-500 shadow-[0_4px_20px_rgba(245,158,11,0.12)]'
                                : 'bg-primary/10 border-primary/25 text-primary shadow-[0_4px_20px_rgba(16,185,129,0.12)]'
                        }`}>
                        <span className="material-symbols-outlined text-[20px]">
                            {globalAlert.type === 'error' ? 'error' : globalAlert.type === 'warning' ? 'warning' : 'check_circle'}
                        </span>
                        <span className="text-pretty">{globalAlert.message}</span>
                    </div>
                )}

                <LockScreen sectionName="Workspace" />
            </main>
        );
    }

    return (
        <div className="flex min-h-screen w-full max-w-full overflow-x-clip relative bg-background">
            {(currentView === 'analytics' || chartRequested) && (
                <Script
                    src="https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js"
                    strategy="afterInteractive"
                    onReady={() => setChartReady(true)}
                />
            )}
            {(currentView === 'analytics' || currentView === 'meeting') && (
                <Script src="https://cdn.jsdelivr.net/npm/dompurify@3.2.7/dist/purify.min.js" strategy="afterInteractive" />
            )}
            <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[120] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-on-primary focus:font-semibold">
                Skip to main content
            </a>
            {/* Sidebar navigation */}
            <Sidebar />

            {/* Main Content Area */}
            <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 flex flex-col min-h-screen lg:pl-[280px] pt-16 pb-20 lg:pb-0">
                <Topbar
                    openUnlockModal={() => setUnlockOpen(true)}
                    openDateRangeModal={() => setDateRangeOpen(true)}
                    onExport={handleExportAll}
                    isExporting={isExporting}
                    dateRangeText={getDateRangeText()}
                    openHelpModal={() => setHelpOpen(true)}
                />

                {isLoading && !isInitialLoading && loadingPhase !== 'authentication' && (
                    <BackgroundActivity kind={loadingPhase} />
                )}

                {connectionState !== 'online' && (
                    <div role="status" className="connection-banner">
                        <span className="material-symbols-outlined" aria-hidden="true">{connectionState === 'offline' ? 'cloud_off' : 'cloud_sync'}</span>
                        <span>{connectionState === 'offline' ? 'You are offline. Showing the latest saved workspace data.' : 'Workspace data may be out of date.'}</span>
                        <button type="button" onClick={retryConnection} disabled={isLoading}>Retry sync</button>
                    </div>
                )}

                {/* Global Alert Notification Banner */}
                {globalAlert && (
                    <div role={globalAlert.type === 'error' ? 'alert' : 'status'} aria-live={globalAlert.type === 'error' ? 'assertive' : 'polite'} className={`fixed top-6 right-6 z-[10000] flex items-center gap-3 py-3.5 px-5 rounded-xl shadow-2xl animate-slide-in text-body-sm font-semibold border ${globalAlert.type === 'error'
                            ? 'bg-error/10 border-error/25 text-error shadow-[0_4px_20px_rgba(186,26,26,0.12)]'
                            : globalAlert.type === 'warning'
                                ? 'bg-amber-500/10 border-amber-500/25 text-amber-500 shadow-[0_4px_20px_rgba(245,158,11,0.12)]'
                                : 'bg-primary/10 border-primary/25 text-primary shadow-[0_4px_20px_rgba(16,185,129,0.12)]'
                        }`}>
                        <span className="material-symbols-outlined text-[20px]">
                            {globalAlert.type === 'error' ? 'error' : globalAlert.type === 'warning' ? 'warning' : 'check_circle'}
                        </span>
                        <span className="text-pretty">{globalAlert.message}</span>
                    </div>
                )}

                {/* Active Tab View */}
                <div className="flex-1 p-3 sm:p-6 relative" aria-busy={isLoading ? 'true' : 'false'}>
                    {isInitialLoading && currentView !== 'my-work' ? <DashboardSkeleton /> : renderActiveTab()}
                </div>

                {/* Footer copyright */}
                <footer className="hidden w-full flex-col items-center justify-between gap-3 border-t border-outline-variant/10 bg-surface-container-lowest px-6 py-5 text-xs text-on-surface-variant sm:flex sm:flex-row">
                    <div className="flex items-center gap-2">
                        <span>&copy; {new Date().getFullYear()} {appSettingsData?.app_full_name || 'Content suite'}. All rights reserved.</span>
                        <span className="px-1.5 py-0.5 rounded bg-surface-container-high text-[9px] font-bold tracking-wider text-on-surface-variant uppercase">{appSettingsData?.app_version || 'v0.1.0-alpha'}</span>
                    </div>
                    <div className="flex items-center gap-4 font-medium">
                        <a href="#help" className="hover:text-primary transition-colors">Operations Help</a>
                        <span className="w-1 h-1 rounded-full bg-outline-variant/40"></span>
                        <a href="#privacy" className="hover:text-primary transition-colors">Privacy Policy</a>
                        <span className="w-1 h-1 rounded-full bg-outline-variant/40"></span>
                        <a href="#terms" className="hover:text-primary transition-colors">Terms of Service</a>
                    </div>
                </footer>
            </main>

            <MobileNavigation currentView={currentView} userRole={userRole} isUnlocked={isUnlocked} onNavigate={handleMobileNavClick} onOpenHelp={() => setHelpOpen(true)} />

            {/* Modals Overlays */}
            {unlockOpen && <UnlockModal isOpen onClose={() => setUnlockOpen(false)} />}
            {dateRangeOpen && <DateRangeModal
                isOpen={dateRangeOpen}
                onClose={() => setDateRangeOpen(false)}
                onOpenDatePicker={openDatePicker}
            />}
            {datePickerOpen && <DatePickerModal
                isOpen={datePickerOpen}
                onClose={() => setDatePickerOpen(false)}
                onSelect={handleDatePickerSelect}
                initialDate={datePickerInitialDate}
            />}
            {calendarExportOpen && <CalendarExportModal isOpen onClose={() => setCalendarExportOpen(false)} />}
            {helpOpen && <HelpGuideModal isOpen onClose={() => setHelpOpen(false)} />}
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
