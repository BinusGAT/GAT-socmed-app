'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { callSheetsAPI } from '../utils/api';
import { normalizeFeedbackMessage } from '../utils/feedback';
import { 
    normalizePicName, 
    getLocalDateInputValue, 
    parseDate,
    getContentGroupKey
} from '../utils/helpers';

const DashboardContext = createContext();
const readStoredValue = (key, fallback = '') => {
    if (typeof window === 'undefined') return fallback;
    return localStorage.getItem(key) ?? fallback;
};

const cacheDataWhenIdle = (entries) => {
    if (typeof window === 'undefined') return;
    const write = () => {
        for (const [key, value] of entries) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
            } catch (error) {
                console.warn(`Unable to cache ${key} for offline use.`, error);
            }
        }
    };
    if ('requestIdleCallback' in window) {
        window.requestIdleCallback(write, { timeout: 2000 });
    } else {
        window.setTimeout(write, 0);
    }
};

export function useDashboard() {
    return useContext(DashboardContext);
}

const normalizeMeetingsList = (rawMeetings) => {
    return (rawMeetings || []).map(m => {
        const rawAttendees = m.Attendees ?? m.attendees ?? '';
        const parsedAttendees = typeof rawAttendees === 'string'
            ? rawAttendees.split(',').map(a => a.trim()).filter(Boolean)
            : (Array.isArray(rawAttendees) ? rawAttendees : []);
        return {
            id: m.ID ?? m.id ?? `MEET${Math.random().toString(36).substr(2,5)}`,
            date: m.Date ?? m.date ?? '',
            agenda: m.Agenda ?? m.agenda ?? '',
            attendees: Array.from(new Set(parsedAttendees)),
            recap: m.Recap ?? m.recap ?? '',
            videoRecap: m.VideoRecap ?? m.videoRecap ?? m.Video_Recap ?? m.Video ?? ''
        };
    });
};

