'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useDashboard } from './DashboardContext';
export { default as DeleteConfirmModal } from './modals/DeleteConfirmModal';
export { default as LinkModal } from './modals/LinkModal';

// ----------------------------------------------------
// 1. UNLOCK MODAL
// ----------------------------------------------------
export function UnlockModal({ isOpen, onClose }) {
    const { unlockWorkspace, getLockdownTimeRemaining } = useDashboard();
    const [role, setRole] = useState('Admin');
    const [passcode, setPasscode] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [showPasscode, setShowPasscode] = useState(false);
    const [lockdownTimeText, setLockdownTimeText] = useState('');

    useEffect(() => {
        let interval = null;
        const updateCountdown = () => {
            const remaining = getLockdownTimeRemaining();
            if (remaining > 0) {
                const hours = Math.floor(remaining / 3600000);
                const minutes = Math.floor((remaining % 3600000) / 60000);
                const seconds = Math.floor((remaining % 60000) / 1000);
                setLockdownTimeText(
                    `System locked down. Try again in ${hours}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s.`
                );
            } else {
                setLockdownTimeText('');
                if (interval) clearInterval(interval);
            }
        };

        if (isOpen) {
            setPasscode('');
            setErrorMsg('');
            updateCountdown();
            interval = setInterval(updateCountdown, 1000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isOpen]);

    if (!isOpen) return null;
    if (typeof window === 'undefined') return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMsg('');

        if (getLockdownTimeRemaining() > 0) {
            setErrorMsg('System is currently locked down. Please wait.');
            return;
        }

        const activePasscode = role === 'Viewer' ? 'viewer' : passcode;

        if (!activePasscode) {
            setErrorMsg('Please enter the access key.');
            return;
        }

        try {
            const success = await unlockWorkspace(role, activePasscode);
            if (success) {
                onClose();
            }
        } catch (error) {
            setErrorMsg(error.message || 'Authentication failed.');
        }
    };

    return createPortal(
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-[999]">
            <div className="w-full max-w-md bg-surface-container border border-outline-variant/30 rounded-xl p-stack-lg shadow-2xl space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-outline-variant/20 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-primary-container rounded flex items-center justify-center text-on-primary">
                            <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
                        </div>
                        <h2 className="font-headline-md text-headline-md font-bold text-on-surface">CC Internal Gate</h2>
                    </div>
                    <button className="text-on-surface-variant hover:text-on-surface p-1 micro-interaction" onClick={onClose} aria-label="Close modal">
                        <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4">
                    {lockdownTimeText && (
                        <div className="flex items-center gap-3 p-3 bg-error-container/20 border border-error/30 rounded text-error text-body-sm">
                            <span className="material-symbols-outlined text-[18px]">warning</span>
                            <span className="font-medium">{lockdownTimeText}</span>
                        </div>
                    )}

                    {errorMsg && !lockdownTimeText && (
                        <div className="flex items-center gap-3 p-3 bg-error-container/10 border border-error/20 rounded text-error text-body-sm">
                            <span className="material-symbols-outlined text-[18px]">error</span>
                            <span className="font-medium">{errorMsg}</span>
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-label-md text-on-surface-variant uppercase tracking-widest block font-bold text-center">SELECT WORKSPACE ROLE</label>
                        <div className="grid grid-cols-3 gap-2">
                            <div
                                className={`flex flex-col items-center justify-center p-2 rounded-lg border cursor-pointer transition-all micro-interaction ${role === 'Admin'
                                        ? 'border-primary bg-primary-container/10 text-primary'
                                        : 'border-outline-variant/30 bg-surface-container-low text-on-surface-variant hover:border-outline'
                                    }`}
                                onClick={() => !lockdownTimeText && setRole('Admin')}
                            >
                                <span className="material-symbols-outlined text-[20px] mb-1">admin_panel_settings</span>
                                <span className="text-[9px] font-bold tracking-wider uppercase text-center">Admin</span>
                            </div>
                            <div
                                className={`flex flex-col items-center justify-center p-2 rounded-lg border cursor-pointer transition-all micro-interaction ${role === 'Creator'
                                        ? 'border-primary bg-primary-container/10 text-primary'
                                        : 'border-outline-variant/30 bg-surface-container-low text-on-surface-variant hover:border-outline'
                                    }`}
                                onClick={() => !lockdownTimeText && setRole('Creator')}
                            >
                                <span className="material-symbols-outlined text-[20px] mb-1">palette</span>
                                <span className="text-[9px] font-bold tracking-wider uppercase text-center">Creator</span>
                            </div>
                            <div
                                className={`flex flex-col items-center justify-center p-2 rounded-lg border cursor-pointer transition-all micro-interaction ${role === 'Viewer'
                                        ? 'border-primary bg-primary-container/10 text-primary'
                                        : 'border-outline-variant/30 bg-surface-container-low text-on-surface-variant hover:border-outline'
                                    }`}
                                onClick={() => !lockdownTimeText && setRole('Viewer')}
                            >
                                <span className="material-symbols-outlined text-[20px] mb-1">visibility</span>
                                <span className="text-[9px] font-bold tracking-wider uppercase text-center">Viewer</span>
                            </div>
                        </div>
                    </div>

                    {role !== 'Viewer' && (
                        <div className="space-y-2 animate-fade-in">
                            <label htmlFor="unlockPin" className="text-label-md text-on-surface-variant uppercase tracking-widest block font-bold">
                                ACCESS KEY <span className="text-error">*</span>
                            </label>
                            <div className="relative">
                                <input
                                    type={showPasscode ? 'text' : 'password'}
                                    id="unlockPin"
                                    className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg pl-4 pr-12 py-3 text-body-sm text-on-surface placeholder-on-surface-variant/40 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                                    placeholder={`Enter ${role} Access Key`}
                                    required
                                    value={passcode}
                                    onChange={(e) => {
                                        setPasscode(e.target.value);
                                        setErrorMsg('');
                                    }}
                                    disabled={!!lockdownTimeText}
                                />
                                <button
                                    type="button"
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface p-1 cursor-pointer"
                                    onClick={() => setShowPasscode(!showPasscode)}
                                    disabled={!!lockdownTimeText}
                                >
                                    <span className="material-symbols-outlined text-[20px]">
                                        {showPasscode ? 'visibility_off' : 'visibility'}
                                    </span>
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button type="button" className="flex-1 bg-surface-container-high text-on-surface hover:bg-surface-container-highest font-semibold py-3 px-4 rounded-lg text-body-sm transition-all micro-interaction" onClick={onClose}>Cancel</button>
                        <button type="submit" className="flex-1 bg-primary text-on-primary hover:opacity-90 font-semibold py-3 px-4 rounded-lg text-body-sm transition-all micro-interaction disabled:opacity-50" disabled={!!lockdownTimeText}>
                            {role === 'Viewer' ? 'Enter Workspace' : 'Enable Edit Mode'}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}

// ----------------------------------------------------
// 2. DATABASE SETTINGS MODAL
// ----------------------------------------------------
export function DbSettingsModal({ isOpen, onClose }) {
    const [url, setUrl] = useState('');

    useEffect(() => {
        if (isOpen) {
            const currentUrl = localStorage.getItem('CUSTOM_SHEETS_SOURCE') || '';
            setUrl(currentUrl === 'YOUR_DEPLOYMENT_URL' ? '' : currentUrl);
        }
    }, [isOpen]);

    if (!isOpen) return null;
    if (typeof window === 'undefined') return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        const trimmedUrl = url.trim();
        if (trimmedUrl.startsWith('https://script.google.com/')) {
            localStorage.setItem('CUSTOM_SHEETS_SOURCE', trimmedUrl);
            alert('💾 Database URL saved! Reloading dashboard...');
            window.location.reload();
        } else {
            alert('❌ Invalid URL. Please provide a valid Google Apps Script Web App URL.');
        }
    };

    const handleClear = () => {
        localStorage.removeItem('CUSTOM_SHEETS_SOURCE');
        alert('🧹 Custom URL cleared! Reloading...');
        window.location.reload();
    };

    return createPortal(
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-[999]">
            <div className="w-full max-w-md bg-surface-container border border-outline-variant/30 rounded-xl p-stack-lg shadow-2xl space-y-5">
                <div className="flex items-center justify-between border-b border-outline-variant/20 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-primary-container rounded flex items-center justify-center text-on-primary">
                            <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>database</span>
                        </div>
                        <h2 className="font-headline-md text-headline-md font-bold text-on-surface">Database Settings</h2>
                    </div>
                    <button className="text-on-surface-variant hover:text-on-surface p-1 micro-interaction" onClick={onClose} aria-label="Close modal">
                        <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4">
                    <div className="space-y-2">
                        <label htmlFor="dbSettingsUrl" className="text-label-md text-on-surface-variant uppercase tracking-widest block font-bold">
                            Google Apps Script Web App URL
                        </label>
                        <input
                            type="url"
                            id="dbSettingsUrl"
                            className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-4 py-3 text-body-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                            placeholder="https://script.google.com/macros/s/.../exec"
                            required
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                        />
                        <p className="text-[11px] text-on-surface-variant/70 leading-relaxed pt-1">
                            Paste your deployed Apps Script Web App URL here. This is saved locally in your browser's localStorage and is not shared or checked into Git.
                        </p>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button type="button" className="flex-1 bg-surface-container-high text-on-surface hover:bg-surface-container-highest font-semibold py-2.5 px-4 rounded-lg text-body-sm transition-all micro-interaction" onClick={onClose}>Cancel</button>
                        <button type="button" className="flex-1 bg-error-container/20 text-error border border-error/20 hover:bg-error-container/30 font-semibold py-2.5 px-4 rounded-lg text-body-sm transition-all micro-interaction" onClick={handleClear}>Clear URL</button>
                        <button type="submit" className="flex-1 bg-primary text-on-primary hover:opacity-90 font-semibold py-2.5 px-4 rounded-lg text-body-sm transition-all micro-interaction">Save Settings</button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}

// ----------------------------------------------------
// 3. DATE RANGE MODAL
// ----------------------------------------------------
export function DateRangeModal({ isOpen, onClose, onOpenDatePicker }) {
    const { dateRange, setDateRange } = useDashboard();
    const [start, setStart] = useState('');
    const [end, setEnd] = useState('');

    useEffect(() => {
        if (isOpen) {
            setStart(dateRange.start || '');
            setEnd(dateRange.end || '');
        }
    }, [isOpen, dateRange]);

    if (!isOpen) return null;
    if (typeof window === 'undefined') return null;

    const presets = [
        { id: 'auto', label: 'All Time' },
        { id: 'today', label: 'Today' },
        { id: 'yesterday', label: 'Yesterday' },
        { id: 'last7', label: 'Last 7 Days' },
        { id: 'last30', label: 'Last 30 Days' },
        { id: 'thisMonth', label: 'This Month' },
        { id: 'lastMonth', label: 'Last Month' }
    ];

    const applyPreset = (presetId) => {
        const today = new Date();
        let newStart = '';
        let newEnd = '';

        const getIsoString = (date) => {
            const offset = date.getTimezoneOffset() * 60000;
            return new Date(date.getTime() - offset).toISOString().slice(0, 10);
        };

        switch (presetId) {
            case 'today':
                newStart = getIsoString(today);
                newEnd = getIsoString(today);
                break;
            case 'yesterday':
                const yesterday = new Date();
                yesterday.setDate(today.getDate() - 1);
                newStart = getIsoString(yesterday);
                newEnd = getIsoString(yesterday);
                break;
            case 'last7':
                const last7 = new Date();
                last7.setDate(today.getDate() - 6);
                newStart = getIsoString(last7);
                newEnd = getIsoString(today);
                break;
            case 'last30':
                const last30 = new Date();
                last30.setDate(today.getDate() - 29);
                newStart = getIsoString(last30);
                newEnd = getIsoString(today);
                break;
            case 'thisMonth':
                newStart = getIsoString(new Date(today.getFullYear(), today.getMonth(), 1));
                newEnd = getIsoString(today);
                break;
            case 'lastMonth':
                newStart = getIsoString(new Date(today.getFullYear(), today.getMonth() - 1, 1));
                newEnd = getIsoString(new Date(today.getFullYear(), today.getMonth(), 0));
                break;
            default:
                newStart = '';
                newEnd = '';
                break;
        }

        setDateRange({ start: newStart, end: newEnd, mode: presetId });
        onClose();
    };

    const handleCustomApply = (e) => {
        e.preventDefault();
        setDateRange({ start, end, mode: 'custom' });
        onClose();
    };

    return createPortal(
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-[999]">
            <div className="w-full max-w-[420px] bg-surface-container border border-outline-variant/30 rounded-xl p-stack-lg shadow-2xl space-y-5">
                <div className="flex items-center justify-between border-b border-outline-variant/20 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-primary-container rounded flex items-center justify-center text-on-primary">
                            <span className="material-symbols-outlined text-[20px]">date_range</span>
                        </div>
                        <h2 className="font-headline-md text-headline-md font-bold text-on-surface">Select Date Range</h2>
                    </div>
                    <button className="text-on-surface-variant hover:text-on-surface p-1 micro-interaction" onClick={onClose} aria-label="Close modal">
                        <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                </div>

                <div className="space-y-4">
                    {/* Presets Grid */}
                    <div className="space-y-2">
                        <label className="text-label-md text-on-surface-variant uppercase tracking-widest block font-bold">Quick Presets</label>
                        <div className="grid grid-cols-2 gap-2">
                            {presets.map((preset) => (
                                <button
                                    key={preset.id}
                                    type="button"
                                    className={`py-2 px-3 text-left rounded text-body-sm font-semibold border transition-all cursor-pointer micro-interaction truncate ${dateRange.mode === preset.id
                                            ? 'border-primary bg-primary-container/10 text-primary'
                                            : 'border-outline-variant/30 bg-surface-container-low text-on-surface hover:border-outline'
                                        }`}
                                    onClick={() => applyPreset(preset.id)}
                                >
                                    {preset.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Custom Range Form */}
                    <form onSubmit={handleCustomApply} className="space-y-4 pt-3 border-t border-outline-variant/20">
                        <label className="text-label-md text-on-surface-variant uppercase tracking-widest block font-bold">Custom Range</label>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-[10px] text-on-surface-variant uppercase font-semibold">Start Date</label>
                                <input
                                    type="text"
                                    className="w-full bg-surface-container-low border border-outline-variant/30 rounded px-3 py-2 text-body-sm text-on-surface cursor-pointer text-center"
                                    placeholder="YYYY-MM-DD"
                                    value={start}
                                    onClick={() => {
                                        onOpenDatePicker((selectedDate) => {
                                            setStart(selectedDate);
                                        }, start);
                                    }}
                                    readOnly
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] text-on-surface-variant uppercase font-semibold">End Date</label>
                                <input
                                    type="text"
                                    className="w-full bg-surface-container-low border border-outline-variant/30 rounded px-3 py-2 text-body-sm text-on-surface cursor-pointer text-center"
                                    placeholder="YYYY-MM-DD"
                                    value={end}
                                    onClick={() => {
                                        onOpenDatePicker((selectedDate) => {
                                            setEnd(selectedDate);
                                        }, end);
                                    }}
                                    readOnly
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                            <button type="button" className="bg-surface-container-high text-on-surface hover:bg-surface-container-highest font-semibold py-2 px-4 rounded text-body-sm transition-all micro-interaction" onClick={onClose}>Cancel</button>
                            <button type="submit" className="bg-primary text-on-primary hover:opacity-90 font-semibold py-2 px-4 rounded text-body-sm transition-all micro-interaction">Apply Range</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>,
        document.body
    );
}

// ----------------------------------------------------
// 4. DATE PICKER MODAL
// ----------------------------------------------------
export function DatePickerModal({ isOpen, onClose, onSelect, initialDate }) {
    const [currentMonth, setCurrentMonth] = useState(() => new Date(2026, 5, 1));

    useEffect(() => {
        setCurrentMonth(new Date());
    }, []);

    useEffect(() => {
        if (isOpen && initialDate) {
            const parts = initialDate.split('-');
            if (parts.length === 3) {
                const year = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10) - 1;
                const day = parseInt(parts[2], 10);
                const dateObj = new Date(year, month, day);
                if (!isNaN(dateObj.getTime())) {
                    setCurrentMonth(dateObj);
                }
            }
        }
    }, [isOpen, initialDate]);

    if (!isOpen) return null;
    if (typeof window === 'undefined') return null;

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const startOffset = firstDay.getDay(); // 0 is Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

    const shiftMonth = (offset) => {
        setCurrentMonth(new Date(year, month + offset, 1));
    };

    const handleSelectDay = (day) => {
        const monthStr = String(month + 1).padStart(2, '0');
        const dayStr = String(day).padStart(2, '0');
        onSelect(`${year}-${monthStr}-${dayStr}`);
        onClose();
    };

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    return createPortal(
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]">
            <div className="w-full max-w-[340px] bg-surface-container border border-outline-variant/30 rounded-xl p-4 shadow-2xl space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-outline-variant/20">
                    <h3 className="text-body-sm font-semibold text-on-surface">Select Date</h3>
                    <button type="button" className="text-on-surface-variant hover:text-on-surface p-0.5 micro-interaction" onClick={onClose}>
                        <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                </div>

                {/* Calendar Navigation */}
                <div className="flex justify-between items-center">
                    <button type="button" className="w-8 h-8 flex items-center justify-center rounded border border-outline-variant/30 hover:bg-surface-container-high text-on-surface cursor-pointer" onClick={() => shiftMonth(-1)}>
                        <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                    </button>
                    <span className="font-semibold text-body-sm text-on-surface">{monthNames[month]} {year}</span>
                    <button type="button" className="w-8 h-8 flex items-center justify-center rounded border border-outline-variant/30 hover:bg-surface-container-high text-on-surface cursor-pointer" onClick={() => shiftMonth(1)}>
                        <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                    </button>
                </div>

                {/* Weekday headers */}
                <div className="grid grid-cols-7 text-center text-[10px] font-bold text-on-surface-variant uppercase tracking-widest py-1 border-b border-outline-variant/10">
                    <div>Su</div>
                    <div>Mo</div>
                    <div>Tu</div>
                    <div>We</div>
                    <div>Th</div>
                    <div>Fr</div>
                    <div>Sa</div>
                </div>

                {/* Calendar Days */}
                <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: totalCells }).map((_, cellIndex) => {
                        const dayNumber = cellIndex - startOffset + 1;
                        const isInMonth = dayNumber >= 1 && dayNumber <= daysInMonth;

                        if (!isInMonth) {
                            return <div key={cellIndex} className="h-8"></div>;
                        }

                        const dayStr = String(dayNumber);
                        const isSelected = initialDate === `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`;

                        return (
                            <button
                                key={cellIndex}
                                type="button"
                                onClick={() => handleSelectDay(dayNumber)}
                                className={`h-8 w-full border-none rounded text-body-sm cursor-pointer flex items-center justify-center transition-all micro-interaction ${isSelected
                                        ? 'bg-primary text-on-primary font-bold'
                                        : 'bg-transparent text-on-surface hover:bg-surface-container-high font-medium'
                                    }`}
                            >
                                {dayStr}
                            </button>
                        );
                    })}
                </div>

                <div className="flex justify-end pt-2 border-t border-outline-variant/10">
                    <button type="button" className="bg-surface-container-high text-on-surface hover:bg-surface-container-highest font-semibold py-1.5 px-3 rounded text-body-sm transition-all micro-interaction" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>,
        document.body
    );
}

// ----------------------------------------------------
// 5. CALENDAR EXPORT MODAL
// ----------------------------------------------------
export function CalendarExportModal({ isOpen, onClose }) {
    const { memberListData, categoriesData } = useDashboard();
    const [exportTheme, setExportTheme] = useState('light');
    const [isLoading, setIsLoading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState('');
    const [imageBlob, setImageBlob] = useState(null);

    const [showMeetings, setShowMeetings] = useState(true);
    const [selectedPic, setSelectedPic] = useState('All');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [hasMeetings, setHasMeetings] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const isBodyDark = document.body.classList.contains('dark-mode') || true;
            setExportTheme(isBodyDark ? 'dark' : 'light');

            const target = document.querySelector('.calendar-shell');
            if (target) {
                const meetingCount = target.querySelectorAll('.calendar-day-task-item[data-is-meeting="true"]').length;
                setHasMeetings(meetingCount > 0);
            }

            setShowMeetings(true);
            setSelectedPic('All');
            setSelectedCategory('All');
        } else {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
            setPreviewUrl('');
            setImageBlob(null);
            setIsLoading(false);
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen) {
            generatePreview();
        }
    }, [isOpen, exportTheme, showMeetings, selectedPic, selectedCategory]);

    const generatePreview = async () => {
        const target = document.querySelector('.calendar-shell');
        if (!target) return;

        setIsLoading(true);
        setImageBlob(null);
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
            setPreviewUrl('');
        }

        await new Promise(resolve => setTimeout(resolve, 100));

        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.left = '-9999px';
        iframe.style.top = '-9999px';
        iframe.style.width = '980px';
        iframe.style.height = '880px';
        iframe.style.border = 'none';
        document.body.appendChild(iframe);

        try {
            const doc = iframe.contentDocument || iframe.contentWindow.document;

            // Load html2canvas script inside the iframe to sandbox its style parsing
            const script = doc.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
            doc.head.appendChild(script);

            await new Promise((resolve, reject) => {
                script.onload = resolve;
                script.onerror = () => reject(new Error('Failed to load html2canvas in iframe'));
            });

            Array.from(document.querySelectorAll('link[rel="stylesheet"], style')).forEach(el => {
                if (el.tagName === 'LINK') {
                    const href = el.getAttribute('href') || '';
                    if (href.includes('fonts.googleapis.com') || href.includes('fonts.gstatic.com')) {
                        doc.head.appendChild(el.cloneNode(true));
                    }
                } else if (el.tagName === 'STYLE') {
                    const content = el.textContent || '';
                    if (!content.includes('oklab') && !content.includes('oklch') && !content.includes('tailwindcss')) {
                        doc.head.appendChild(el.cloneNode(true));
                    }
                }
            });

            const style = document.createElement('style');
            style.textContent = `
                body {
                    background: transparent !important;
                    margin: 0;
                    padding: 24px;
                    overflow: hidden;
                }
                .calendar-shell {
                    width: 900px !important;
                    height: 800px !important;
                    max-width: 900px !important;
                    max-height: 800px !important;
                    box-shadow: none !important;
                    border: 1px solid ${exportTheme === 'light' ? '#e2e8f0' : '#2e3038'} !important;
                    border-radius: 12px !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    display: flex !important;
                    flex-direction: column !important;
                    box-sizing: border-box !important;
                    overflow: hidden !important;
                    background-color: ${exportTheme === 'light' ? '#ffffff' : '#202127'} !important;
                    color: ${exportTheme === 'light' ? '#0f172a' : '#f1f5f9'} !important;
                }
                .calendar-toolbar {
                    display: flex !important;
                    justify-content: space-between !important;
                    align-items: center !important;
                    width: 100% !important;
                    padding: 16px 20px !important;
                    border-bottom: 1px solid ${exportTheme === 'light' ? '#e2e8f0' : '#2e3038'} !important;
                    background-color: ${exportTheme === 'light' ? '#f8fafc' : '#18191e'} !important;
                }
                .calendar-weekdays {
                    display: grid !important;
                    grid-template-columns: repeat(7, 1fr) !important;
                    gap: 0 !important;
                    width: 100% !important;
                    padding: 10px 0 !important;
                    border-bottom: 1px solid ${exportTheme === 'light' ? '#e2e8f0' : '#2e3038'} !important;
                    background-color: ${exportTheme === 'light' ? '#f8fafc' : '#18191e'} !important;
                    color: ${exportTheme === 'light' ? '#64748b' : '#94a3b8'} !important;
                    text-align: center !important;
                    font-size: 11px !important;
                    font-weight: 700 !important;
                    text-transform: uppercase !important;
                    letter-spacing: 0.05em !important;
                }
                .calendar-days {
                    display: grid !important;
                    grid-template-columns: repeat(7, 1fr) !important;
                    gap: 1px !important;
                    flex-grow: 1 !important;
                    grid-auto-rows: 1fr !important;
                    width: 100% !important;
                    background-color: ${exportTheme === 'light' ? '#e2e8f0' : '#2e3038'} !important;
                }
                .calendar-day {
                    min-height: 0 !important;
                    height: 100% !important;
                    padding: 8px !important;
                    border: none !important;
                    border-radius: 0 !important;
                    display: flex !important;
                    flex-direction: column !important;
                    justify-content: flex-start !important;
                    box-sizing: border-box !important;
                    background-color: ${exportTheme === 'light' ? '#ffffff' : '#141518'} !important;
                }
                .calendar-day::after {
                    display: none !important;
                }
                .calendar-day-tasks-container {
                    flex-grow: 1 !important;
                    display: flex !important;
                    flex-direction: column !important;
                    gap: 4px !important;
                    justify-content: flex-start !important;
                    overflow: hidden !important;
                    width: 100% !important;
                    margin-top: 4px !important;
                }
                .calendar-day-task-item {
                    width: 100% !important;
                }
                .calendar-day-task-pill {
                    font-size: 11px !important;
                    padding: 3px 6px !important;
                    border-radius: 4px !important;
                    font-weight: 700 !important;
                }
                .calendar-day-task-category {
                    font-size: 11px !important;
                    font-weight: 600 !important;
                    margin-top: 2px !important;
                }
                
                /* Standard fonts and fallback styles */
                body {
                    font-family: 'Inter', sans-serif !important;
                }
                h1, h2, h3, h4, h5, h6 {
                    font-family: 'Hanken Grotesk', sans-serif !important;
                }
                .material-symbols-outlined {
                    font-family: 'Material Symbols Outlined' !important;
                    font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24 !important;
                    display: inline-block !important;
                    line-height: 1 !important;
                }

                /* Basic color fallbacks */
                .text-primary { color: #10b981 !important; }
                .text-on-surface-variant { color: ${exportTheme === 'light' ? '#64748b' : '#94a3b8'} !important; }
                
                /* Category/PIC badge color definitions */
                .bg-emerald-500\\/10 { background-color: rgba(16, 185, 129, 0.12) !important; }
                .text-emerald-400 { color: ${exportTheme === 'light' ? '#059669' : '#34d399'} !important; }
                .border-emerald-500\\/20 { border-color: rgba(16, 185, 129, 0.25) !important; }

                .bg-sky-500\\/10 { background-color: rgba(14, 165, 233, 0.12) !important; }
                .text-sky-400 { color: ${exportTheme === 'light' ? '#0284c7' : '#38bdf8'} !important; }
                .border-sky-500\\/20 { border-color: rgba(14, 165, 233, 0.25) !important; }

                .bg-purple-500\\/10 { background-color: rgba(168, 85, 247, 0.12) !important; }
                .text-purple-400 { color: ${exportTheme === 'light' ? '#7e22ce' : '#c084fc'} !important; }
                .border-purple-500\\/20 { border-color: rgba(168, 85, 247, 0.25) !important; }

                .bg-pink-500\\/10 { background-color: rgba(236, 72, 153, 0.12) !important; }
                .text-pink-400 { color: ${exportTheme === 'light' ? '#be185d' : '#f472b6'} !important; }
                .border-pink-500\\/20 { border-color: rgba(236, 72, 153, 0.25) !important; }

                .bg-amber-500\\/10 { background-color: rgba(245, 158, 11, 0.12) !important; }
                .text-amber-400 { color: ${exportTheme === 'light' ? '#d97706' : '#fbbf24'} !important; }
                .border-amber-500\\/20 { border-color: rgba(245, 158, 11, 0.25) !important; }

                .bg-rose-500\\/10 { background-color: rgba(244, 63, 94, 0.12) !important; }
                .text-rose-400 { color: ${exportTheme === 'light' ? '#e11d48' : '#fb7185'} !important; }
                .border-rose-500\\/20 { border-color: rgba(244, 63, 94, 0.25) !important; }

                .bg-blue-500\\/10 { background-color: rgba(59, 130, 246, 0.12) !important; }
                .text-blue-400 { color: ${exportTheme === 'light' ? '#2563eb' : '#60a5fa'} !important; }
                .border-blue-500\\/20 { border-color: rgba(59, 130, 246, 0.25) !important; }

                /* Status day backgrounds */
                .bg-emerald-500\\/5 { background-color: rgba(16, 185, 129, 0.06) !important; }
                .bg-rose-500\\/5 { background-color: rgba(244, 63, 94, 0.06) !important; }
                .bg-sky-500\\/5 { background-color: rgba(14, 165, 233, 0.06) !important; }
                .bg-amber-500\\/5 { background-color: rgba(245, 158, 11, 0.06) !important; }
            `;
            doc.head.appendChild(style);

            if (exportTheme === 'dark') {
                doc.body.classList.add('dark-mode');
            } else {
                doc.body.classList.remove('dark-mode');
            }

            const clone = target.cloneNode(true);
            const editorEl = clone.querySelector('.calendar-editor');
            if (editorEl) {
                editorEl.style.display = 'none';
            }
            clone.querySelectorAll('.calendar-nav-btn').forEach(el => el.remove());
            const toolbarActions = clone.querySelector('.calendar-toolbar-actions');
            if (toolbarActions) {
                toolbarActions.remove();
            }
            clone.removeAttribute('style');

            // Remove the "task_alt" (uploaded checkmark icon) from the calendar days in clone
            clone.querySelectorAll('span.material-symbols-outlined').forEach(el => {
                if (el.textContent.trim() === 'task_alt') {
                    el.remove();
                }
            });

            if (!showMeetings) {
                clone.querySelectorAll('.calendar-day-task-item[data-is-meeting="true"]').forEach(el => el.remove());
            }
            if (selectedPic !== 'All') {
                clone.querySelectorAll('.calendar-day-task-item').forEach(el => {
                    const isMeeting = el.getAttribute('data-is-meeting') === 'true';
                    const pic = el.getAttribute('data-pic');
                    if (!isMeeting && pic !== selectedPic) {
                        el.remove();
                    }
                });
            }
            if (selectedCategory !== 'All') {
                clone.querySelectorAll('.calendar-day-task-item').forEach(el => {
                    const isMeeting = el.getAttribute('data-is-meeting') === 'true';
                    const category = el.getAttribute('data-category');
                    if (!isMeeting && category !== selectedCategory) {
                        el.remove();
                    }
                });
            }

            clone.querySelectorAll('.calendar-day').forEach(el => {
                el.classList.remove('today');
                el.classList.remove('selected');
            });

            doc.body.appendChild(clone);

            // Filter out any CSS rules in the iframe stylesheets that contain 'oklab' or 'oklch'
            try {
                for (let i = 0; i < doc.styleSheets.length; i++) {
                    const sheet = doc.styleSheets[i];
                    try {
                        const rules = sheet.cssRules || sheet.rules;
                        if (rules) {
                            for (let j = rules.length - 1; j >= 0; j--) {
                                const ruleText = rules[j].cssText || '';
                                if (ruleText.includes('oklab') || ruleText.includes('oklch')) {
                                    sheet.deleteRule(j);
                                }
                            }
                        }
                    } catch (e) {
                        // Ignore stylesheet access errors
                    }
                }
            } catch (err) {
                console.warn('Failed to filter oklab stylesheet rules:', err);
            }

            await new Promise(resolve => setTimeout(resolve, 150));

            const captureTarget = doc.querySelector('.calendar-shell');
            if (!captureTarget) {
                throw new Error('Capture target not found');
            }

            if (!iframe.contentWindow || !iframe.contentWindow.html2canvas) {
                throw new Error('html2canvas library is not loaded inside the iframe');
            }

            const canvas = await iframe.contentWindow.html2canvas(captureTarget, {
                backgroundColor: exportTheme === 'light' ? '#ffffff' : '#0b1326',
                scale: 2,
                logging: false,
                useCORS: true,
                width: 900,
                height: 800
            });

            canvas.toBlob(blob => {
                if (blob) {
                    setImageBlob(blob);
                    const url = URL.createObjectURL(blob);
                    setPreviewUrl(url);
                }
                setIsLoading(false);
            }, 'image/png');

        } catch (e) {
            console.error('Failed to generate calendar screenshot:', e);
            setIsLoading(false);
        } finally {
            if (iframe && iframe.parentNode) {
                iframe.parentNode.removeChild(iframe);
            }
        }
    };

    const handleCopy = async () => {
        if (!imageBlob) return;
        try {
            const item = new ClipboardItem({ "image/png": imageBlob });
            await navigator.clipboard.write([item]);
            alert('📋 Calendar image copied to clipboard!');
        } catch (err) {
            console.error('Failed to copy to clipboard:', err);
            alert('❌ Failed to copy to clipboard. Please download the PNG instead.');
        }
    };

    const handleDownload = () => {
        if (!previewUrl) return;
        const monthLabelEl = document.querySelector('.calendar-month-label h3');
        const monthLabel = monthLabelEl ? monthLabelEl.textContent : 'Calendar';
        const cleanMonth = monthLabel.replace(/\s+/g, '-');
        const filename = 'Calendar-' + cleanMonth + '-' + exportTheme.toUpperCase() + '.png';

        const link = document.createElement('a');
        link.download = filename;
        link.href = previewUrl;
        link.click();
    };

    if (!isOpen) return null;
    if (typeof window === 'undefined') return null;

    return createPortal(
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-[999]">
            <div className="w-full max-w-[680px] bg-surface-container border border-outline-variant/30 rounded-xl overflow-hidden flex flex-col shadow-2xl">
                <div className="px-5 py-4 border-b border-outline-variant/20 flex items-center justify-between">
                    <h3 className="text-body-sm font-semibold flex items-center gap-2 text-on-surface">
                        <span className="material-symbols-outlined text-primary text-[20px]">image</span> Export Calendar
                    </h3>
                    <div className="flex gap-3 items-center ml-auto mr-4">
                        <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Theme:</span>
                        <div className="flex bg-surface-container-low rounded border border-outline-variant/20 p-0.5">
                            <button
                                type="button"
                                onClick={() => setExportTheme('light')}
                                className={`px-3 py-1 text-[10px] font-bold rounded cursor-pointer transition-all ${exportTheme === 'light' ? 'bg-surface text-primary shadow' : 'text-on-surface-variant hover:text-on-surface'
                                    }`}
                            >
                                Light
                            </button>
                            <button
                                type="button"
                                onClick={() => setExportTheme('dark')}
                                className={`px-3 py-1 text-[10px] font-bold rounded cursor-pointer transition-all ${exportTheme === 'dark' ? 'bg-surface text-primary shadow' : 'text-on-surface-variant hover:text-on-surface'
                                    }`}
                            >
                                Dark
                            </button>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="text-on-surface-variant hover:text-on-surface p-1 micro-interaction"
                        onClick={onClose}
                    >
                        <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                </div>
                {/* Export filter settings */}
                <div className="px-5 py-3 border-b border-outline-variant/20 flex gap-4 items-center flex-wrap bg-surface-container-lowest">
                    {hasMeetings && (
                        <label className="flex items-center gap-2 text-body-sm cursor-pointer select-none text-on-surface mr-2">
                            <input
                                type="checkbox"
                                checked={showMeetings}
                                onChange={(e) => setShowMeetings(e.target.checked)}
                                className="cursor-pointer rounded border-outline-variant bg-surface-container-low text-primary focus:ring-primary h-4 w-4"
                            />
                            <span>Meetings</span>
                        </label>
                    )}

                    <div className="flex items-center gap-2">
                        <label className="text-body-sm font-semibold text-on-surface-variant">PIC:</label>
                        <select
                            className="bg-surface-container-low border border-outline-variant/30 rounded px-2.5 py-1 text-body-sm text-on-surface focus:outline-none focus:border-primary"
                            value={selectedPic}
                            onChange={(e) => setSelectedPic(e.target.value)}
                        >
                            <option value="All">All PICs</option>
                            {memberListData.map(m => (
                                <option key={m.NAMA} value={m.NAMA}>{m.NAMA}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <label className="text-body-sm font-semibold text-on-surface-variant">Category:</label>
                        <select
                            className="bg-surface-container-low border border-outline-variant/30 rounded px-2.5 py-1 text-body-sm text-on-surface focus:outline-none focus:border-primary"
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                        >
                            <option value="All">All Categories</option>
                            {categoriesData.map(c => (
                                <option key={c.name} value={c.name}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Preview Canvas */}
                <div className="p-5 bg-background flex items-center justify-center min-h-[300px] relative overflow-y-auto max-h-[420px]">
                    {isLoading && (
                        <div className="flex flex-col items-center gap-3 text-on-surface-variant">
                            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                            <p className="text-body-sm">Generating calendar preview...</p>
                        </div>
                    )}
                    {!isLoading && previewUrl && (
                        <div className={`w-full max-w-[500px] border border-outline-variant/30 rounded-lg p-2 shadow-lg flex justify-center ${exportTheme === 'light' ? 'bg-[#ffffff]' : 'bg-[#0c0c0e]'
                            }`}>
                            <img src={previewUrl} alt="Calendar Export Preview" className="max-w-full h-auto rounded object-contain" />
                        </div>
                    )}
                </div>

                {/* Actions Footer */}
                <div className="flex gap-3 px-5 py-4 border-t border-outline-variant/20 justify-end bg-surface-container-lowest">
                    <button
                        type="button"
                        className="bg-surface-container-high text-on-surface hover:bg-surface-container-highest font-semibold py-2.5 px-4 rounded-lg text-body-sm transition-all micro-interaction"
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="bg-surface-container-high text-primary border border-primary/20 hover:bg-primary-container/15 font-semibold py-2.5 px-4 rounded-lg text-body-sm transition-all micro-interaction flex items-center gap-2 disabled:opacity-50"
                        onClick={handleCopy}
                        disabled={isLoading || !imageBlob}
                    >
                        <span className="material-symbols-outlined text-[18px]">content_copy</span> Copy Image
                    </button>
                    <button
                        type="button"
                        className="bg-primary text-on-primary hover:opacity-90 font-semibold py-2.5 px-4 rounded-lg text-body-sm transition-all micro-interaction flex items-center gap-2 disabled:opacity-50"
                        onClick={handleDownload}
                        disabled={isLoading || !previewUrl}
                    >
                        <span className="material-symbols-outlined text-[18px]">download</span> Download PNG
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}

// ----------------------------------------------------
// 6. DELETE CONFIRMATION MODAL
// ----------------------------------------------------
// ----------------------------------------------------
// 8. HELP & OPERATIONS GUIDE MODAL
// ----------------------------------------------------
export function HelpGuideModal({ isOpen, onClose }) {
    const { userRole } = useDashboard();
    const [activeTab, setActiveTab] = useState('roles');

    if (!isOpen) return null;
    if (typeof window === 'undefined') return null;

    const renderTabContent = () => {
        switch (activeTab) {
            case 'roles':
                return (
                    <div className="space-y-4">
                        <div className="p-3 bg-primary/10 border border-primary/25 rounded text-body-sm flex items-center gap-2.5 text-on-surface">
                            <span className="material-symbols-outlined text-primary text-[18px]">check_circle</span>
                            <span>Authenticated under <strong className="text-primary">{userRole === 'Admin' ? 'ADMIN MODE' : userRole === 'Creator' ? 'CREATOR MODE' : 'VIEWER MODE'}</strong>.</span>
                        </div>

                        <p className="text-body-sm text-on-surface-variant/80 leading-relaxed">
                            Content suite dynamically adapts its interface and access controls based on the authenticated role.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                            {/* Admin Card */}
                            <div className={`border rounded-lg p-4 bg-surface-container-lowest flex flex-col gap-2 transition-all duration-200 ${userRole === 'Admin' ? 'border-2 border-primary' : 'border-outline-variant/30 opacity-60'
                                }`}>
                                <div className="flex items-center gap-2 text-primary font-bold text-body-sm uppercase tracking-wider">
                                    <span className="material-symbols-outlined text-[18px]">admin_panel_settings</span>
                                    <span>ADMIN MODE</span>
                                </div>
                                <ul className="list-disc pl-4 text-[10px] text-on-surface-variant/90 space-y-1.5 leading-normal">
                                    <li>Full read & write access to all tabs.</li>
                                    <li>Add, edit, or delete any task, calendar event, meeting memo, or draft.</li>
                                    <li>Authorized to sync and write back records to the main database.</li>
                                </ul>
                            </div>

                            {/* Creator Card */}
                            <div className={`border rounded-lg p-4 bg-surface-container-lowest flex flex-col gap-2 transition-all duration-200 ${userRole === 'Creator' ? 'border-2 border-primary' : 'border-outline-variant/30 opacity-60'
                                }`}>
                                <div className="flex items-center gap-2 text-primary font-bold text-body-sm uppercase tracking-wider">
                                    <span className="material-symbols-outlined text-[18px]">palette</span>
                                    <span>CREATOR MODE</span>
                                </div>
                                <ul className="list-disc pl-4 text-[10px] text-on-surface-variant/90 space-y-1.5 leading-normal">
                                    <li>Optimized read-focused workstation.</li>
                                    <li>Can view analytics, calendars, and dashboards without accidental edits.</li>
                                    <li>Full permissions to add and edit meeting memos and storyboard drafts.</li>
                                </ul>
                            </div>

                            {/* Viewer Card */}
                            <div className={`border rounded-lg p-4 bg-surface-container-lowest flex flex-col gap-2 transition-all duration-200 ${userRole === 'Viewer' ? 'border-2 border-primary' : 'border-outline-variant/30 opacity-60'
                                }`}>
                                <div className="flex items-center gap-2 text-primary font-bold text-body-sm uppercase tracking-wider">
                                    <span className="material-symbols-outlined text-[18px]">visibility</span>
                                    <span>VIEWER MODE</span>
                                </div>
                                <ul className="list-disc pl-4 text-[10px] text-on-surface-variant/90 space-y-1.5 leading-normal">
                                    <li>Strictly read-only monitoring dashboard.</li>
                                    <li>Can view main dashboard and performance analytics charts.</li>
                                    <li>All content database forms, storyboards, and calendar schedulers are hidden.</li>
                                </ul>
                            </div>
                        </div>

                        <div className="text-[11px] text-on-surface-variant/50 border-t border-outline-variant/10 pt-3 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[14px]">info</span>
                            <span>Workspace role can be changed on the Lock screen by re-entering the staff key.</span>
                        </div>
                    </div>
                );
            case 'workflows':
                return (
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                        <p className="text-body-sm text-on-surface-variant/80 leading-relaxed">
                            Navigate through the sidebar to coordinate content operations:
                        </p>

                        <div className="space-y-2 border border-outline-variant/20 rounded-lg p-3 bg-surface-container-lowest text-body-sm divide-y divide-outline-variant/15">
                            <div className="flex gap-3 items-start pb-2">
                                <div className="min-w-[100px] font-bold text-on-surface flex items-center gap-1.5 text-body-sm">
                                    <span className="material-symbols-outlined text-primary text-[16px]">dashboard</span>Home
                                </div>
                                <div className="text-[12px] text-on-surface-variant/85 leading-normal">
                                    Overview of total publication views, reaches, follow growth, and recent performance highlights.
                                </div>
                            </div>

                            <div className="flex gap-3 items-start py-2">
                                <div className="min-w-[100px] font-bold text-on-surface flex items-center gap-1.5 text-body-sm">
                                    <span className="material-symbols-outlined text-primary text-[16px]">calendar_month</span>Planner
                                </div>
                                <div className="text-[12px] text-on-surface-variant/85 leading-normal">
                                    Visual publication timeline. Useful for seeing scheduled posting dates. Exports clean PNGs for team updates.
                                </div>
                            </div>

                            <div className="flex gap-3 items-start py-2">
                                <div className="min-w-[100px] font-bold text-on-surface flex items-center gap-1.5 text-body-sm">
                                    <span className="material-symbols-outlined text-primary text-[16px]">assignment</span>Task List
                                </div>
                                <div className="text-[12px] text-on-surface-variant/85 leading-normal">
                                    Tracks action items, priorities, and deadlines. Filter by "Due Today", status, or PIC.
                                </div>
                            </div>

                            <div className="flex gap-3 items-start py-2">
                                <div className="min-w-[100px] font-bold text-on-surface flex items-center gap-1.5 text-body-sm">
                                    <span className="material-symbols-outlined text-primary text-[16px]">folder_open</span>Library
                                </div>
                                <div className="text-[12px] text-on-surface-variant/85 leading-normal">
                                    Where storyboards, hooks, and drafts are written. Helps refine scripts before filming.
                                </div>
                            </div>

                            <div className="flex gap-3 items-start py-2">
                                <div className="min-w-[100px] font-bold text-on-surface flex items-center gap-1.5 text-body-sm">
                                    <span className="material-symbols-outlined text-primary text-[16px]">description</span>Memos
                                </div>
                                <div className="text-[12px] text-on-surface-variant/85 leading-normal">
                                    Log meeting notes and action points. Click any card to instantly scroll down and edit its content.
                                </div>
                            </div>

                            <div className="flex gap-3 items-start pt-2">
                                <div className="min-w-[100px] font-bold text-on-surface flex items-center gap-1.5 text-body-sm">
                                    <span className="material-symbols-outlined text-primary text-[16px]">analytics</span>Analytics
                                </div>
                                <div className="text-[12px] text-on-surface-variant/85 leading-normal">
                                    Detailed trend breakdown (monthly/weekly), engagement metrics, and rank lists for PICs and platforms.
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'security':
                return (
                    <div className="space-y-4">
                        <p className="text-body-sm text-on-surface-variant/80 leading-relaxed">
                            Security controls and offline caching mechanisms of the platform:
                        </p>

                        <div className="space-y-3">
                            <div className="flex gap-3">
                                <span className="material-symbols-outlined text-primary text-[18px] mt-0.5">lock</span>
                                <div>
                                    <strong className="text-[12px] text-on-surface block font-bold uppercase tracking-wide">Automatic Session Locking</strong>
                                    <span className="text-[11px] text-on-surface-variant/85 leading-normal block">
                                        Refreshing the page or closing the tab automatically locks database access. This is an intentional security control to safeguard database credentials.
                                    </span>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <span className="material-symbols-outlined text-error text-[18px] mt-0.5">warning</span>
                                <div>
                                    <strong className="text-[12px] text-on-surface block font-bold uppercase tracking-wide">Brute Force Lockdown</strong>
                                    <span className="text-[11px] text-on-surface-variant/85 leading-normal block">
                                        Entering incorrect access passcodes 5 consecutive times triggers an automatic 6-hour browser lockdown where no credentials will be accepted.
                                    </span>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <span className="material-symbols-outlined text-primary text-[18px] mt-0.5">cloud_sync</span>
                                <div>
                                    <strong className="text-[12px] text-on-surface block font-bold uppercase tracking-wide">Local Sync & Caching</strong>
                                    <span className="text-[11px] text-on-surface-variant/85 leading-normal block">
                                        Database tables are automatically cached in your browser. If offline or facing connection trouble, the dashboard loads using local backup data.
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return createPortal(
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-[999]">
            <div className="w-full max-w-[560px] bg-surface-container border border-outline-variant/30 rounded-xl p-6 shadow-2xl flex flex-col gap-4">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
                    <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-primary text-[22px]">help</span>
                        <h3 className="text-body-lg font-bold text-on-surface">Help & Operations Guide</h3>
                    </div>
                    <button className="text-on-surface-variant hover:text-on-surface p-1 micro-interaction" onClick={onClose} aria-label="Close modal">
                        <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-outline-variant/20 gap-4 pb-0.5">
                    <button
                        onClick={() => setActiveTab('roles')}
                        className={`bg-transparent border-none pb-2 text-[12px] font-bold uppercase tracking-wider cursor-pointer flex items-center gap-1.5 transition-all border-b-2 ${activeTab === 'roles' ? 'border-primary text-on-surface' : 'border-transparent text-on-surface-variant'
                            }`}
                    >
                        <span className="material-symbols-outlined text-[16px]">lock</span> Roles
                    </button>
                    <button
                        onClick={() => setActiveTab('workflows')}
                        className={`bg-transparent border-none pb-2 text-[12px] font-bold uppercase tracking-wider cursor-pointer flex items-center gap-1.5 transition-all border-b-2 ${activeTab === 'workflows' ? 'border-primary text-on-surface' : 'border-transparent text-on-surface-variant'
                            }`}
                    >
                        <span className="material-symbols-outlined text-[16px]">route</span> Workflows
                    </button>
                    <button
                        onClick={() => setActiveTab('security')}
                        className={`bg-transparent border-none pb-2 text-[12px] font-bold uppercase tracking-wider cursor-pointer flex items-center gap-1.5 transition-all border-b-2 ${activeTab === 'security' ? 'border-primary text-on-surface' : 'border-transparent text-on-surface-variant'
                            }`}
                    >
                        <span className="material-symbols-outlined text-[16px]">shield</span> Security
                    </button>
                </div>

                {/* Content */}
                <div className="py-2">
                    {renderTabContent()}
                </div>

                {/* Footer */}
                <div className="flex justify-end border-t border-outline-variant/20 pt-4 mt-2">
                    <button
                        type="button"
                        className="bg-primary text-on-primary hover:opacity-90 font-semibold py-2 px-5 rounded-lg text-body-sm transition-all micro-interaction min-w-[100px]"
                        onClick={onClose}
                    >
                        Got it
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
