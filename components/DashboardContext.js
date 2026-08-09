'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { callSheetsAPI } from '../utils/api';
import { normalizeFeedbackMessage } from '../utils/feedback';
import { 
    normalizePicName, 
    getLocalDateInputValue, 
    parseDate 
} from '../utils/helpers';

const DashboardContext = createContext();

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
    const [currentView, setCurrentView] = useState('dashboard');
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [userRole, setUserRole] = useState(null);
    const [userName, setUserName] = useState(null);
    const [userId, setUserId] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [globalAlert, setGlobalAlert] = useState(null); // { message, type }
    const [darkMode, setDarkMode] = useState(true);
    const [isNewPostDrawerOpen, setIsNewPostDrawerOpen] = useState(false);

    // Filter States
    const [dateRange, setDateRange] = useState({ start: '', end: '', mode: 'auto' });
    const [searchQuery, setSearchQuery] = useState('');
    const [mainFilterPic, setMainFilterPic] = useState('');
    const [mainFilterCategory, setMainFilterCategory] = useState('');
    const [mainFilterPlatform, setMainFilterPlatform] = useState('');

    // Tasklist Filter States
    const [tasklistSearch, setTasklistSearch] = useState('');
    const [tasklistFilterPic, setTasklistFilterPic] = useState('');
    const [tasklistFilterStatus, setTasklistFilterStatus] = useState('');

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
    const [selectedMeetingId, setSelectedMeetingId] = useState(null);
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

    // Load initial states
    useEffect(() => {
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

    // Load data from Google Sheets when unlock status changes
    useEffect(() => {
        if (isUnlocked) {
            // Load local storage cache instantly to populate UI
            loadOfflineData(true);
            // Sync database from server in the background
            loadFromGoogleSheets(true);
        } else {
            // Clear all data states when locked so no data is shown
            setCurrentData([]);
            setScheduleData([]);
            setInternListData([]);
            setLecturerListData([]);
            setAuditLogData([]);
            setDraftsData([]);
            setMeetingsData([]);
        }
    }, [isUnlocked]);

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

    // Reset Task List filters whenever the view changes
    useEffect(() => {
        setTasklistSearch('');
        setTasklistFilterPic('');
        setTasklistFilterStatus('');
    }, [currentView]);

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
            const titleKey = String(row['Content Title'] || '').trim().toLowerCase();
            if (titleKey) {
                if (!maxKpiMap.has(titleKey) || score > maxKpiMap.get(titleKey)) {
                    maxKpiMap.set(titleKey, score);
                }
            }
        });

        // Pass 2: apply the pre-calculated KPI Summary to all rows
        list.forEach(row => {
            const titleKey = String(row['Content Title'] || '').trim().toLowerCase();
            row['KPI Summary'] = titleKey ? (maxKpiMap.get(titleKey) || 3) : (parseInt(row['KPI Score']) || 3);
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
    const loadFromGoogleSheets = async (quiet = false) => {
        const hasLocalData = typeof window !== 'undefined' && !!localStorage.getItem('laporan_data_local');
        const showLoading = !quiet || !hasLocalData;
        
        if (showLoading) {
            setIsLoading(true);
        }

        try {
            const result = await callSheetsAPI('read_all');
            if (result && result.success) {
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
                setLecturerListData(lecturerList);
                setDraftsData(scripts);
                setNotificationsData(rawNotifications);
                setAuditLogData(rawAuditLog);

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
                
                setMeetingsData(meetings);
                localStorage.setItem('GAT_meeting_memos', JSON.stringify(meetings));

                const gaSummary = result.gaSummary?.data?.[0] || {
                    visitors: '± 6K',
                    pageviews: '201',
                    new_visits: '± 6K',
                    avg_time_on_site: '00:01:24',
                    engagement_rate: '48%'
                };
                const gaItems = result.gaItems?.data || [];

                setGaSummaryData(gaSummary);
                setGaItemsData(gaItems);

                // Cache locally
                localStorage.setItem('laporan_data_local', JSON.stringify(processedLaporan));
                localStorage.setItem('schedule_data_local', JSON.stringify(schedule));
                localStorage.setItem('GAT_storyboard_drafts', JSON.stringify(scripts));
                localStorage.setItem('GAT_notifications', JSON.stringify(rawNotifications));
                localStorage.setItem('GAT_ga_summary_local', JSON.stringify(gaSummary));
                localStorage.setItem('GAT_ga_items_local', JSON.stringify(gaItems));

                if (!quiet) showAlert('Database synchronized successfully!', 'success');
            }
        } catch (error) {
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
            setIsLoading(false);
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

        setIsLoading(true);
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
        setIsLoading(true);
        try {
            const assignedIntern = internListData.find((intern) => intern.name === row.PIC);
            const result = await callSheetsAPI('create', { ...row, AssignedUserId: assignedIntern?.id || '' });
            if (result && result.success) {
                await loadFromGoogleSheets(true);
                showAlert('💾 Record added successfully!', 'success');
                return true;
            }
        } catch (error) {
            showAlert(`❌ Failed to save: ${error.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
        return false;
    };

    const updateLaporanRow = async (row, rowIndex) => {
        setIsLoading(true);
        try {
            const assignedIntern = internListData.find((intern) => intern.name === row.PIC);
            const payload = { ...row, rowIndex, AssignedUserId: row.AssignedUserId || assignedIntern?.id || '' };
            const result = await callSheetsAPI('update', payload);
            if (result && result.success) {
                await loadFromGoogleSheets(true);
                showAlert('💾 Record updated successfully!', 'success');
                return true;
            }
        } catch (error) {
            showAlert(`❌ Failed to update: ${error.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
        return false;
    };

    const deleteLaporanRow = async (id, rowIndex) => {
        setIsLoading(true);
        try {
            const result = await callSheetsAPI('delete', { id, rowIndex });
            if (result && result.success) {
                await loadFromGoogleSheets(true);
                showAlert('🗑️ Record deleted successfully!', 'success');
                return true;
            }
        } catch (error) {
            showAlert(`❌ Failed to delete: ${error.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
        return false;
    };

    const deleteBatchLaporanRows = async (rows) => {
        setIsLoading(true);
        try {
            const result = await callSheetsAPI('delete_batch', { rows });
            if (result && result.success) {
                await loadFromGoogleSheets(true);
                showAlert(`🗑️ Batch deleted ${rows.length} records!`, 'success');
                return true;
            }
        } catch (error) {
            showAlert(`❌ Failed batch delete: ${error.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
        return false;
    };

    // CRUD: Calendar Tasks
    const saveCalendarTask = async (task) => {
        setIsLoading(true);
        try {
            const assignedIntern = internListData.find((intern) => intern.name === (task.PIC || task.pic));
            const payload = {
                ...task,
                AssignedUserId: task.AssignedUserId || task.assignedUserId || assignedIntern?.id || ''
            };
            const result = await callSheetsAPI('save_schedule', payload);
            if (result && result.success) {
                await loadFromGoogleSheets(true);
                showAlert('💾 Task scheduled successfully!', 'success');
                return true;
            }
        } catch (error) {
            showAlert(`❌ Failed to save task: ${error.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
        return false;
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
        setIsLoading(true);
        try {
            const result = await callSheetsAPI('delete_schedule', { ID: id });
            if (result && result.success) {
                await loadFromGoogleSheets(true);
                showAlert('🗑️ Task removed from schedule!', 'success');
                return true;
            }
        } catch (error) {
            showAlert(`❌ Failed to remove task: ${error.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
        return false;
    };

    // CRUD: Storyboard Scripts / Drafts
    const saveScriptDraft = async (draft) => {
        setIsLoading(true);
        try {
            // Map to capitalized and alternative keys for Apps Script compatibility
            const gasDraftPayload = {
                Title: draft.title ?? draft.Title ?? '',
                Status: draft.status ?? draft.Status ?? 'Idea',
                Origin: draft.origin ?? draft.Origin ?? 'manual',
                Category: draft.category ?? draft.Category ?? '',
                Hook: draft.hook ?? draft.Hook ?? '',
                Script: draft.script ?? draft.Script ?? '',
                Hashtags: draft.hashtags ?? draft.Hashtags ?? '',
                Hastags: draft.hashtags ?? draft.Hashtags ?? draft.Hastags ?? '',
                References: draft.references ?? draft.References ?? '',
                Caption: draft.caption ?? draft.Caption ?? ''
            };
            const result = await callSheetsAPI('save_script', gasDraftPayload);
            if (result && result.success) {
                await loadFromGoogleSheets(true);
                showAlert('💾 Storyboard script saved!', 'success');
                return true;
            }
        } catch (error) {
            showAlert(`❌ Failed to save script: ${error.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
        return false;
    };

    const deleteScriptDraft = async (title) => {
        setIsLoading(true);
        try {
            const result = await callSheetsAPI('delete_script', { title });
            if (result && result.success) {
                await loadFromGoogleSheets(true);
                showAlert('🗑️ Script deleted successfully!', 'success');
                return true;
            }
        } catch (error) {
            showAlert(`❌ Failed to delete script: ${error.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
        return false;
    };

    // CRUD: Meeting Memos
    const saveMeetingMemo = async (memo) => {
        setIsLoading(true);
        try {
            const result = await callSheetsAPI('save_meeting', memo);
            if (result && result.success) {
                await loadFromGoogleSheets(true);
                showAlert('💾 Meeting memo saved successfully!', 'success');
                return true;
            }
        } catch (error) {
            showAlert(`❌ Failed to save memo: ${error.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
        return false;
    };

    const deleteMeetingMemo = async (id) => {
        setIsLoading(true);
        try {
            const result = await callSheetsAPI('delete_meeting', { id });
            if (result && result.success) {
                await loadFromGoogleSheets(true);
                showAlert('🗑️ Meeting memo deleted!', 'success');
                return true;
            }
        } catch (error) {
            showAlert(`❌ Failed to delete memo: ${error.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
        return false;
    };

    const saveNotification = async (notif) => {
        setIsLoading(true);
        try {
            const result = await callSheetsAPI('save_notification', notif);
            if (result && result.success) {
                await loadFromGoogleSheets(true);
                showAlert('📢 Notification broadcasted successfully!', 'success');
                return true;
            }
        } catch (error) {
            showAlert(`❌ Failed to send notification: ${error.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
        return false;
    };

    const deleteNotification = async (id) => {
        setIsLoading(true);
        try {
            const result = await callSheetsAPI('delete_notification', { id });
            if (result && result.success) {
                await loadFromGoogleSheets(true);
                showAlert('🗑️ Notification removed!', 'success');
                return true;
            }
        } catch (error) {
            showAlert(`❌ Failed to delete notification: ${error.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
        return false;
    };

    // CRUD: Google Analytics
    const saveGaSummary = async (summary) => {
        setIsLoading(true);
        try {
            const result = await callSheetsAPI('save_ga_summary', summary);
            if (result && result.success) {
                await loadFromGoogleSheets(true);
                showAlert('💾 Google Analytics summary updated!', 'success');
                return true;
            }
        } catch (error) {
            showAlert(`❌ Failed to update summary: ${error.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
        return false;
    };

    const saveGaItem = async (item) => {
        setIsLoading(true);
        try {
            const result = await callSheetsAPI('save_ga_item', item);
            if (result && result.success) {
                await loadFromGoogleSheets(true);
                showAlert('💾 Google Analytics item saved!', 'success');
                return true;
            }
        } catch (error) {
            showAlert(`❌ Failed to save item: ${error.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
        return false;
    };

    const deleteGaItem = async (id) => {
        setIsLoading(true);
        try {
            const result = await callSheetsAPI('delete_ga_item', { id });
            if (result && result.success) {
                await loadFromGoogleSheets(true);
                showAlert('🗑️ Google Analytics item deleted!', 'success');
                return true;
            }
        } catch (error) {
            showAlert(`❌ Failed to delete item: ${error.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
        return false;
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
            globalAlert, showAlert,
            darkMode, toggleDarkMode,
            selectedMeetingId, setSelectedMeetingId,
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