export function DashboardProvider({ children }) {
    // UI States
    const [currentView, setCurrentViewState] = useState(() => {
        if (typeof window === 'undefined') return 'dashboard';
        return new URLSearchParams(window.location.search).get('view') || 'dashboard';
    });
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [userRole, setUserRole] = useState(null);
    const [userName, setUserName] = useState(null);
    const [userId, setUserId] = useState(null);
    const [isLoading, setIsLoadingState] = useState(false);
    const [loadingPhase, setLoadingPhase] = useState('idle');
    const [globalAlert, setGlobalAlert] = useState(null); // { message, type }
    const [darkMode, setDarkMode] = useState(true);
    const [isNewPostDrawerOpen, setIsNewPostDrawerOpen] = useState(false);

    // Filter States
    const [dateRange, setDateRange] = useState({ start: '', end: '', mode: 'auto' });
    const [searchQuery, setSearchQuery] = useState(() => readStoredValue('GAT_dashboard_filter_search'));
    const [mainFilterPic, setMainFilterPic] = useState(() => readStoredValue('GAT_dashboard_filter_pic'));
    const [mainFilterCategory, setMainFilterCategory] = useState(() => readStoredValue('GAT_dashboard_filter_category'));
    const [mainFilterPlatform, setMainFilterPlatform] = useState(() => readStoredValue('GAT_dashboard_filter_platform'));

    // Tasklist Filter States
    const [tasklistSearch, setTasklistSearch] = useState(() => readStoredValue('GAT_task_filter_search'));
    const [tasklistFilterPic, setTasklistFilterPic] = useState(() => readStoredValue('GAT_task_filter_pic'));
    const [tasklistFilterStatus, setTasklistFilterStatus] = useState(() => readStoredValue('GAT_task_filter_status'));
    const [connectionState, setConnectionState] = useState(() => typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'online');

    // Data States
    const [currentData, setCurrentData] = useState([]);
    const [scheduleData, setScheduleData] = useState([]);
    const [memberListData, setMemberListData] = useState([]);
    const [internListData, setInternListData] = useState([]);
    const [lecturerListData, setLecturerListData] = useState([]);
    const [draftsData, setDraftsData] = useState([]);
    const [meetingsData, setMeetingsData] = useState([]);
    const [notificationsData, setNotificationsData] = useState([]);
    const [auditLogData, setAuditLogData] = useState([]);
    const [selectedMeetingId, setSelectedMeetingId] = useState(() => {
        if (typeof window === 'undefined') return null;
        return new URLSearchParams(window.location.search).get('meeting');
    });
    const [selectedPostId, setSelectedPostId] = useState(() => {
        if (typeof window === 'undefined') return null;
        return new URLSearchParams(window.location.search).get('post');
    });
    const [selectedTaskId, setSelectedTaskId] = useState(() => {
        if (typeof window === 'undefined') return null;
        return new URLSearchParams(window.location.search).get('task');
    });
    const [gaSummaryData, setGaSummaryData] = useState({
        visitors: '± 6K',
        pageviews: '201',
        new_visits: '± 6K',
        avg_time_on_site: '00:01:24',
        engagement_rate: '48%'
    });
    const [gaItemsData, setGaItemsData] = useState([]);
    const [appSettingsData, setAppSettingsData] = useState({});
    const [platformsData, setPlatformsData] = useState([]);
    const [categoriesData, setCategoriesData] = useState([]);
    const [dashboardMetrics, setDashboardMetrics] = useState(null);
    const [hasLoadedWorkspace, setHasLoadedWorkspace] = useState(false);

    const setIsLoading = (active, phase = 'mutation') => {
        setIsLoadingState(active);
        setLoadingPhase(active ? phase : 'idle');
    };

    const setCurrentView = (nextView) => {
        if (nextView !== currentView) setCurrentViewState(nextView);
        if (typeof window === 'undefined' || !isUnlocked) return;
        const url = new URL(window.location.href);
        if (nextView === 'dashboard') url.searchParams.delete('view');
        else url.searchParams.set('view', nextView);
        if (nextView !== 'tasklist') url.searchParams.delete('task');
        if (nextView !== 'meeting') url.searchParams.delete('meeting');
        if (nextView !== 'dashboard') url.searchParams.delete('post');
        url.hash = '';
        window.history.pushState({}, '', `${url.pathname}${url.search}${url.hash}`);
    };

    // Load initial states
    useEffect(() => {
        const allowedFragments = new Set(['#main-content', '#help', '#privacy', '#terms']);
        if (window.location.hash && !allowedFragments.has(window.location.hash)) {
            const url = new URL(window.location.href);
            url.hash = '';
            window.history.replaceState({}, '', `${url.pathname}${url.search}`);
        }

        // Dark Mode
        const localDarkSetting = localStorage.getItem('darkMode');
        const savedDarkMode = localDarkSetting === null ? true : localDarkSetting === 'true';
        setDarkMode(savedDarkMode);
        if (savedDarkMode) {
            document.body.classList.add('dark-mode', 'dark');
            document.documentElement.classList.add('dark-mode', 'dark');
        } else {
            document.body.classList.remove('dark-mode', 'dark');
            document.documentElement.classList.remove('dark-mode', 'dark');
        }

        // The server-issued expiration is authoritative. Keep a 6-hour fallback
        // only for sessions created before expires_at was introduced.
        const expiresAt = parseInt(localStorage.getItem('expires_at') || '', 10);
        const unlockedAt = parseInt(localStorage.getItem('unlocked_at') || '', 10);
        const legacyExpiresAt = unlockedAt + 6 * 60 * 60 * 1000;
        const effectiveExpiresAt = Number.isFinite(expiresAt) ? expiresAt : legacyExpiresAt;
        const isSessionValid = Number.isFinite(effectiveExpiresAt) && Date.now() < effectiveExpiresAt;

        if (localStorage.getItem('cud_unlocked') === 'true' && isSessionValid) {
            setIsUnlocked(true);
            const savedRole = localStorage.getItem('user_role');
            setUserRole(savedRole);
            setUserName(localStorage.getItem('user_name'));
            setUserId(localStorage.getItem('user_id'));
        } else {
            setIsUnlocked(false);
            setUserRole(null);
            setUserName(null);
            setUserId(null);
            localStorage.removeItem('cud_unlocked');
            localStorage.removeItem('user_role');
            localStorage.removeItem('user_name');
            localStorage.removeItem('user_id');
            localStorage.removeItem('unlocked_at');
            localStorage.removeItem('expires_at');
        }

        setMemberListData([]);

        setScheduleData([]);
        setDraftsData([]);
        setMeetingsData([]);
        setCurrentData([]);

        setAppSettingsData({
            app_name: 'GAT',
            app_subtitle: 'Socmed Apps',
            app_full_name: 'Socmed Apps',
            company_name: 'GAT Internal Content Team',
            app_version: 'v0.2.0-alpha'
        });

        setPlatformsData([
            { id: 'instagram', name: 'Instagram', logo_url: '/img/icons/instagram-logo.png', color_class: 'badge-platform-instagram' },
            { id: 'tiktok', name: 'TikTok', logo_url: '/img/icons/tiktok-logo.png', color_class: 'badge-platform-tiktok' },
            { id: 'youtube', name: 'YouTube', logo_url: '/img/icons/youtube-logo.webp', color_class: 'badge-platform-youtube' }
        ]);
        setCategoriesData([
            { name: 'Article Reels', color_class: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' },
            { name: 'Story Telling', color_class: 'bg-sky-500/10 text-sky-400 border border-sky-500/20' },
            { name: 'News', color_class: 'bg-purple-500/10 text-purple-400 border border-purple-500/20' },
            { name: 'Talking Head', color_class: 'bg-pink-500/10 text-pink-400 border border-pink-500/20' },
            { name: 'Clipper', color_class: 'bg-amber-500/10 text-amber-400 border border-amber-500/20' },
            { name: 'Motion', color_class: 'bg-rose-500/10 text-rose-400 border border-rose-500/20' }
        ]);
    }, []);

    // Global listener for API authorization failures (session expired/invalid)
    useEffect(() => {
        const handleUnauthorized = () => {
            setIsUnlocked(false);
            setUserRole(null);
            setUserName(null);
            setUserId(null);
            localStorage.removeItem('cud_unlocked');
            localStorage.removeItem('user_role');
            localStorage.removeItem('user_name');
            localStorage.removeItem('user_id');
            localStorage.removeItem('unlocked_at');
            localStorage.removeItem('expires_at');
            showAlert('🔒 Session expired. Please unlock the workspace again.', 'error');
        };

        window.addEventListener('unauthorized-api-call', handleUnauthorized);
        return () => {
            window.removeEventListener('unauthorized-api-call', handleUnauthorized);
        };
    }, []);

    // Update Web Browser Document Title dynamically when appSettingsData changes
    useEffect(() => {
        if (typeof window !== 'undefined' && appSettingsData) {
            const titleToSet = appSettingsData.app_full_name || appSettingsData.app_name;
            if (titleToSet) {
                document.title = titleToSet;
            }
        }
    }, [appSettingsData]);

    // Load data from Google Sheets when unlock status changes or on view transition
    useEffect(() => {
        if (!isUnlocked) {
            // Clear all data states when locked so no data is shown
            setCurrentData([]);
            setScheduleData([]);
            setInternListData([]);
            setLecturerListData([]);
            setAuditLogData([]);
            setDraftsData([]);
            setMeetingsData([]);
            setDashboardMetrics(null);
            setHasLoadedWorkspace(false);
            return;
        }

        // Instantly populate UI from local cache
        loadOfflineData(true);

        const shouldLoadFull = currentView !== 'dashboard' && userRole !== 'Viewer';
        if (shouldLoadFull) {
            if (!hasLoadedWorkspace) {
                loadFromGoogleSheets(true, { dashboardOnly: false });
            }
        } else {
            if (!hasLoadedWorkspace) {
                loadFromGoogleSheets(true, { dashboardOnly: true });
            }
        }
    }, [isUnlocked, currentView, userRole, hasLoadedWorkspace]);

    // Periodically check if session limit has been exceeded
    useEffect(() => {
        if (!isUnlocked) return;

        const interval = setInterval(() => {
            const expiresAt = parseInt(localStorage.getItem('expires_at') || '', 10);

            if (!Number.isFinite(expiresAt) || Date.now() >= expiresAt) {
                lockWorkspace({ revokeServer: false });
                showAlert('🔒 Session expired. Workspace locked.', 'info');
            }
        }, 15000); // Check every 15 seconds

        return () => clearInterval(interval);
    }, [isUnlocked]);

    // Keep authenticated navigation shareable and compatible with browser back/forward.
    useEffect(() => {
        const handlePopState = () => {
            const params = new URLSearchParams(window.location.search);
            const nextView = params.get('view') || 'dashboard';
            setCurrentViewState(nextView);
            setSelectedTaskId(params.get('task'));
            setSelectedMeetingId(params.get('meeting'));
            setSelectedPostId(params.get('post'));
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    useEffect(() => {
        if (!isUnlocked) return;
        const url = new URL(window.location.href);
        if (currentView === 'dashboard') url.searchParams.delete('view');
        else url.searchParams.set('view', currentView);
        if (selectedTaskId) url.searchParams.set('task', selectedTaskId);
        else url.searchParams.delete('task');
        if (selectedMeetingId) url.searchParams.set('meeting', selectedMeetingId);
        else url.searchParams.delete('meeting');
        if (selectedPostId) url.searchParams.set('post', selectedPostId);
        else url.searchParams.delete('post');
        window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
    }, [currentView, selectedTaskId, selectedMeetingId, selectedPostId, isUnlocked]);

    useEffect(() => {
        localStorage.setItem('GAT_dashboard_filter_search', searchQuery);
        localStorage.setItem('GAT_dashboard_filter_pic', mainFilterPic);
        localStorage.setItem('GAT_dashboard_filter_category', mainFilterCategory);
        localStorage.setItem('GAT_dashboard_filter_platform', mainFilterPlatform);
    }, [searchQuery, mainFilterPic, mainFilterCategory, mainFilterPlatform]);

    useEffect(() => {
        localStorage.setItem('GAT_task_filter_search', tasklistSearch);
        localStorage.setItem('GAT_task_filter_pic', tasklistFilterPic);
        localStorage.setItem('GAT_task_filter_status', tasklistFilterStatus);
    }, [tasklistSearch, tasklistFilterPic, tasklistFilterStatus]);

    useEffect(() => {
        const handleOffline = () => setConnectionState('offline');
        const handleOnline = () => setConnectionState((state) => state === 'offline' ? 'stale' : state);
        window.addEventListener('offline', handleOffline);
        window.addEventListener('online', handleOnline);
        return () => {
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('online', handleOnline);
        };
    }, []);

    // Show Alert helper
    const showAlert = (message, type = 'success') => {
        setGlobalAlert({ message: normalizeFeedbackMessage(message, type), type });
        // Auto-dismiss alert after 4 seconds
        setTimeout(() => {
            setGlobalAlert(null);
        }, 4000);
    };

    // Toggle Dark Mode
    const toggleDarkMode = () => {
        // Temporarily disable CSS transitions to prevent stutter/glitching during theme swap
        document.body.classList.add('no-transition');
        
        const nextDark = !darkMode;
        setDarkMode(nextDark);
        localStorage.setItem('darkMode', String(nextDark));
        if (nextDark) {
            document.body.classList.add('dark-mode', 'dark');
            document.documentElement.classList.add('dark-mode', 'dark');
        } else {
            document.body.classList.remove('dark-mode', 'dark');
            document.documentElement.classList.remove('dark-mode', 'dark');
        }
        
        // Force layout repaint
        const _ = document.body.offsetHeight;
        
        setTimeout(() => {
            document.body.classList.remove('no-transition');
        }, 150);
    };

    // Helper to fill in empty cells from the preceding populated row (merged cells in sheet)
    // and dynamically calculate/synchronize KPI Score and KPI Summary values to prevent stale database state.
    const preprocessLaporanData = (data) => {
        if (!data || data.length === 0) return [];
        
        // Deep copy
        const list = data.map(row => ({ ...row }));
        
        let lastDate = "";
        let lastID = "";
        let lastTitle = "";
        let lastPIC = "";
        let lastCategory = "";
        const maxKpiMap = new Map();

        // Pass 1: fill in missing values, calculate KPI Score, and collect max KPI Scores
        list.forEach(row => {
            if (row.Date) {
                lastDate = row.Date;
            } else {
                row.Date = lastDate;
            }

            if (row.ID && row.ID !== lastID) {
                lastID = row.ID;
                lastTitle = row['Content Title'] || "";
                lastPIC = row.PIC || "";
                lastCategory = row.Category || "";
            } else {
                if (!row.ID) row.ID = lastID;
                if (!row['Content Title']) row['Content Title'] = lastTitle;
                if (!row.PIC) row.PIC = lastPIC;
                if (!row.Category) row.Category = lastCategory;
            }

            // Calculate KPI Score dynamically
            const viewsVal = parseInt(String(row.Views || '').replace(/[,.\s]/g, ''), 10) || 0;
            const score = (viewsVal >= 100000) ? 6 : (viewsVal >= 10000) ? 5 : (viewsVal >= 1000) ? 4 : 3;
            row['KPI Score'] = score;

            // Collect max KPI Score
            const groupKey = getContentGroupKey(row);
            if (groupKey) {
                if (!maxKpiMap.has(groupKey) || score > maxKpiMap.get(groupKey)) {
                    maxKpiMap.set(groupKey, score);
                }
            }
        });

        // Pass 2: apply the pre-calculated KPI Summary to all rows
        list.forEach(row => {
            const groupKey = getContentGroupKey(row);
            row['KPI Summary'] = groupKey ? (maxKpiMap.get(groupKey) || 3) : (parseInt(row['KPI Score']) || 3);
        });

        return list;
    };

    // Load offline datasets
    const loadOfflineData = (force = false) => {
        if (!isUnlocked && !force) return;
        const localLaporan = localStorage.getItem('laporan_data_local');
        if (localLaporan) {
            try {
                const data = JSON.parse(localLaporan);
                setCurrentData(preprocessLaporanData(data || []));
            } catch (e) {}
        }
        const localSchedule = localStorage.getItem('schedule_data_local');
        if (localSchedule) {
            try {
                const data = JSON.parse(localSchedule);
                setScheduleData(data || []);
            } catch (e) {}
        }
        // Load offline drafts and meetings caches
        const localDrafts = localStorage.getItem('GAT_storyboard_drafts');
        if (localDrafts) {
            try {
                const data = JSON.parse(localDrafts);
                setDraftsData(data || []);
            } catch (e) {}
        }
        const localMeetings = localStorage.getItem('GAT_meeting_memos');
        if (localMeetings) {
            try {
                const data = JSON.parse(localMeetings);
                const normalized = normalizeMeetingsList(data || []);
                setMeetingsData(normalized);
            } catch (e) {}
        }
        const localNotifications = localStorage.getItem('GAT_notifications');
        if (localNotifications) {
            try {
                const data = JSON.parse(localNotifications);
                setNotificationsData(data || []);
            } catch (e) {}
        }
        const localGaSummary = localStorage.getItem('GAT_ga_summary_local');
        if (localGaSummary) {
            try {
                setGaSummaryData(JSON.parse(localGaSummary));
            } catch (e) {}
        }
        const localGaItems = localStorage.getItem('GAT_ga_items_local');
        if (localGaItems) {
            try {
                setGaItemsData(JSON.parse(localGaItems));
            } catch (e) {}
        }
        const localAppSettings = localStorage.getItem('GAT_app_settings');
        if (localAppSettings) {
            try {
                setAppSettingsData(JSON.parse(localAppSettings));
            } catch (e) {}
        }
        const localPlatforms = localStorage.getItem('GAT_platforms');
        if (localPlatforms) {
            try {
                setPlatformsData(JSON.parse(localPlatforms));
            } catch (e) {}
        }
        const localCategories = localStorage.getItem('GAT_categories');
        if (localCategories) {
            try {
                setCategoriesData(JSON.parse(localCategories));
            } catch (e) {}
        }
    };

    // Load live database from Google Sheets
    const loadFromGoogleSheets = async (quiet = false, options = {}) => {
        const hasLocalData = typeof window !== 'undefined' && !!localStorage.getItem('laporan_data_local');
        const showLoading = !quiet || !hasLocalData;
        const dashboardOnly = userRole === 'Viewer'
            || (options.dashboardOnly ?? (currentView === 'dashboard' && !hasLoadedWorkspace));
        
        if (showLoading) {
            setIsLoading(true, quiet ? 'initial' : 'sync');
        }

        try {
            const result = await callSheetsAPI(dashboardOnly ? 'read_dashboard' : 'read_all');
            if (result && result.success) {
                setConnectionState('online');
                const laporan = result.laporan?.data || [];
                const schedule = result.schedule?.data || [];
                const memberList = result.memberList?.data || [];
                const internList = result.internList?.data || [];
                const lecturerList = result.lecturerList?.data || [];
                const rawScripts = result.scripts?.data || [];
                const rawMeetings = result.meetings?.data || [];
                const rawNotifications = result.notifications?.data || [];
                const rawAuditLog = result.auditLog?.data || [];

                // Normalize script drafts to expected field names
                const scripts = rawScripts.map(s => ({
                    title: s.Title ?? s.title ?? '',
                    category: s.Category || s.category || 'Story Telling',
                    status: s.Status ?? s.status ?? 'Idea',
                    origin: s.Origin ?? s.origin ?? 'legacy',
                    hook: s.Hook ?? s.hook ?? '',
                    script: s.Script ?? s.script ?? '',
                    hashtags: s.Hashtags ?? s.hashtags ?? s.Hastags ?? s.hastags ?? '',
                    caption: s.Caption ?? s.caption ?? '',
                    references: s.References ?? s.references ?? ''
                }));

                // Normalize meeting memos
                const meetings = normalizeMeetingsList(rawMeetings);

                const processedLaporan = preprocessLaporanData(laporan);
                setCurrentData(processedLaporan);
                setScheduleData(schedule);
                setMemberListData(memberList);
                setInternListData(internList);
                if (result.lecturerList) setLecturerListData(lecturerList);
                if (result.scripts) setDraftsData(scripts);
                setNotificationsData(rawNotifications);
                if (result.auditLog) setAuditLogData(rawAuditLog);
                if (result.dashboardMetrics) setDashboardMetrics(result.dashboardMetrics);

                const rawAppSettings = result.appSettings?.data || [];
                const appSettingsObj = {};
                rawAppSettings.forEach(row => {
                    appSettingsObj[row.key] = row.value;
                });
                if (!appSettingsObj.app_version || appSettingsObj.app_version === 'v0.1.0-alpha') {
                    appSettingsObj.app_version = 'v0.2.0-alpha';
                }
                const platforms = result.platforms?.data || [];
                const categories = result.categories?.data || [];

                if (Object.keys(appSettingsObj).length > 0) {
                    setAppSettingsData(appSettingsObj);
                    localStorage.setItem('GAT_app_settings', JSON.stringify(appSettingsObj));
                }
                if (platforms.length > 0) {
                    setPlatformsData(platforms);
                    localStorage.setItem('GAT_platforms', JSON.stringify(platforms));
                }
                if (categories.length > 0) {
                    setCategoriesData(categories);
                    localStorage.setItem('GAT_categories', JSON.stringify(categories));
                }
                
                if (result.meetings) {
                    setMeetingsData(meetings);
                    localStorage.setItem('GAT_meeting_memos', JSON.stringify(meetings));
                }

                const gaSummary = result.gaSummary?.data?.[0] || {
                    visitors: '± 6K',
                    pageviews: '201',
                    new_visits: '± 6K',
                    avg_time_on_site: '00:01:24',
                    engagement_rate: '48%'
                };
                const gaItems = result.gaItems?.data || [];

                if (result.gaSummary) setGaSummaryData(gaSummary);
                if (result.gaItems) setGaItemsData(gaItems);
                if (!dashboardOnly) setHasLoadedWorkspace(true);

                // Keep large JSON serialization and storage I/O off the login-critical path.
                cacheDataWhenIdle([
                    ['laporan_data_local', processedLaporan],
                    ['schedule_data_local', schedule],
                    ...(result.scripts ? [['GAT_storyboard_drafts', scripts]] : []),
                    ['GAT_notifications', rawNotifications],
                    ...(result.gaSummary ? [['GAT_ga_summary_local', gaSummary]] : []),
                    ...(result.gaItems ? [['GAT_ga_items_local', gaItems]] : [])
                ]);

                if (!quiet) showAlert('Database synchronized successfully!', 'success');
            }
        } catch (error) {
            setConnectionState(navigator.onLine ? 'stale' : 'offline');
            const isAuthError = error.message && (
                error.message.includes('Unauthorized') || 
                error.message.includes('Access token') ||
                error.message.includes('401')
            );
            if (isAuthError) {
                console.warn('⚠️ Session expired or invalid. Locking workspace.');
            } else {
                console.error('Failed to sync live data:', error);
            }
            // Load local caches
            loadOfflineData();
            if (!quiet) {
                if (error.message && error.message.includes('SHEETS_SOURCE')) {
                    showAlert('⚠️ Database URL is not configured. Running in Offline Mode (Sample Data).', 'warning');
                } else {
                    showAlert('❌ Connection error: Loaded local backup database.', 'error');
                }
            }
        } finally {
            if (showLoading) setIsLoading(false);
        }
    };

    // Check lockdown conditions
    const getLockdownTimeRemaining = () => {
        const lockUntil = Number.parseInt(localStorage.getItem('login_lock_until') || '0', 10);
        const remaining = lockUntil - Date.now();
        return remaining > 0 ? remaining : 0;
    };

    // Submit unlock credentials
    const unlockWorkspace = async (credentials, passcodeParam) => {
        if (getLockdownTimeRemaining() > 0) {
            throw new Error('System is locked down due to too many failed attempts.');
        }

        setIsLoading(true, 'authentication');
        try {
            let payload = {};
            if (typeof credentials === 'object' && credentials !== null) {
                payload = credentials;
            } else {
                payload = { role: credentials, passcode: passcodeParam };
            }

            const result = await callSheetsAPI('validate_mode', payload);
            if (result && result.valid) {
                const userRole = result.role || 'Admin';
                localStorage.removeItem('login_lock_until');
                setIsUnlocked(true);
                setUserRole(userRole);
                setUserName(result.user?.name || null);
                setUserId(result.user?.id || null);
                localStorage.setItem('cud_unlocked', 'true');
                localStorage.setItem('user_role', userRole);
                localStorage.setItem('user_name', result.user?.name || '');
                localStorage.setItem('user_id', result.user?.id || '');
                localStorage.setItem('unlocked_at', Date.now().toString());
                localStorage.setItem('expires_at', String(result.expiresAt));
                localStorage.removeItem('session_limit_hours');
                showAlert(`🔓 Workspace unlocked successfully!`, 'success');
                return true;
            } else {
                throw new Error(result?.error || 'Invalid credentials.');
            }
        } catch (error) {
            if (error.status === 429 && error.retryAfterSeconds > 0) {
                localStorage.setItem(
                    'login_lock_until',
                    String(Date.now() + error.retryAfterSeconds * 1000),
                );
            }
            console.error('Unlock error:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };
 
    // Lock Workspace
    const lockWorkspace = ({ revokeServer = true } = {}) => {
        if (revokeServer) {
            callSheetsAPI('logout').catch((error) => {
                console.error('Server logout failed:', error);
            });
        }
        setIsUnlocked(false);
        setUserRole(null);
        setUserName(null);
        setUserId(null);
        localStorage.removeItem('cud_unlocked');
        localStorage.removeItem('user_role');
        localStorage.removeItem('user_name');
        localStorage.removeItem('user_id');
        localStorage.removeItem('unlocked_at');
        localStorage.removeItem('expires_at');
        showAlert('🔒 Workspace locked. Session ended.', 'info');
    };

    // CRUD: Laporan Metrics
    const addLaporanRow = async (row) => {
        const prevData = currentData;
        const assignedIntern = internListData.find((intern) => intern.name === row.PIC);
        const newRow = { ...row, AssignedUserId: assignedIntern?.id || '' };
        
        setCurrentData((prev) => [newRow, ...prev]);
        showAlert('💾 Record added successfully!', 'success');

        (async () => {
            try {
                const result = await callSheetsAPI('create', newRow);
                if (!result || !result.success) {
                    throw new Error(result?.error || 'Failed to save record');
                }
            } catch (error) {
                setCurrentData(prevData);
                showAlert(`❌ Failed to save: ${error.message}`, 'error');
            }
        })();

        return true;
    };

    const updateLaporanRow = async (row, rowIndex) => {
        const prevData = currentData;
        const assignedIntern = internListData.find((intern) => intern.name === row.PIC);
        const payload = { ...row, rowIndex, AssignedUserId: row.AssignedUserId || assignedIntern?.id || '' };

        setCurrentData((prev) => prev.map((item, idx) => {
            const isExactMatch = (rowIndex !== undefined && rowIndex !== null && rowIndex >= 0 && idx === rowIndex) ||
                (item.ID && row.ID && String(item.ID) === String(row.ID) && String(item.Platform || '').toLowerCase() === String(row.Platform || '').toLowerCase());

            if (isExactMatch) {
                return { ...item, ...payload };
            }

            // Sibling rows belonging to the same content post ID: update shared content metadata only
            if (item.ID && row.ID && String(item.ID) === String(row.ID)) {
                return {
                    ...item,
                    Date: payload.Date,
                    'Content Title': payload['Content Title'],
                    PIC: payload.PIC,
                    Category: payload.Category,
                    AssignedUserId: payload.AssignedUserId,
                    'KPI Summary': payload['KPI Summary']
                };
            }

            return item;
        }));
        showAlert('💾 Record updated successfully!', 'success');

        (async () => {
            try {
                const result = await callSheetsAPI('update', payload);
                if (!result || !result.success) {
                    throw new Error(result?.error || 'Failed to update record');
                }
            } catch (error) {
                setCurrentData(prevData);
                showAlert(`❌ Failed to update: ${error.message}`, 'error');
            }
        })();

        return true;
    };

    const deleteLaporanRow = async (id, rowIndex) => {
        const prevData = currentData;

        setCurrentData((prev) => prev.filter((item, idx) => (id ? String(item.ID) !== String(id) : idx !== rowIndex)));
        showAlert('🗑️ Record deleted successfully!', 'success');

        (async () => {
            try {
                const result = await callSheetsAPI('delete', { id, rowIndex });
                if (!result || !result.success) {
                    throw new Error(result?.error || 'Failed to delete record');
                }
            } catch (error) {
                setCurrentData(prevData);
                showAlert(`❌ Failed to delete: ${error.message}`, 'error');
            }
        })();

        return true;
    };

    const deleteBatchLaporanRows = async (rows) => {
        const prevData = currentData;
        const idsToDelete = new Set((rows || []).map(r => r.ID || r.id).filter(Boolean).map(String));
        const indexesToDelete = new Set((rows || []).map(r => r.rowIndex).filter(i => i !== undefined));

        setCurrentData(prev => prev.filter((item, idx) => !idsToDelete.has(String(item.ID)) && !indexesToDelete.has(idx)));
        showAlert(`🗑️ Batch deleted ${rows.length} records!`, 'success');

        (async () => {
            try {
                const result = await callSheetsAPI('delete_batch', { rows });
                if (!result || !result.success) {
                    throw new Error(result?.error || 'Failed batch delete');
                }
            } catch (error) {
                setCurrentData(prevData);
                showAlert(`❌ Failed batch delete: ${error.message}`, 'error');
            }
        })();

        return true;
    };

    // CRUD: Calendar Tasks
    const saveCalendarTask = async (task) => {
        const prevSchedule = scheduleData;
        const assignedIntern = internListData.find((intern) => intern.name === (task.PIC || task.pic));
        const payload = {
            ...task,
            AssignedUserId: task.AssignedUserId || task.assignedUserId || assignedIntern?.id || ''
        };

        const normalizedTask = {
            ID: payload.ID || payload.id || `CT${Date.now()}`,
            Date: payload.Date || payload.date || '',
            PIC: payload.PIC || payload.pic || '',
            Category: payload.Category || payload.category || '',
            'Content Title': payload['Content Title'] || payload.contentTitle || '',
            Status: Boolean(payload.Status ?? payload.status),
            AssignedUserId: payload.AssignedUserId || ''
        };

        setScheduleData((prev) => {
            const exists = prev.some(t => String(t.ID) === String(normalizedTask.ID));
            return exists 
                ? prev.map(t => String(t.ID) === String(normalizedTask.ID) ? { ...t, ...normalizedTask } : t)
                : [normalizedTask, ...prev];
        });
        showAlert('💾 Task scheduled successfully!', 'success');

        (async () => {
            try {
                const result = await callSheetsAPI('save_schedule', payload);
                if (!result || !result.success) {
                    throw new Error(result?.error || 'Failed to save task');
                }
            } catch (error) {
                setScheduleData(prevSchedule);
                showAlert(`❌ Failed to save task: ${error.message}`, 'error');
            }
        })();

        return true;
    };

    const listSessions = async () => {
        const result = await callSheetsAPI('list_sessions');
        return result?.sessions || [];
    };

    const revokeSession = async (sessionId) => {
        const result = await callSheetsAPI('revoke_session', { sessionId });
        if (result?.success) {
            showAlert('Session revoked.', 'success');
            return true;
        }
        showAlert(result?.error || 'Failed to revoke session.', 'error');
        return false;
    };

    const setLecturerAttendeeVisibility = async (userId, visible) => {
        setLecturerListData((current) => current.map((lecturer) =>
            String(lecturer.id) === String(userId) ? { ...lecturer, showInAttendees: visible } : lecturer
        ));
        try {
            const result = await callSheetsAPI('set_lecturer_attendee_visibility', { userId, visible });
            if (result?.success) {
                await loadFromGoogleSheets(true);
                showAlert('Lecturer attendee visibility updated.', 'success');
                return true;
            }
        } catch (error) {
            setLecturerListData((current) => current.map((lecturer) =>
                String(lecturer.id) === String(userId) ? { ...lecturer, showInAttendees: !visible } : lecturer
            ));
            showAlert(`Failed to update lecturer visibility: ${error.message}`, 'error');
        }
        return false;
    };

    const deleteCalendarTask = async (id) => {
        const prevSchedule = scheduleData;

        setScheduleData(prev => prev.filter(t => String(t.ID) !== String(id)));
        showAlert('🗑️ Task removed from schedule!', 'success');

        (async () => {
            try {
                const result = await callSheetsAPI('delete_schedule', { ID: id });
                if (!result || !result.success) {
                    throw new Error(result?.error || 'Failed to remove task');
                }
            } catch (error) {
                setScheduleData(prevSchedule);
                showAlert(`❌ Failed to remove task: ${error.message}`, 'error');
            }
        })();

        return true;
    };

    // CRUD: Storyboard Scripts / Drafts
    const saveScriptDraft = async (draft) => {
        const prevDrafts = draftsData;
        const normalizedDraft = {
            title: draft.title ?? draft.Title ?? '',
            category: draft.category ?? draft.Category ?? 'Story Telling',
            status: draft.status ?? draft.Status ?? 'Idea',
            origin: draft.origin ?? draft.Origin ?? 'manual',
            hook: draft.hook ?? draft.Hook ?? '',
            script: draft.script ?? draft.Script ?? '',
            hashtags: draft.hashtags ?? draft.Hashtags ?? '',
            caption: draft.caption ?? draft.Caption ?? '',
            references: draft.references ?? draft.References ?? ''
        };

        setDraftsData(prev => {
            const exists = prev.some(d => (d.title || '').trim().toLowerCase() === (normalizedDraft.title || '').trim().toLowerCase());
            return exists 
                ? prev.map(d => (d.title || '').trim().toLowerCase() === (normalizedDraft.title || '').trim().toLowerCase() ? normalizedDraft : d)
                : [normalizedDraft, ...prev];
        });
        showAlert('💾 Storyboard script saved!', 'success');

        (async () => {
            try {
                const gasDraftPayload = {
                    Title: normalizedDraft.title,
                    Status: normalizedDraft.status,
                    Origin: normalizedDraft.origin,
                    Category: normalizedDraft.category,
                    Hook: normalizedDraft.hook,
                    Script: normalizedDraft.script,
                    Hashtags: normalizedDraft.hashtags,
                    Hastags: normalizedDraft.hashtags,
                    References: normalizedDraft.references,
                    Caption: normalizedDraft.caption
                };
                const result = await callSheetsAPI('save_script', gasDraftPayload);
                if (!result || !result.success) {
                    throw new Error(result?.error || 'Failed to save script');
                }
            } catch (error) {
                setDraftsData(prevDrafts);
                showAlert(`❌ Failed to save script: ${error.message}`, 'error');
            }
        })();

        return true;
    };

    const deleteScriptDraft = async (title) => {
        const prevDrafts = draftsData;

        setDraftsData(prev => prev.filter(d => (d.title || '').trim().toLowerCase() !== (title || '').trim().toLowerCase()));
        showAlert('🗑️ Script deleted successfully!', 'success');

        (async () => {
            try {
                const result = await callSheetsAPI('delete_script', { title });
                if (!result || !result.success) {
                    throw new Error(result?.error || 'Failed to delete script');
                }
            } catch (error) {
                setDraftsData(prevDrafts);
                showAlert(`❌ Failed to delete script: ${error.message}`, 'error');
            }
        })();

        return true;
    };

    // CRUD: Meeting Memos
    const saveMeetingMemo = async (memo) => {
        const prevMeetings = meetingsData;
        const normalizedMemo = {
            ...memo,
            id: memo.id || memo.ID || `MTG-${Date.now()}`
        };

        setMeetingsData(prev => {
            const exists = prev.some(m => String(m.id || m.ID) === String(normalizedMemo.id));
            return exists
                ? prev.map(m => String(m.id || m.ID) === String(normalizedMemo.id) ? { ...m, ...normalizedMemo } : m)
                : [normalizedMemo, ...prev];
        });
        showAlert('💾 Meeting memo saved successfully!', 'success');

        (async () => {
            try {
                const result = await callSheetsAPI('save_meeting', memo);
                if (!result || !result.success) {
                    throw new Error(result?.error || 'Failed to save meeting memo');
                }
            } catch (error) {
                setMeetingsData(prevMeetings);
                showAlert(`❌ Failed to save memo: ${error.message}`, 'error');
            }
        })();

        return true;
    };

    const deleteMeetingMemo = async (id) => {
        const prevMeetings = meetingsData;

        setMeetingsData(prev => prev.filter(m => String(m.id || m.ID) !== String(id)));
        showAlert('🗑️ Meeting memo deleted!', 'success');

        (async () => {
            try {
                const result = await callSheetsAPI('delete_meeting', { id });
                if (!result || !result.success) {
                    throw new Error(result?.error || 'Failed to delete meeting memo');
                }
            } catch (error) {
                setMeetingsData(prevMeetings);
                showAlert(`❌ Failed to delete memo: ${error.message}`, 'error');
            }
        })();

        return true;
    };

    const saveNotification = async (notif) => {
        const prevNotifications = notificationsData;
        const newNotif = {
            id: notif.id || `NOTIF-${Date.now()}`,
            ...notif,
            createdAt: notif.createdAt || new Date().toISOString()
        };

        setNotificationsData(prev => [newNotif, ...prev]);
        showAlert('📢 Notification broadcasted successfully!', 'success');

        (async () => {
            try {
                const result = await callSheetsAPI('save_notification', notif);
                if (!result || !result.success) {
                    throw new Error(result?.error || 'Failed to broadcast notification');
                }
            } catch (error) {
                setNotificationsData(prevNotifications);
                showAlert(`❌ Failed to send notification: ${error.message}`, 'error');
            }
        })();

        return true;
    };

    const deleteNotification = async (id) => {
        const prevNotifications = notificationsData;

        setNotificationsData(prev => prev.filter(n => String(n.id) !== String(id)));
        showAlert('🗑️ Notification removed!', 'success');

        (async () => {
            try {
                const result = await callSheetsAPI('delete_notification', { id });
                if (!result || !result.success) {
                    throw new Error(result?.error || 'Failed to delete notification');
                }
            } catch (error) {
                setNotificationsData(prevNotifications);
                showAlert(`❌ Failed to delete notification: ${error.message}`, 'error');
            }
        })();

        return true;
    };

    // CRUD: Google Analytics
    const saveGaSummary = async (summary) => {
        const prevSummary = gaSummaryData;
        setGaSummaryData(summary);
        showAlert('💾 Google Analytics summary updated!', 'success');

        (async () => {
            try {
                const result = await callSheetsAPI('save_ga_summary', summary);
                if (!result || !result.success) {
                    throw new Error(result?.error || 'Failed to update summary');
                }
            } catch (error) {
                setGaSummaryData(prevSummary);
                showAlert(`❌ Failed to update summary: ${error.message}`, 'error');
            }
        })();

        return true;
    };

    const saveGaItem = async (item) => {
        const prevItems = gaItemsData;
        setGaItemsData(prev => {
            const exists = prev.some(i => String(i.id) === String(item.id));
            return exists ? prev.map(i => String(i.id) === String(item.id) ? item : i) : [item, ...prev];
        });
        showAlert('💾 Google Analytics item saved!', 'success');

        (async () => {
            try {
                const result = await callSheetsAPI('save_ga_item', item);
                if (!result || !result.success) {
                    throw new Error(result?.error || 'Failed to save item');
                }
            } catch (error) {
                setGaItemsData(prevItems);
                showAlert(`❌ Failed to save item: ${error.message}`, 'error');
            }
        })();

        return true;
    };

    const deleteGaItem = async (id) => {
        const prevItems = gaItemsData;
        setGaItemsData(prev => prev.filter(i => String(i.id) !== String(id)));
        showAlert('🗑️ Google Analytics item deleted!', 'success');

        (async () => {
            try {
                const result = await callSheetsAPI('delete_ga_item', { id });
                if (!result || !result.success) {
                    throw new Error(result?.error || 'Failed to delete item');
                }
            } catch (error) {
                setGaItemsData(prevItems);
                showAlert(`❌ Failed to delete item: ${error.message}`, 'error');
            }
        })();

        return true;
    };

    // Settings CRUD
    const saveAppSetting = async (key, value) => {
        setIsLoading(true);
        try {
            const result = await callSheetsAPI('save_app_setting', { key, value });
            if (result && result.success) {
                await loadFromGoogleSheets(true);
                showAlert('💾 Settings updated!', 'success');
                return true;
            }
        } catch (error) {
            showAlert(`❌ Failed to save setting: ${error.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
        return false;
    };

    const saveAppSettingsBatch = async (settingsObj) => {
        setIsLoading(true);
        // Optimistic UI update
        const updatedSettings = { ...appSettingsData, ...settingsObj };
        setAppSettingsData(updatedSettings);
        try {
            localStorage.setItem('GAT_app_settings', JSON.stringify(updatedSettings));
        } catch (e) {}

        try {
            const result = await callSheetsAPI('save_app_settings', { settings: settingsObj });
            if (result && result.success) {
                showAlert('💾 Settings updated!', 'success');
                return true;
            }
        } catch (error) {
            showAlert(`❌ Failed to save settings: ${error.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
        return false;
    };

    const savePlatform = async (platform) => {
        setIsLoading(true);
        try {
            const result = await callSheetsAPI('save_platform', platform);
            if (result && result.success) {
                await loadFromGoogleSheets(true);
                showAlert('💾 Platform saved!', 'success');
                return true;
            }
        } catch (error) {
            showAlert(`❌ Failed to save platform: ${error.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
        return false;
    };

    const deletePlatform = async (id) => {
        setIsLoading(true);
        try {
            const result = await callSheetsAPI('delete_platform', { id });
            if (result && result.success) {
                await loadFromGoogleSheets(true);
                showAlert('🗑️ Platform deleted!', 'success');
                return true;
            }
        } catch (error) {
            showAlert(`❌ Failed to delete platform: ${error.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
        return false;
    };

    const saveCategory = async (category) => {
        setIsLoading(true);
        try {
            const result = await callSheetsAPI('save_category', category);
            if (result && result.success) {
                await loadFromGoogleSheets(true);
                showAlert('💾 Category saved!', 'success');
                return true;
            }
        } catch (error) {
            showAlert(`❌ Failed to save category: ${error.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
        return false;
    };

    const deleteCategory = async (name) => {
        setIsLoading(true);
        try {
            const result = await callSheetsAPI('delete_category', { name });
            if (result && result.success) {
                await loadFromGoogleSheets(true);
                showAlert('🗑️ Category deleted!', 'success');
                return true;
            }
        } catch (error) {
            showAlert(`❌ Failed to delete category: ${error.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
        return false;
    };

    const saveMember = async (oldNama, nama, stream) => {
        setIsLoading(true);
        try {
            const result = await callSheetsAPI('save_member', { oldNama, NAMA: nama, STREAM: stream });
            if (result && result.success) {
                await loadFromGoogleSheets(true);
                showAlert('💾 Member saved!', 'success');
                return true;
            }
        } catch (error) {
            showAlert(`❌ Failed to save member: ${error.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
        return false;
    };

    const deleteMember = async (nama) => {
        setIsLoading(true);
        try {
            const result = await callSheetsAPI('delete_member', { NAMA: nama });
            if (result && result.success) {
                await loadFromGoogleSheets(true);
                showAlert('🗑️ Member removed!', 'success');
                return true;
            }
        } catch (error) {
            showAlert(`❌ Failed to delete member: ${error.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
        return false;
    };

    return (
        <DashboardContext.Provider value={{
            // States
            currentView, setCurrentView,
            isUnlocked,
            userRole,
            userName,
            userId,
            isLoading, setIsLoading,
            loadingPhase,
            isInitialLoading: isLoading && loadingPhase === 'initial',
            isSyncing: isLoading && loadingPhase === 'sync',
            isMutating: isLoading && loadingPhase === 'mutation',
            globalAlert, showAlert,
            connectionState,
            darkMode, toggleDarkMode,
            selectedMeetingId, setSelectedMeetingId,
            selectedTaskId, setSelectedTaskId,
            selectedPostId, setSelectedPostId,
            isNewPostDrawerOpen, setIsNewPostDrawerOpen,

            // Filters
            dateRange, setDateRange,
            searchQuery, setSearchQuery,
            mainFilterPic, setMainFilterPic,
            mainFilterCategory, setMainFilterCategory,
            mainFilterPlatform, setMainFilterPlatform,
            
            tasklistSearch, setTasklistSearch,
            tasklistFilterPic, setTasklistFilterPic,
            tasklistFilterStatus, setTasklistFilterStatus,

            // Datasets
            currentData,
            scheduleData,
            memberListData,
            internListData,
            lecturerListData,
            draftsData,
            meetingsData,
            notificationsData,
            auditLogData,
            gaSummaryData,
            gaItemsData,
            appSettingsData,
            platformsData,
            categoriesData,
            dashboardMetrics,
            retryConnection: () => loadFromGoogleSheets(false),

            // Lockdown/Auth
            unlockWorkspace,
            lockWorkspace,
            getLockdownTimeRemaining,

            // CRUD Handlers
            addLaporanRow,
            updateLaporanRow,
            deleteLaporanRow,
            deleteBatchLaporanRows,
            saveCalendarTask,
            deleteCalendarTask,
            saveScriptDraft,
            deleteScriptDraft,
            saveMeetingMemo,
            deleteMeetingMemo,
            saveNotification,
            deleteNotification,
            saveGaSummary,
            saveGaItem,
            deleteGaItem,
            saveAppSetting,
            saveAppSettingsBatch,
            savePlatform,
            deletePlatform,
            saveCategory,
            deleteCategory,
            saveMember,
            deleteMember,
            listSessions,
            revokeSession,
            setLecturerAttendeeVisibility,
            refreshData: () => loadFromGoogleSheets(false)
        }}>
            {children}
        </DashboardContext.Provider>
    );
}
