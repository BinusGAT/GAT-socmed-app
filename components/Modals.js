'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useDashboard } from './DashboardContext';
import { getPicDisplayName } from '../utils/helpers';
import Icon from './Icon';
export { default as DeleteConfirmModal } from './modals/DeleteConfirmModal';
export { default as LinkModal } from './modals/LinkModal';
export { default as TaskLinksModal } from './modals/TaskLinksModal';

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
            <div className="w-full max-w-md bg-surface border border-border rounded-[10px] p-6 shadow-none space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border pb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-primary/10 rounded-[6px] flex items-center justify-center text-primary">
                            <Icon name="lock" size={20} weight="fill" />
                        </div>
                        <h2 className="text-base font-semibold text-foreground tracking-tight">CC Internal Gate</h2>
                    </div>
                    <button className="text-muted-foreground hover:text-foreground p-1 transition-colors rounded-[6px] cursor-pointer" onClick={onClose} aria-label="Close modal">
                        <Icon name="close" size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4">
                    {lockdownTimeText && (
                        <div className="flex items-center gap-2.5 p-3 bg-destructive/10 border border-destructive/20 rounded-[8px] text-destructive text-xs">
                            <Icon name="warning" size={16} />
                            <span className="font-medium">{lockdownTimeText}</span>
                        </div>
                    )}

                    {errorMsg && !lockdownTimeText && (
                        <div className="flex items-center gap-2.5 p-3 bg-destructive/10 border border-destructive/20 rounded-[8px] text-destructive text-xs">
                            <Icon name="error" size={16} />
                            <span className="font-medium">{errorMsg}</span>
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider block text-center font-medium">SELECT WORKSPACE ROLE</label>
                        <div className="grid grid-cols-3 gap-2">
                            <button
                                type="button"
                                className={`flex flex-col items-center justify-center p-3 rounded-[8px] border transition-colors cursor-pointer ${role === 'Admin'
                                        ? 'border-primary bg-primary/10 text-primary font-medium'
                                        : 'border-border bg-muted/40 text-muted-foreground hover:text-foreground hover:border-border-hover'
                                    }`}
                                onClick={() => !lockdownTimeText && setRole('Admin')}
                            >
                                <Icon name="admin_panel_settings" size={20} className="mb-1" />
                                <span className="text-[10px] font-medium tracking-wide uppercase">Admin</span>
                            </button>
                            <button
                                type="button"
                                className={`flex flex-col items-center justify-center p-3 rounded-[8px] border transition-colors cursor-pointer ${role === 'Creator'
                                        ? 'border-primary bg-primary/10 text-primary font-medium'
                                        : 'border-border bg-muted/40 text-muted-foreground hover:text-foreground hover:border-border-hover'
                                    }`}
                                onClick={() => !lockdownTimeText && setRole('Creator')}
                            >
                                <Icon name="palette" size={20} className="mb-1" />
                                <span className="text-[10px] font-medium tracking-wide uppercase">Creator</span>
                            </button>
                            <button
                                type="button"
                                className={`flex flex-col items-center justify-center p-3 rounded-[8px] border transition-colors cursor-pointer ${role === 'Viewer'
                                        ? 'border-primary bg-primary/10 text-primary font-medium'
                                        : 'border-border bg-muted/40 text-muted-foreground hover:text-foreground hover:border-border-hover'
                                    }`}
                                onClick={() => !lockdownTimeText && setRole('Viewer')}
                            >
                                <Icon name="visibility" size={20} className="mb-1" />
                                <span className="text-[10px] font-medium tracking-wide uppercase">Viewer</span>
                            </button>
                        </div>
                    </div>

                    {role !== 'Viewer' && (
                        <div className="space-y-2 animate-fade-in">
                            <label htmlFor="unlockPin" className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider block font-medium">
                                ACCESS KEY <span className="text-destructive">*</span>
                            </label>
                            <div className="relative">
                                <input
                                    type={showPasscode ? 'text' : 'password'}
                                    id="unlockPin"
                                    className="w-full bg-background border border-border rounded-[8px] pl-3 pr-10 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors font-mono"
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
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 cursor-pointer transition-colors"
                                    onClick={() => setShowPasscode(!showPasscode)}
                                    disabled={!!lockdownTimeText}
                                >
                                    <Icon name={showPasscode ? 'visibility_off' : 'visibility'} size={18} />
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button type="button" className="flex-1 bg-secondary text-secondary-foreground hover:bg-muted font-medium py-2.5 px-4 rounded-[8px] text-xs transition-colors cursor-pointer" onClick={onClose}>Cancel</button>
                        <button type="submit" className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 font-medium py-2.5 px-4 rounded-[8px] text-xs transition-colors cursor-pointer disabled:opacity-50" disabled={!!lockdownTimeText}>
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
            alert('Database URL saved! Reloading dashboard...');
            window.location.reload();
        } else {
            alert('Invalid URL. Please provide a valid Google Apps Script Web App URL.');
        }
    };

    const handleClear = () => {
        localStorage.removeItem('CUSTOM_SHEETS_SOURCE');
        alert('Custom URL cleared! Reloading...');
        window.location.reload();
    };

    return createPortal(
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-[999]">
            <div className="w-full max-w-md bg-surface border border-border rounded-[10px] p-6 shadow-none space-y-5">
                <div className="flex items-center justify-between border-b border-border pb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-primary/10 rounded-[6px] flex items-center justify-center text-primary">
                            <Icon name="database" size={20} weight="fill" />
                        </div>
                        <h2 className="text-base font-semibold text-foreground tracking-tight">Database Settings</h2>
                    </div>
                    <button className="text-muted-foreground hover:text-foreground p-1 transition-colors rounded-[6px] cursor-pointer" onClick={onClose} aria-label="Close modal">
                        <Icon name="close" size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4">
                    <div className="space-y-2">
                        <label htmlFor="dbSettingsUrl" className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider block font-medium">
                            Google Apps Script Web App URL
                        </label>
                        <input
                            type="url"
                            id="dbSettingsUrl"
                            className="w-full bg-background border border-border rounded-[8px] px-3 py-2 text-xs text-foreground font-mono placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
                            placeholder="https://script.google.com/macros/s/.../exec"
                            required
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                        />
                        <p className="text-[11px] text-muted-foreground leading-relaxed pt-1">
                            Paste your deployed Apps Script Web App URL here. This is saved locally in your browser's localStorage and is not shared or checked into Git.
                        </p>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button type="button" className="flex-1 bg-secondary text-secondary-foreground hover:bg-muted font-medium py-2 px-3 rounded-[8px] text-xs transition-colors cursor-pointer" onClick={onClose}>Cancel</button>
                        <button type="button" className="flex-1 bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 font-medium py-2 px-3 rounded-[8px] text-xs transition-colors cursor-pointer" onClick={handleClear}>Clear URL</button>
                        <button type="submit" className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 font-medium py-2 px-3 rounded-[8px] text-xs transition-colors cursor-pointer">Save Settings</button>
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
            <div className="w-full max-w-[420px] bg-surface border border-border rounded-[10px] p-6 shadow-none space-y-5">
                <div className="flex items-center justify-between border-b border-border pb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-primary/10 rounded-[6px] flex items-center justify-center text-primary">
                            <Icon name="date_range" size={20} />
                        </div>
                        <h2 className="text-base font-semibold text-foreground tracking-tight">Select Date Range</h2>
                    </div>
                    <button className="text-muted-foreground hover:text-foreground p-1 transition-colors rounded-[6px] cursor-pointer" onClick={onClose} aria-label="Close modal">
                        <Icon name="close" size={18} />
                    </button>
                </div>

                <div className="space-y-4">
                    {/* Presets Grid */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider block font-medium">Quick Presets</label>
                        <div className="grid grid-cols-2 gap-2">
                            {presets.map((preset) => (
                                <button
                                    key={preset.id}
                                    type="button"
                                    className={`py-2 px-3 text-left rounded-[8px] text-xs font-medium border transition-colors cursor-pointer truncate ${dateRange.mode === preset.id
                                            ? 'border-primary bg-primary/10 text-primary'
                                            : 'border-border bg-background text-foreground hover:border-border-hover hover:bg-muted/40'
                                        }`}
                                    onClick={() => applyPreset(preset.id)}
                                >
                                    {preset.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Custom Range Form */}
                    <form onSubmit={handleCustomApply} className="space-y-4 pt-3 border-t border-border">
                        <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider block font-medium">Custom Range</label>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-[10px] font-mono text-muted-foreground uppercase">Start Date</label>
                                <input
                                    type="text"
                                    className="w-full bg-background border border-border rounded-[8px] px-3 py-2 text-xs text-foreground font-mono cursor-pointer text-center hover:border-border-hover transition-colors"
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
                                <label className="text-[10px] font-mono text-muted-foreground uppercase">End Date</label>
                                <input
                                    type="text"
                                    className="w-full bg-background border border-border rounded-[8px] px-3 py-2 text-xs text-foreground font-mono cursor-pointer text-center hover:border-border-hover transition-colors"
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
                            <button type="button" className="bg-secondary text-secondary-foreground hover:bg-muted font-medium py-2 px-4 rounded-[8px] text-xs transition-colors cursor-pointer" onClick={onClose}>Cancel</button>
                            <button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium py-2 px-4 rounded-[8px] text-xs transition-colors cursor-pointer">Apply Range</button>
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
            <div className="w-full max-w-[340px] bg-surface border border-border rounded-[10px] p-4 shadow-none space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-border">
                    <h3 className="text-xs font-semibold text-foreground">Select Date</h3>
                    <button type="button" className="text-muted-foreground hover:text-foreground p-0.5 transition-colors rounded-[4px] cursor-pointer" onClick={onClose}>
                        <Icon name="close" size={16} />
                    </button>
                </div>

                {/* Calendar Navigation */}
                <div className="flex justify-between items-center">
                    <button type="button" className="w-8 h-8 flex items-center justify-center rounded-[6px] border border-border hover:bg-muted text-foreground cursor-pointer transition-colors" onClick={() => shiftMonth(-1)}>
                        <Icon name="chevron_left" size={16} />
                    </button>
                    <span className="font-medium text-xs text-foreground font-mono">{monthNames[month]} {year}</span>
                    <button type="button" className="w-8 h-8 flex items-center justify-center rounded-[6px] border border-border hover:bg-muted text-foreground cursor-pointer transition-colors" onClick={() => shiftMonth(1)}>
                        <Icon name="chevron_right" size={16} />
                    </button>
                </div>

                {/* Weekday headers */}
                <div className="grid grid-cols-7 text-center text-[10px] font-mono font-medium text-muted-foreground uppercase tracking-wider py-1 border-b border-border">
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
                                className={`h-8 w-full border-none rounded-[6px] text-xs font-mono cursor-pointer flex items-center justify-center transition-colors ${isSelected
                                        ? 'bg-primary text-primary-foreground font-medium'
                                        : 'bg-transparent text-foreground hover:bg-muted font-normal'
                                    }`}
                            >
                                {dayStr}
                            </button>
                        );
                    })}
                </div>

                <div className="flex justify-end pt-2 border-t border-border">
                    <button type="button" className="bg-secondary text-secondary-foreground hover:bg-muted font-medium py-1.5 px-3 rounded-[8px] text-xs transition-colors cursor-pointer" onClick={onClose}>Close</button>
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
                
                /* Standard typography and fallback */
                body, button, input, select {
                    font-family: var(--font-geist-sans), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
                }

                /* Basic color fallbacks */
                .text-primary { color: #ea580c !important; }
                .text-on-surface-variant { color: ${exportTheme === 'light' ? '#71717a' : '#a1a1aa'} !important; }
                
                /* Category/PIC badge color definitions */
                .bg-emerald-500\/10 { background-color: rgba(16, 185, 129, 0.12) !important; }
                .text-emerald-400 { color: ${exportTheme === 'light' ? '#059669' : '#34d399'} !important; }
                .border-emerald-500\/20 { border-color: rgba(16, 185, 129, 0.25) !important; }

                .bg-sky-500\/10 { background-color: rgba(14, 165, 233, 0.12) !important; }
                .text-sky-400 { color: ${exportTheme === 'light' ? '#0284c7' : '#38bdf8'} !important; }
                .border-sky-500\/20 { border-color: rgba(14, 165, 233, 0.25) !important; }

                .bg-purple-500\/10 { background-color: rgba(168, 85, 247, 0.12) !important; }
                .text-purple-400 { color: ${exportTheme === 'light' ? '#7e22ce' : '#c084fc'} !important; }
                .border-purple-500\/20 { border-color: rgba(168, 85, 247, 0.25) !important; }

                .bg-pink-500\/10 { background-color: rgba(236, 72, 153, 0.12) !important; }
                .text-pink-400 { color: ${exportTheme === 'light' ? '#be185d' : '#f472b6'} !important; }
                .border-pink-500\/20 { border-color: rgba(236, 72, 153, 0.25) !important; }

                .bg-amber-500\/10 { background-color: rgba(245, 158, 11, 0.12) !important; }
                .text-amber-400 { color: ${exportTheme === 'light' ? '#d97706' : '#fbbf24'} !important; }
                .border-amber-500\/20 { border-color: rgba(245, 158, 11, 0.25) !important; }

                .bg-rose-500\/10 { background-color: rgba(244, 63, 94, 0.12) !important; }
                .text-rose-400 { color: ${exportTheme === 'light' ? '#e11d48' : '#fb7185'} !important; }
                .border-rose-500\/20 { border-color: rgba(244, 63, 94, 0.25) !important; }

                .bg-blue-500\/10 { background-color: rgba(59, 130, 246, 0.12) !important; }
                .text-blue-400 { color: ${exportTheme === 'light' ? '#2563eb' : '#60a5fa'} !important; }
                .border-blue-500\/20 { border-color: rgba(59, 130, 246, 0.25) !important; }

                /* Status day backgrounds */
                .bg-emerald-500\/5 { background-color: rgba(16, 185, 129, 0.06) !important; }
                .bg-rose-500\/5 { background-color: rgba(244, 63, 94, 0.06) !important; }
                .bg-sky-500\/5 { background-color: rgba(14, 165, 233, 0.06) !important; }
                .bg-amber-500\/5 { background-color: rgba(245, 158, 11, 0.06) !important; }
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
            clone.querySelectorAll('span.material-symbols-outlined, svg[data-icon="task_alt"]').forEach(el => {
                if (el.textContent.trim() === 'task_alt' || el.getAttribute('data-icon') === 'task_alt') {
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
                    if (!isMeeting && pic !== selectedPic && getPicDisplayName(pic) !== getPicDisplayName(selectedPic)) {
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
            alert('Calendar image copied to clipboard!');
        } catch (err) {
            console.error('Failed to copy to clipboard:', err);
            alert('Failed to copy to clipboard. Please download the PNG instead.');
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
            <div className="w-full max-w-[680px] bg-surface border border-border rounded-[10px] overflow-hidden flex flex-col shadow-none">
                <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                    <h3 className="text-xs font-semibold flex items-center gap-2 text-foreground">
                        <Icon name="image" size={18} className="text-primary" /> Export Calendar
                    </h3>
                    <div className="flex gap-3 items-center ml-auto mr-4">
                        <span className="text-[10px] font-mono font-medium text-muted-foreground uppercase tracking-wider">Theme:</span>
                        <div className="flex bg-muted/40 rounded-[6px] border border-border p-0.5">
                            <button
                                type="button"
                                onClick={() => setExportTheme('light')}
                                className={`px-2.5 py-0.5 text-[10px] font-medium rounded-[4px] cursor-pointer transition-colors ${exportTheme === 'light' ? 'bg-surface text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                Light
                            </button>
                            <button
                                type="button"
                                onClick={() => setExportTheme('dark')}
                                className={`px-2.5 py-0.5 text-[10px] font-medium rounded-[4px] cursor-pointer transition-colors ${exportTheme === 'dark' ? 'bg-surface text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                Dark
                            </button>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="text-muted-foreground hover:text-foreground p-1 transition-colors rounded-[6px] cursor-pointer"
                        onClick={onClose}
                    >
                        <Icon name="close" size={18} />
                    </button>
                </div>
                {/* Export filter settings */}
                <div className="px-5 py-3 border-b border-border flex gap-4 items-center flex-wrap bg-muted/20 text-xs">
                    {hasMeetings && (
                        <label className="flex items-center gap-2 text-xs cursor-pointer select-none text-foreground mr-2">
                            <input
                                type="checkbox"
                                checked={showMeetings}
                                onChange={(e) => setShowMeetings(e.target.checked)}
                                className="cursor-pointer rounded-[4px] border-border bg-background text-primary focus:ring-primary h-3.5 w-3.5"
                            />
                            <span>Meetings</span>
                        </label>
                    )}

                    <div className="flex items-center gap-2">
                        <label className="text-xs font-medium text-muted-foreground">PIC:</label>
                        <select
                            className="bg-background border border-border rounded-[6px] px-2.5 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer font-mono"
                            value={selectedPic}
                            onChange={(e) => setSelectedPic(e.target.value)}
                        >
                            <option value="All">All PICs</option>
                            {memberListData.map(m => (
                                <option key={m.NAMA} value={m.NAMA}>{getPicDisplayName(m.NAMA)}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <label className="text-xs font-medium text-muted-foreground">Category:</label>
                        <select
                            className="bg-background border border-border rounded-[6px] px-2.5 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
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
                        <div className="flex flex-col items-center gap-3 text-muted-foreground">
                            <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                            <p className="text-xs">Generating calendar preview...</p>
                        </div>
                    )}
                    {!isLoading && previewUrl && (
                        <div className={`w-full max-w-[500px] border border-border rounded-[8px] p-2 flex justify-center ${exportTheme === 'light' ? 'bg-surface' : 'bg-background'
                            }`}>
                            <img src={previewUrl} alt="Calendar Export Preview" className="max-w-full h-auto rounded object-contain" />
                        </div>
                    )}
                </div>

                {/* Actions Footer */}
                <div className="flex gap-3 px-5 py-4 border-t border-border justify-end bg-muted/20">
                    <button
                        type="button"
                        className="bg-secondary text-secondary-foreground hover:bg-muted font-medium py-2 px-4 rounded-[8px] text-xs transition-colors cursor-pointer"
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="bg-secondary text-foreground border border-border hover:bg-muted font-medium py-2 px-4 rounded-[8px] text-xs transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                        onClick={handleCopy}
                        disabled={isLoading || !imageBlob}
                    >
                        <Icon name="content_copy" size={16} /> Copy Image
                    </button>
                    <button
                        type="button"
                        className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium py-2 px-4 rounded-[8px] text-xs transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                        onClick={handleDownload}
                        disabled={isLoading || !previewUrl}
                    >
                        <Icon name="download" size={16} /> Download PNG
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}

// ----------------------------------------------------
// 8. HELP & OPERATIONS GUIDE MODAL
// ----------------------------------------------------
export function HelpGuideModal({ isOpen, onClose }) {
    const { userRole, appSettingsData } = useDashboard();
    const [activeTab, setActiveTab] = useState('roles');

    if (!isOpen) return null;
    if (typeof window === 'undefined') return null;

    const renderTabContent = () => {
        switch (activeTab) {
            case 'roles':
                return (
                    <div className="space-y-4">
                        <div className="p-3 bg-primary/10 border border-primary/20 rounded-[8px] text-xs flex items-center gap-2.5 text-foreground">
                            <Icon name="check_circle" size={16} className="text-primary" />
                            <span>Authenticated under <strong className="text-primary">{userRole === 'Admin' ? 'ADMIN MODE' : userRole === 'Creator' ? 'CREATOR MODE' : 'VIEWER MODE'}</strong>.</span>
                        </div>

                        <p className="text-xs text-muted-foreground leading-relaxed">
                            {appSettingsData?.app_full_name || appSettingsData?.app_name || 'The workspace'} dynamically adapts its interface and access controls based on the authenticated role.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                            {/* Admin Card */}
                            <div className={`border rounded-[8px] p-3.5 bg-muted/20 flex flex-col gap-2 transition-colors ${userRole === 'Admin' ? 'border-primary' : 'border-border opacity-70'
                                }`}>
                                <div className="flex items-center gap-2 text-primary font-semibold text-xs tracking-wide uppercase">
                                    <Icon name="admin_panel_settings" size={16} />
                                    <span>ADMIN MODE</span>
                                </div>
                                <ul className="list-disc pl-4 text-[11px] text-muted-foreground space-y-1 leading-normal">
                                    <li>Full read &amp; write access to all tabs.</li>
                                    <li>Add, edit, or delete any task, calendar event, meeting memo, or draft.</li>
                                    <li>Authorized to sync and write back records to the main database.</li>
                                </ul>
                            </div>

                            {/* Creator Card */}
                            <div className={`border rounded-[8px] p-3.5 bg-muted/20 flex flex-col gap-2 transition-colors ${userRole === 'Creator' ? 'border-primary' : 'border-border opacity-70'
                                }`}>
                                <div className="flex items-center gap-2 text-primary font-semibold text-xs tracking-wide uppercase">
                                    <Icon name="palette" size={16} />
                                    <span>CREATOR MODE</span>
                                </div>
                                <ul className="list-disc pl-4 text-[11px] text-muted-foreground space-y-1 leading-normal">
                                    <li>Optimized read-focused workstation.</li>
                                    <li>Can view analytics, calendars, and dashboards without accidental edits.</li>
                                    <li>Full permissions to add and edit meeting memos and storyboard drafts.</li>
                                </ul>
                            </div>

                            {/* Viewer Card */}
                            <div className={`border rounded-[8px] p-3.5 bg-muted/20 flex flex-col gap-2 transition-colors ${userRole === 'Viewer' ? 'border-primary' : 'border-border opacity-70'
                                }`}>
                                <div className="flex items-center gap-2 text-primary font-semibold text-xs tracking-wide uppercase">
                                    <Icon name="visibility" size={16} />
                                    <span>VIEWER MODE</span>
                                </div>
                                <ul className="list-disc pl-4 text-[11px] text-muted-foreground space-y-1 leading-normal">
                                    <li>Strictly read-only monitoring dashboard.</li>
                                    <li>Can view main dashboard and performance analytics charts.</li>
                                    <li>All content database forms, storyboards, and calendar schedulers are hidden.</li>
                                </ul>
                            </div>
                        </div>

                        <div className="text-[11px] text-muted-foreground/60 border-t border-border pt-3 flex items-center gap-2">
                            <Icon name="info" size={14} />
                            <span>Workspace role can be changed on the Lock screen by re-entering the staff key.</span>
                        </div>
                    </div>
                );
            case 'workflows':
                return (
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Navigate through the sidebar to coordinate content operations:
                        </p>

                        <div className="space-y-2 border border-border rounded-[8px] p-3 bg-muted/20 text-xs divide-y divide-border">
                            <div className="flex gap-3 items-start pb-2">
                                <div className="min-w-[100px] font-medium text-foreground flex items-center gap-1.5 text-xs">
                                    <Icon name="dashboard" size={14} className="text-primary" />Home
                                </div>
                                <div className="text-[11px] text-muted-foreground leading-normal">
                                    Overview of total publication views, reaches, follow growth, and recent performance highlights.
                                </div>
                            </div>

                            <div className="flex gap-3 items-start py-2">
                                <div className="min-w-[100px] font-medium text-foreground flex items-center gap-1.5 text-xs">
                                    <Icon name="calendar_month" size={14} className="text-primary" />Planner
                                </div>
                                <div className="text-[11px] text-muted-foreground leading-normal">
                                    Visual publication timeline. Useful for seeing scheduled posting dates. Exports clean PNGs for team updates.
                                </div>
                            </div>

                            <div className="flex gap-3 items-start py-2">
                                <div className="min-w-[100px] font-medium text-foreground flex items-center gap-1.5 text-xs">
                                    <Icon name="assignment" size={14} className="text-primary" />Task List
                                </div>
                                <div className="text-[11px] text-muted-foreground leading-normal">
                                    Tracks action items, priorities, and deadlines. Filter by "Due Today", status, or PIC.
                                </div>
                            </div>

                            <div className="flex gap-3 items-start py-2">
                                <div className="min-w-[100px] font-medium text-foreground flex items-center gap-1.5 text-xs">
                                    <Icon name="folder_open" size={14} className="text-primary" />Library
                                </div>
                                <div className="text-[11px] text-muted-foreground leading-normal">
                                    Where storyboards, hooks, and drafts are written. Helps refine scripts before filming.
                                </div>
                            </div>

                            <div className="flex gap-3 items-start py-2">
                                <div className="min-w-[100px] font-medium text-foreground flex items-center gap-1.5 text-xs">
                                    <Icon name="description" size={14} className="text-primary" />Memos
                                </div>
                                <div className="text-[11px] text-muted-foreground leading-normal">
                                    Log meeting notes and action points. Click any card to instantly scroll down and edit its content.
                                </div>
                            </div>

                            <div className="flex gap-3 items-start pt-2">
                                <div className="min-w-[100px] font-medium text-foreground flex items-center gap-1.5 text-xs">
                                    <Icon name="analytics" size={14} className="text-primary" />Analytics
                                </div>
                                <div className="text-[11px] text-muted-foreground leading-normal">
                                    Detailed trend breakdown (monthly/weekly), engagement metrics, and rank lists for PICs and platforms.
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'security':
                return (
                    <div className="space-y-4">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Security controls and offline caching mechanisms of the platform:
                        </p>

                        <div className="space-y-3">
                            <div className="flex gap-3">
                                <Icon name="lock" size={16} className="text-primary mt-0.5" />
                                <div>
                                    <strong className="text-xs text-foreground block font-medium uppercase tracking-wide">Automatic Session Locking</strong>
                                    <span className="text-[11px] text-muted-foreground leading-normal block">
                                        Refreshing the page or closing the tab automatically locks database access. This is an intentional security control to safeguard database credentials.
                                    </span>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <Icon name="warning" size={16} className="text-destructive mt-0.5" />
                                <div>
                                    <strong className="text-xs text-foreground block font-medium uppercase tracking-wide">Brute Force Lockdown</strong>
                                    <span className="text-[11px] text-muted-foreground leading-normal block">
                                        Entering incorrect access passcodes 5 consecutive times triggers an automatic 6-hour browser lockdown where no credentials will be accepted.
                                    </span>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <Icon name="cloud_sync" size={16} className="text-primary mt-0.5" />
                                <div>
                                    <strong className="text-xs text-foreground block font-medium uppercase tracking-wide">Local Sync &amp; Caching</strong>
                                    <span className="text-[11px] text-muted-foreground leading-normal block">
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
            <div className="w-full max-w-[560px] bg-surface border border-border rounded-[10px] p-6 shadow-none flex flex-col gap-4">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border pb-3">
                    <div className="flex items-center gap-2.5">
                        <Icon name="help" size={20} className="text-primary" />
                        <h3 className="text-sm font-semibold text-foreground tracking-tight">Help &amp; Operations Guide</h3>
                    </div>
                    <button className="text-muted-foreground hover:text-foreground p-1 transition-colors rounded-[6px] cursor-pointer" onClick={onClose} aria-label="Close modal">
                        <Icon name="close" size={18} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-border gap-4 pb-0.5">
                    <button
                        onClick={() => setActiveTab('roles')}
                        className={`bg-transparent border-none pb-2 text-xs font-mono font-medium uppercase tracking-wider cursor-pointer flex items-center gap-1.5 transition-colors border-b-2 ${activeTab === 'roles' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        <Icon name="lock" size={14} /> Roles
                    </button>
                    <button
                        onClick={() => setActiveTab('workflows')}
                        className={`bg-transparent border-none pb-2 text-xs font-mono font-medium uppercase tracking-wider cursor-pointer flex items-center gap-1.5 transition-colors border-b-2 ${activeTab === 'workflows' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        <Icon name="route" size={14} /> Workflows
                    </button>
                    <button
                        onClick={() => setActiveTab('security')}
                        className={`bg-transparent border-none pb-2 text-xs font-mono font-medium uppercase tracking-wider cursor-pointer flex items-center gap-1.5 transition-colors border-b-2 ${activeTab === 'security' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        <Icon name="shield" size={14} /> Security
                    </button>
                </div>

                {/* Content */}
                <div className="py-2">
                    {renderTabContent()}
                </div>

                {/* Footer */}
                <div className="flex justify-end border-t border-border pt-4 mt-2">
                    <button
                        type="button"
                        className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium py-2 px-5 rounded-[8px] text-xs transition-colors cursor-pointer min-w-[100px]"
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
