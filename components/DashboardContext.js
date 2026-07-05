'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { callSheetsAPI, setSessionToken, getSessionToken } from '../utils/api';
import { 
    normalizePicName, 
    getLocalDateInputValue, 
    parseDate 
} from '../utils/helpers';

const DashboardContext = createContext();

export function useDashboard() {
    return useContext(DashboardContext);
}

export function DashboardProvider({ children }) {
    // UI States
    const [currentView, setCurrentView] = useState('dashboard');
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [userRole, setUserRole] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [globalAlert, setGlobalAlert] = useState(null); // { message, type }
    const [darkMode, setDarkMode] = useState(false);

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
    const [draftsData, setDraftsData] = useState([]);
    const [meetingsData, setMeetingsData] = useState([]);
    const [selectedMeetingId, setSelectedMeetingId] = useState(null);

    // Lockdown settings
    const MAX_ATTEMPTS = 5;
    const LOCKDOWN_DURATION = 6 * 60 * 60 * 1000; // 6 hours

    // Load initial states
    useEffect(() => {
        // Dark Mode
        const savedDarkMode = localStorage.getItem('darkMode') === 'true';
        setDarkMode(savedDarkMode);
        if (savedDarkMode) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }

        // CUD Unlock: Lock on page refresh for maximum security (token is in-memory)
        sessionStorage.removeItem('cud_unlocked');
        sessionStorage.removeItem('user_role');
        setIsUnlocked(false);
        setUserRole(null);

        // Load Offline Member Defaults
        setMemberListData([
            { NAMA: 'Kelvin', STREAM: 'Product Manager' },
            { NAMA: 'Felix', STREAM: 'Content Creator' },
            { NAMA: 'Eduard', STREAM: 'Content Creator' },
            { NAMA: 'Anthoni', STREAM: 'Content Creator' },
            { NAMA: 'Leonardi', STREAM: 'Content Creator' },
            { NAMA: 'Ruliyanto', STREAM: 'Content Creator' },
            { NAMA: 'Rafael', STREAM: 'Content Creator' }
        ]);

        setScheduleData([]);
        setDraftsData([]);
        setMeetingsData([]);
        setCurrentData([]);
    }, []);

    // Global listener for API authorization failures (session expired/invalid)
    useEffect(() => {
        const handleUnauthorized = () => {
            setIsUnlocked(false);
            setUserRole(null);
            sessionStorage.setItem('cud_unlocked', 'false');
            sessionStorage.setItem('user_role', '');
            setSessionToken('');
            showAlert('🔒 Session expired. Please unlock the workspace again.', 'error');
        };

        window.addEventListener('unauthorized-api-call', handleUnauthorized);
        return () => {
            window.removeEventListener('unauthorized-api-call', handleUnauthorized);
        };
    }, []);

    // Load data from Google Sheets when unlock status changes
    useEffect(() => {
        if (isUnlocked) {
            loadFromGoogleSheets();
        } else {
            // Clear all data states when locked so no data is shown
            setCurrentData([]);
            setScheduleData([]);
            setDraftsData([]);
            setMeetingsData([]);
        }
    }, [isUnlocked]);

    // Reset Task List filters whenever the view changes
    useEffect(() => {
        setTasklistSearch('');
        setTasklistFilterPic('');
        setTasklistFilterStatus('');
    }, [currentView]);

    // Show Alert helper
    const showAlert = (message, type = 'success') => {
        setGlobalAlert({ message, type });
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
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
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
    const loadOfflineData = () => {
        if (!isUnlocked) return;
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
                setMeetingsData(data || []);
                if (!data || data.length === 0) {
                    // Fallback sample meeting memo data when none present
                    const sampleMeetings = [
                        {
                            id: 'MEET001',
                            date: new Date().toISOString().split('T')[0],
                            agenda: 'Project Kickoff',
                            attendees: 'Kelvin, Felix',
                            recap: 'Discussed project scope, deliverables, and timelines.'
                        },
                        {
                            id: 'MEET002',
                            date: new Date().toISOString().split('T')[0],
                            agenda: 'Design Review',
                            attendees: 'Andre, Kelvin',
                            recap: 'Reviewed UI mockups, feedback collected, next steps defined.'
                        }
                    ];
                    setMeetingsData(sampleMeetings);
                }
            } catch (e) {}
        }
    };

    // Load live database from Google Sheets
    const loadFromGoogleSheets = async (quiet = false) => {
        setIsLoading(true);

        try {
            const result = await callSheetsAPI('read_all');
            if (result && result.success) {
                const laporan = result.laporan?.data || [];
                const schedule = result.schedule?.data || [];
                const memberList = result.memberList?.data || [];
                const rawScripts = result.scripts?.data || [];
                const rawMeetings = result.meetings?.data || [];

                // Normalize script drafts to expected field names
                const scripts = rawScripts.map(s => ({
                    title: s.Title ?? s.title ?? '',
                    category: s.Category || s.category || 'Story Telling',
                    status: s.Status ?? s.status ?? 'Idea',
                    hook: s.Hook ?? s.hook ?? '',
                    script: s.Script ?? s.script ?? '',
                    hashtags: s.Hashtags ?? s.hashtags ?? s.Hastags ?? s.hastags ?? '',
                    caption: s.Caption ?? s.caption ?? '',
                    references: s.References ?? s.references ?? ''
                }));

                // Normalize meeting memos
                const meetings = rawMeetings.map(m => ({
                    id: m.ID ?? m.id ?? `MEET${Math.random().toString(36).substr(2,5)}`,
                    date: m.Date ?? m.date ?? '',
                    agenda: m.Agenda ?? m.agenda ?? '',
                    attendees: m.Attendees ?? m.attendees ?? '',
                    recap: m.Recap ?? m.recap ?? '',
                    videoRecap: m.VideoRecap ?? m.videoRecap ?? m.Video_Recap ?? m.Video ?? ''
                }));

                const processedLaporan = preprocessLaporanData(laporan);
                setCurrentData(processedLaporan);
                setScheduleData(schedule);
                setMemberListData(memberList);
                setDraftsData(scripts);
                if (meetings.length === 0) {
                    const sampleMeetings = [
                        {
                            id: 'MEET001',
                            date: new Date().toISOString().split('T')[0],
                            agenda: 'Project Kickoff',
                            attendees: 'Kelvin, Felix',
                            recap: 'Discussed project scope, deliverables, and timelines.'
                        },
                        {
                            id: 'MEET002',
                            date: new Date().toISOString().split('T')[0],
                            agenda: 'Design Review',
                            attendees: 'Andre, Kelvin',
                            recap: 'Reviewed UI mockups, feedback collected, next steps defined.'
                        }
                    ];
                    setMeetingsData(sampleMeetings);
                } else {
                    setMeetingsData(meetings);
                }

                // Cache locally
                localStorage.setItem('laporan_data_local', JSON.stringify(processedLaporan));
                localStorage.setItem('schedule_data_local', JSON.stringify(schedule));
                localStorage.setItem('GAT_storyboard_drafts', JSON.stringify(scripts));
                localStorage.setItem('GAT_meeting_memos', JSON.stringify(meetings));

                if (!quiet) showAlert('Database synchronized successfully!', 'success');
            }
        } catch (error) {
            console.error('Failed to sync live data:', error);
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
        const timestamp = localStorage.getItem('lockdown_timestamp');
        if (!timestamp) return 0;
        const diff = Date.now() - parseInt(timestamp, 10);
        const remaining = LOCKDOWN_DURATION - diff;
        return remaining > 0 ? remaining : 0;
    };

    // Submit unlock passcode
    const unlockWorkspace = async (role, passcode) => {
        if (getLockdownTimeRemaining() > 0) {
            throw new Error('System is locked down due to too many failed attempts.');
        }

        setIsLoading(true);
        try {
            const result = await callSheetsAPI('validate_mode', { role, passcode });
            if (result && result.valid && result.role === role) {
                // Success
                localStorage.setItem('failed_attempts', '0');
                setIsUnlocked(true);
                setUserRole(role);
                sessionStorage.setItem('cud_unlocked', 'true');
                sessionStorage.setItem('user_role', role);
                setSessionToken(result.token || '');
                showAlert(`🔓 Workspace unlocked successfully as ${role}!`, 'success');
                return true;
            } else {
                // Failed
                let failedAttempts = parseInt(localStorage.getItem('failed_attempts') || '0', 10);
                failedAttempts++;
                localStorage.setItem('failed_attempts', failedAttempts.toString());
                
                if (failedAttempts >= MAX_ATTEMPTS) {
                    localStorage.setItem('lockdown_timestamp', Date.now().toString());
                    throw new Error('Too many failed attempts. System locked down for 6 hours.');
                } else {
                    throw new Error(`Incorrect access key. (${MAX_ATTEMPTS - failedAttempts} attempts remaining)`);
                }
            }
        } catch (error) {
            console.error('Unlock error:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };
 
    // Lock Workspace
    const lockWorkspace = () => {
        setIsUnlocked(false);
        setUserRole(null);
        sessionStorage.setItem('cud_unlocked', 'false');
        sessionStorage.setItem('user_role', '');
        setSessionToken('');
        showAlert('🔒 Workspace locked. Session ended.', 'info');
    };

    // CRUD: Laporan Metrics
    const addLaporanRow = async (row) => {
        setIsLoading(true);
        try {
            const result = await callSheetsAPI('create', row);
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
            const payload = { ...row, rowIndex };
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
            const result = await callSheetsAPI('save_schedule', task);
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

    return (
        <DashboardContext.Provider value={{
            // States
            currentView, setCurrentView,
            isUnlocked,
            userRole,
            isLoading, setIsLoading,
            globalAlert, showAlert,
            darkMode, toggleDarkMode,
            selectedMeetingId, setSelectedMeetingId,

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
            draftsData,
            meetingsData,

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
            refreshData: () => loadFromGoogleSheets(false)
        }}>
            {children}
        </DashboardContext.Provider>
    );
}
