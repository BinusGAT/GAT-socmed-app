'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useDashboard } from './DashboardContext';

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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMsg('');

        if (getLockdownTimeRemaining() > 0) {
            setErrorMsg('System is currently locked down. Please wait.');
            return;
        }

        if (!passcode) {
            setErrorMsg('Please enter the access key.');
            return;
        }

        try {
            const success = await unlockWorkspace(role, passcode);
            if (success) {
                onClose();
            }
        } catch (error) {
            setErrorMsg(error.message || 'Authentication failed.');
        }
    };

    return (
        <div className="modal-overlay" style={{ display: 'flex' }}>
            <div className="gate-modal-card">
                <div className="gate-modal-header">
                    <h2><i className="fa-solid fa-user-lock"></i> CC Internal Gate</h2>
                    <button className="gate-modal-close" onClick={onClose} aria-label="Close modal">
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                </div>
                <form onSubmit={handleSubmit} autoComplete="off">
                    <div className="modal-card-body" style={{ padding: '20px' }}>
                        {lockdownTimeText && (
                            <div className="lockdown-alert" style={{
                                color: '#ef4444',
                                background: 'rgba(239, 68, 68, 0.08)',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                padding: '12px',
                                borderRadius: '6px',
                                marginBottom: '1.25rem',
                                fontSize: '0.875rem',
                                fontWeight: 500,
                                textAlign: 'center',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px'
                            }}>
                                <i className="fa-solid fa-triangle-exclamation"></i>
                                <span>{lockdownTimeText}</span>
                            </div>
                        )}

                        {errorMsg && (
                            <div className="unlock-alert" style={{
                                color: '#ef4444',
                                background: 'rgba(239, 68, 68, 0.08)',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                padding: '10px 14px',
                                borderRadius: '4px',
                                marginBottom: '1rem',
                                fontSize: '0.8125rem',
                                fontWeight: 500,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}>
                                <i className="fa-solid fa-circle-exclamation"></i>
                                <span>{errorMsg}</span>
                            </div>
                        )}

                        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                            <label className="gate-label">SELECT WORKSPACE ROLE</label>
                            <div className="gate-role-grid">
                                <div 
                                    className={`gate-role-card ${role === 'Admin' ? 'active' : ''}`}
                                    onClick={() => !lockdownTimeText && setRole('Admin')}
                                >
                                    <div className="gate-role-icon-box">
                                        <i className="fa-solid fa-user-gear"></i>
                                    </div>
                                    <span className="gate-role-title">ADMIN MODE</span>
                                </div>
                                <div 
                                    className={`gate-role-card ${role === 'Creator' ? 'active' : ''}`}
                                    onClick={() => !lockdownTimeText && setRole('Creator')}
                                >
                                    <div className="gate-role-icon-box">
                                        <i className="fa-solid fa-palette"></i>
                                    </div>
                                    <span className="gate-role-title">CREATOR MODE</span>
                                </div>
                            </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                            <label htmlFor="unlockPin" className="gate-label">
                                GAT STAFF ACCESS KEY <span className="required" style={{ color: '#ef4444' }}>*</span>
                            </label>
                            <div className="gate-input-wrapper">
                                <input
                                    type={showPasscode ? 'text' : 'password'}
                                    id="unlockPin"
                                    className="gate-input"
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
                                    className="gate-input-toggle"
                                    onClick={() => setShowPasscode(!showPasscode)}
                                    disabled={!!lockdownTimeText}
                                >
                                    <i className={`fa-solid ${showPasscode ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="gate-modal-footer">
                        <button type="button" className="gate-btn-cancel" onClick={onClose}>Cancel</button>
                        <button type="submit" className="gate-btn-submit" disabled={!!lockdownTimeText}>Enable Edit Mode</button>
                    </div>
                    <div className="gate-modal-bottom-text">
                        GAT ContentManager Internal Content Team
                    </div>
                </form>
            </div>
        </div>
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

    return (
        <div className="modal-overlay" style={{ display: 'flex' }}>
            <div className="modal-card">
                <div className="modal-card-header">
                    <h2><i className="fa-solid fa-database"></i> Database Settings</h2>
                    <button className="modal-close" onClick={onClose} aria-label="Close modal">
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                </div>
                <form onSubmit={handleSubmit} autoComplete="off">
                    <div className="modal-card-body">
                        <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                            <label htmlFor="dbSettingsUrl">Google Apps Script Web App URL</label>
                            <input
                                type="url"
                                id="dbSettingsUrl"
                                className="form-control"
                                placeholder="https://script.google.com/macros/s/.../exec"
                                required
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                style={{ width: '100%', marginTop: '6px' }}
                            />
                            <span style={{ fontSize: '11px', color: 'var(--ink-muted)', display: 'block', marginTop: '6px', lineHeight: '1.4' }}>
                                Paste your deployed Apps Script Web App URL here. This is saved locally in your browser's localStorage and is not shared or checked into Git.
                            </span>
                        </div>
                    </div>
                    <div className="modal-card-footer" style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
                        <button type="button" className="btn btn-danger" onClick={handleClear}>Clear Custom URL</button>
                        <button type="submit" className="btn btn-primary">Save Settings</button>
                    </div>
                </form>
            </div>
        </div>
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
                // 'auto' / 'all'
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

    return (
        <div className="modal-overlay" style={{ display: 'flex' }}>
            <div className="modal-card" style={{ maxWidth: '420px' }}>
                <div className="modal-card-header">
                    <h2><i className="fa-solid fa-calendar-week"></i> Select Date Range</h2>
                    <button className="modal-close" onClick={onClose} aria-label="Close modal">
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                </div>
                <div className="modal-card-body">
                    {/* Preset Buttons */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '1.25rem' }}>
                        <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--ink-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Quick Presets</label>
                        {presets.map((preset) => (
                            <button
                                key={preset.id}
                                type="button"
                                className="btn btn-outline"
                                onClick={() => applyPreset(preset.id)}
                                style={{
                                    textAlign: 'left',
                                    justifyContent: 'flex-start',
                                    padding: '8px 12px',
                                    fontSize: '0.875rem',
                                    fontWeight: dateRange.mode === preset.id ? '600' : '400',
                                    borderColor: dateRange.mode === preset.id ? 'var(--primary)' : 'var(--hairline)',
                                    color: dateRange.mode === preset.id ? 'var(--primary)' : 'inherit',
                                    background: dateRange.mode === preset.id ? 'var(--primary-bg)' : 'none'
                                }}
                            >
                                {preset.label}
                            </button>
                        ))}
                    </div>

                    {/* Custom Range Form */}
                    <form onSubmit={handleCustomApply} style={{ borderTop: '1px solid var(--hairline)', paddingTop: '1rem' }}>
                        <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--ink-muted)', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Custom Range</label>
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>Start Date</label>
                                <input
                                    type="text"
                                    className="form-control custom-date-input"
                                    placeholder="YYYY-MM-DD"
                                    value={start}
                                    onClick={() => {
                                        onOpenDatePicker((selectedDate) => {
                                            setStart(selectedDate);
                                        }, start);
                                    }}
                                    readOnly
                                    style={{ width: '100%', cursor: 'pointer' }}
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>End Date</label>
                                <input
                                    type="text"
                                    className="form-control custom-date-input"
                                    placeholder="YYYY-MM-DD"
                                    value={end}
                                    onClick={() => {
                                        onOpenDatePicker((selectedDate) => {
                                            setEnd(selectedDate);
                                        }, end);
                                    }}
                                    readOnly
                                    style={{ width: '100%', cursor: 'pointer' }}
                                />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
                            <button type="submit" className="btn btn-primary">Apply Range</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
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

    return (
        <div className="modal-overlay" style={{ display: 'flex', zIndex: 20000 }}>
            <div className="modal-card" style={{ maxWidth: '340px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 600 }}>Select Date</h3>
                    <button type="button" className="modal-close" onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                </div>
                
                {/* Calendar Navigation */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <button type="button" className="calendar-nav-btn" onClick={() => shiftMonth(-1)} style={{ padding: '4px 8px' }}>
                        <i className="fa-solid fa-chevron-left" style={{ fontSize: '10px' }}></i>
                    </button>
                    <span style={{ fontWeight: 600, fontSize: '13px' }}>{monthNames[month]} {year}</span>
                    <button type="button" className="calendar-nav-btn" onClick={() => shiftMonth(1)} style={{ padding: '4px 8px' }}>
                        <i className="fa-solid fa-chevron-right" style={{ fontSize: '10px' }}></i>
                    </button>
                </div>

                {/* Weekday headers */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', fontSize: '11px', fontWeight: 600, color: 'var(--ink-muted)', marginBottom: '6px' }}>
                    <div>Su</div>
                    <div>Mo</div>
                    <div>Tu</div>
                    <div>We</div>
                    <div>Th</div>
                    <div>Fr</div>
                    <div>Sa</div>
                </div>

                {/* Calendar Days */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                    {Array.from({ length: totalCells }).map((_, cellIndex) => {
                        const dayNumber = cellIndex - startOffset + 1;
                        const isInMonth = dayNumber >= 1 && dayNumber <= daysInMonth;

                        if (!isInMonth) {
                            return <div key={cellIndex} style={{ height: '32px' }}></div>;
                        }

                        const dayStr = String(dayNumber);
                        const isSelected = initialDate === `${year}-${String(month+1).padStart(2,'0')}-${String(dayNumber).padStart(2,'0')}`;

                        return (
                            <button
                                key={cellIndex}
                                type="button"
                                onClick={() => handleSelectDay(dayNumber)}
                                style={{
                                    height: '32px',
                                    width: '100%',
                                    border: 'none',
                                    borderRadius: 'var(--radius-sm)',
                                    background: isSelected ? 'var(--primary)' : 'none',
                                    color: isSelected ? '#ffffff' : 'inherit',
                                    fontSize: '12px',
                                    fontWeight: isSelected ? '700' : '500',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'background 0.15s ease'
                                }}
                                className="calendar-picker-day-btn"
                            >
                                {dayStr}
                            </button>
                        );
                    })}
                </div>

                 <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px', borderTop: '1px solid var(--hairline)', paddingTop: '8px' }}>
                    <button type="button" className="btn btn-outline btn-sm" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
}

// ----------------------------------------------------
// 5. CALENDAR EXPORT MODAL
// ----------------------------------------------------
export function CalendarExportModal({ isOpen, onClose }) {
    const [exportTheme, setExportTheme] = useState('light');
    const [isLoading, setIsLoading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState('');
    const [imageBlob, setImageBlob] = useState(null);

    // Filter states
    const [showMeetings, setShowMeetings] = useState(true);
    const [selectedPic, setSelectedPic] = useState('All');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [hasMeetings, setHasMeetings] = useState(false);

    // Regenerate preview whenever the modal opens or theme changes
    useEffect(() => {
        if (isOpen) {
            const isBodyDark = document.body.classList.contains('dark-mode');
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

        // Wait a short tick
        await new Promise(resolve => setTimeout(resolve, 100));

        // Create a hidden iframe for consistent aspect ratio
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

            // Copy stylesheets and inline styles
            Array.from(document.querySelectorAll('link[rel="stylesheet"], style')).forEach(el => {
                doc.head.appendChild(el.cloneNode(true));
            });

            // Inject layout helper styles
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
                    border: 1.5px solid var(--hairline-strong) !important;
                    border-radius: var(--radius-lg) !important;
                    margin: 0 !important;
                    padding: 24px !important;
                    display: flex !important;
                    flex-direction: column !important;
                    box-sizing: border-box !important;
                    gap: 16px !important;
                }
                .calendar-toolbar {
                    display: flex !important;
                    justify-content: space-between !important;
                    align-items: center !important;
                    width: 100% !important;
                    margin-bottom: 8px !important;
                }
                .calendar-weekdays {
                    display: grid !important;
                    grid-template-columns: repeat(7, 1fr) !important;
                    gap: 12px !important;
                    width: 100% !important;
                    padding-bottom: 8px !important;
                    border-bottom: 1px solid var(--hairline) !important;
                    color: var(--ink-secondary) !important;
                }
                .calendar-days {
                    display: grid !important;
                    grid-template-columns: repeat(7, 1fr) !important;
                    gap: 12px !important;
                    flex-grow: 1 !important;
                    grid-auto-rows: 1fr !important;
                    width: 100% !important;
                }
                .calendar-day {
                    min-height: 0 !important;
                    height: 100% !important;
                    padding: 10px 8px !important;
                    border: 1.5px solid var(--hairline-strong) !important;
                    border-radius: var(--radius-md) !important;
                    display: flex !important;
                    flex-direction: column !important;
                    justify-content: flex-start !important;
                    box-sizing: border-box !important;
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
                    border-radius: var(--radius-sm) !important;
                    font-weight: 700 !important;
                }
                .calendar-day-task-category {
                    font-size: 11px !important;
                    font-weight: 600 !important;
                    margin-top: 2px !important;
                }
                body.dark-mode .calendar-day-task-category {
                    color: #e5e7eb !important;
                }
                body.dark-mode .calendar-weekdays {
                    color: #e5e7eb !important;
                }
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
            // Remove navigation and export/today actions in the exported image
            clone.querySelectorAll('.calendar-nav-btn').forEach(el => el.remove());
            const toolbarActions = clone.querySelector('.calendar-toolbar-actions');
            if (toolbarActions) {
                toolbarActions.remove();
            }
            clone.removeAttribute('style');

            // Filter elements based on user options
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

            // Remove active highlights
            clone.querySelectorAll('.calendar-day').forEach(el => {
                el.classList.remove('today');
                el.classList.remove('selected');
            });

            doc.body.appendChild(clone);

            // Wait for stylesheet loaded
            await new Promise(resolve => setTimeout(resolve, 150));

            const captureTarget = doc.querySelector('.calendar-shell');
            if (!captureTarget) {
                throw new Error('Capture target not found');
            }

            if (typeof window === 'undefined' || !window.html2canvas) {
                throw new Error('html2canvas library is not loaded yet');
            }

            const canvas = await window.html2canvas(captureTarget, {
                backgroundColor: exportTheme === 'light' ? '#ffffff' : '#0c0c0e',
                scale: 3,
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
        const filename = `Calendar-${monthLabel.replace(/\s+/g, '-')}-${exportTheme.toUpperCase()}.png`;

        const link = document.createElement('a');
        link.download = filename;
        link.href = previewUrl;
        link.click();
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" style={{ display: 'flex', zIndex: 12000 }}>
            <div className="calendar-export-content" style={{
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--hairline)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-overlay)',
                display: 'flex',
                flexDirection: 'column',
                maxWidth: '680px',
                width: '100%',
                overflow: 'hidden'
            }}>
                <div className="calendar-export-header" style={{
                    padding: '16px 20px',
                    borderBottom: '1px solid var(--hairline)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                        <i className="fa-solid fa-file-image" style={{ color: 'var(--primary)' }}></i> Export Calendar
                    </h3>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginLeft: 'auto', marginRight: '16px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--ink-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Theme:</span>
                        <div style={{ display: 'flex', background: 'var(--canvas)', borderRadius: 'var(--radius-sm)', padding: '2px', border: '1px solid var(--hairline)' }}>
                            <button 
                                type="button" 
                                onClick={() => setExportTheme('light')} 
                                style={{
                                    padding: '4px 10px',
                                    fontSize: '11px',
                                    border: 'none',
                                    borderRadius: 'var(--radius-xs)',
                                    background: exportTheme === 'light' ? 'var(--surface)' : 'transparent',
                                    color: exportTheme === 'light' ? 'var(--primary)' : 'var(--ink-muted)',
                                    fontWeight: exportTheme === 'light' ? 700 : 500,
                                    cursor: 'pointer',
                                    boxShadow: exportTheme === 'light' ? 'var(--shadow-soft)' : 'none'
                                }}
                            >
                                Light
                            </button>
                            <button 
                                type="button" 
                                onClick={() => setExportTheme('dark')} 
                                style={{
                                    padding: '4px 10px',
                                    fontSize: '11px',
                                    border: 'none',
                                    borderRadius: 'var(--radius-xs)',
                                    background: exportTheme === 'dark' ? 'var(--surface)' : 'transparent',
                                    color: exportTheme === 'dark' ? 'var(--primary)' : 'var(--ink-muted)',
                                    fontWeight: exportTheme === 'dark' ? 700 : 500,
                                    cursor: 'pointer',
                                    boxShadow: exportTheme === 'dark' ? 'var(--shadow-soft)' : 'none'
                                }}
                            >
                                Dark
                            </button>
                        </div>
                    </div>
                    <button 
                        type="button" 
                        className="modal-close" 
                        onClick={onClose} 
                        style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '16px', color: 'var(--ink-muted)' }}
                    >
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                </div>
                {/* Export filter settings */}
                <div className="calendar-export-settings" style={{
                    padding: '12px 20px',
                    borderBottom: '1px solid var(--hairline)',
                    display: 'flex',
                    gap: '16px',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    backgroundColor: 'var(--surface)'
                }}>
                    {hasMeetings && (
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer', userSelect: 'none', margin: 0, color: 'var(--ink)', marginRight: '8px' }}>
                            <input 
                                type="checkbox" 
                                checked={showMeetings} 
                                onChange={(e) => setShowMeetings(e.target.checked)} 
                                style={{ cursor: 'pointer', margin: 0 }} 
                            />
                            <span>Include Meetings</span>
                        </label>
                    )}
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink-muted)', margin: 0 }}>PIC:</label>
                        <select 
                            className="form-control" 
                            value={selectedPic} 
                            onChange={(e) => setSelectedPic(e.target.value)}
                            style={{ 
                                padding: '4px 8px', 
                                fontSize: '12px', 
                                height: 'auto', 
                                width: '120px', 
                                borderRadius: 'var(--radius-sm)', 
                                border: '1px solid var(--hairline)',
                                background: 'var(--surface)',
                                color: 'var(--ink)'
                            }}
                        >
                            <option value="All">All PICs</option>
                            <option value="Kelvin">Kelvin</option>
                            <option value="Felix">Felix</option>
                            <option value="Eduard">Eduard</option>
                            <option value="Anthoni">Anthoni</option>
                            <option value="Leonardi">Leonardi</option>
                            <option value="Ruliyanto">Ruliyanto</option>
                            <option value="Rafael">Rafael</option>
                        </select>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink-muted)', margin: 0 }}>Category:</label>
                        <select 
                            className="form-control" 
                            value={selectedCategory} 
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            style={{ 
                                padding: '4px 8px', 
                                fontSize: '12px', 
                                height: 'auto', 
                                width: '140px', 
                                borderRadius: 'var(--radius-sm)', 
                                border: '1px solid var(--hairline)',
                                background: 'var(--surface)',
                                color: 'var(--ink)'
                            }}
                        >
                            <option value="All">All Categories</option>
                            <option value="Article Reels">Article Reels</option>
                            <option value="Story Telling">Story Telling</option>
                            <option value="News">News</option>
                            <option value="Talking Head">Talking Head</option>
                            <option value="Clipper">Clipper</option>
                            <option value="Motion">Motion</option>
                        </select>
                    </div>
                </div>
                <div className="calendar-export-body" style={{
                    padding: '20px',
                    backgroundColor: 'var(--canvas-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '300px',
                    position: 'relative'
                }}>
                    {isLoading && (
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '12px',
                            color: 'var(--ink-muted)'
                        }}>
                            <div className="loading-spinner"></div>
                            <p style={{ fontSize: '13px', margin: 0 }}>Generating calendar preview...</p>
                        </div>
                    )}
                    {!isLoading && previewUrl && (
                        <div style={{
                            width: '100%',
                            border: '1px solid var(--hairline-strong)',
                            borderRadius: 'var(--radius-md)',
                            backgroundColor: exportTheme === 'light' ? '#ffffff' : '#0c0c0e',
                            padding: '8px',
                            boxShadow: 'var(--shadow-soft)',
                            display: 'flex',
                            justifyContent: 'center'
                        }}>
                            <img src={previewUrl} alt="Calendar Export Preview" style={{ maxWidth: '100%', height: 'auto', borderRadius: 'var(--radius-sm)', objectFit: 'contain' }} />
                        </div>
                    )}
                </div>
                <div className="calendar-export-actions" style={{
                    display: 'flex',
                    gap: '10px',
                    padding: '16px 20px',
                    borderTop: '1px solid var(--hairline)',
                    justifyContent: 'flex-end',
                    backgroundColor: 'var(--surface)'
                }}>
                    <button 
                        type="button" 
                        className="btn btn-success" 
                        onClick={handleCopy} 
                        disabled={isLoading || !imageBlob}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                        <i className="fa-solid fa-copy"></i> Copy Image
                    </button>
                    <button 
                        type="button" 
                        className="btn btn-primary" 
                        onClick={handleDownload} 
                        disabled={isLoading || !previewUrl}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                        <i className="fa-solid fa-download"></i> Download PNG
                    </button>
                    <button 
                        type="button" 
                        className="btn btn-outline" 
                        onClick={onClose}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

// ----------------------------------------------------
// 6. DELETE CONFIRMATION MODAL
// ----------------------------------------------------
export function DeleteConfirmModal({ isOpen, onClose, onConfirm, message }) {
    if (!isOpen) return null;
    if (typeof window === 'undefined') return null;

    return createPortal(
        <div className="modal-overlay" style={{ display: 'flex', zIndex: 12000 }}>
            <div className="delete-confirm-content" style={{
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--hairline)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-overlay)',
                padding: '24px',
                maxWidth: '400px',
                width: '100%',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '16px'
            }}>
                <div className="delete-confirm-icon" style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--danger-bg)',
                    color: 'var(--danger)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px'
                }}>
                    <i className="fa-solid fa-triangle-exclamation"></i>
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: 'var(--ink)' }}>Confirm Delete</h3>
                <p style={{ fontSize: '13px', color: 'var(--ink-muted)', margin: 0, lineHeight: '1.5' }}>
                    {message || 'Are you sure you want to delete this meeting memo?'}
                </p>
                <div className="delete-confirm-actions" style={{
                    display: 'flex',
                    gap: '10px',
                    width: '100%',
                    marginTop: '8px'
                }}>
                    <button 
                        type="button" 
                        className="btn btn-outline" 
                        onClick={onClose}
                        style={{ flex: 1 }}
                    >
                        Cancel
                    </button>
                    <button 
                        type="button" 
                        className="btn btn-danger" 
                        onClick={onConfirm}
                        style={{ flex: 1 }}
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}

export function LinkModal({ isOpen, onClose, onConfirm }) {
    const [url, setUrl] = useState('https://');

    useEffect(() => {
        if (isOpen) {
            setUrl('https://');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onConfirm(url);
    };

    return createPortal(
        <div className="modal-overlay" style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 15000,
            backdropFilter: 'blur(4px)'
        }}>
            <div className="modal-card" style={{
                width: '100%',
                maxWidth: '400px',
                background: 'var(--surface-elevated, #18181b)',
                border: '1px solid var(--hairline, #27272a)',
                borderRadius: '12px',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                boxShadow: 'var(--shadow-lg, 0 10px 25px -5px rgba(0, 0, 0, 0.3))'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--hairline)', paddingBottom: '12px' }}>
                    <i className="fa-solid fa-link" style={{ color: 'var(--primary)', fontSize: '18px' }}></i>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--ink)' }}>Insert Link</h3>
                </div>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink-muted)' }}>Link URL</label>
                        <input
                            type="text"
                            className="form-control"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://example.com"
                            required
                            autoFocus
                            style={{ width: '100%', fontFamily: 'inherit' }}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
                        <button type="button" className="btn btn-outline" onClick={onClose} style={{ minWidth: '80px' }}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" style={{ minWidth: '80px' }}>
                            Insert
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}

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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{
                            padding: '10px 14px',
                            borderRadius: '6px',
                            backgroundColor: 'var(--primary-bg)',
                            border: '1px solid var(--primary-focus)',
                            fontSize: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            color: 'var(--ink)'
                        }}>
                            <i className="fa-solid fa-circle-check" style={{ color: 'var(--primary)' }}></i>
                            <span>You are currently authenticated under <strong>{userRole === 'Admin' ? 'ADMIN MODE' : 'CREATOR MODE'}</strong>.</span>
                        </div>

                        <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.5', color: 'var(--ink-muted)' }}>
                            GAT ContentManager dynamically adapts its interface and access controls based on the authenticated role.
                        </p>
                        
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '12px',
                            marginTop: '4px'
                        }}>
                            {/* Admin Card */}
                            <div style={{
                                border: userRole === 'Admin' ? '2px solid var(--primary)' : '1px solid var(--hairline-strong)',
                                borderRadius: '8px',
                                padding: '16px',
                                backgroundColor: userRole === 'Admin' ? 'var(--primary-bg-strong)' : 'var(--canvas)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                opacity: userRole === 'Admin' ? 1 : 0.6,
                                transition: 'all 0.2s'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)' }}>
                                    <i className="fa-solid fa-user-gear" style={{ fontSize: '16px' }}></i>
                                    <span style={{ fontWeight: 700, fontSize: '13px', letterSpacing: '0.05em' }}>ADMIN MODE</span>
                                </div>
                                <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '11px', color: 'var(--ink-muted)', lineHeight: '1.6' }}>
                                    <li>Full read & write access to all tabs.</li>
                                    <li>Add, edit, or delete any task, calendar event, meeting memo, or draft.</li>
                                    <li>Authorized to sync and write back records to the main database.</li>
                                </ul>
                            </div>

                            {/* Creator Card */}
                            <div style={{
                                border: userRole === 'Creator' ? '2px solid var(--primary)' : '1px solid var(--hairline-strong)',
                                borderRadius: '8px',
                                padding: '16px',
                                backgroundColor: userRole === 'Creator' ? 'var(--primary-bg-strong)' : 'var(--canvas)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                opacity: userRole === 'Creator' ? 1 : 0.6,
                                transition: 'all 0.2s'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)' }}>
                                    <i className="fa-solid fa-palette" style={{ fontSize: '16px' }}></i>
                                    <span style={{ fontWeight: 700, fontSize: '13px', letterSpacing: '0.05em' }}>CREATOR MODE</span>
                                </div>
                                <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '11px', color: 'var(--ink-muted)', lineHeight: '1.6' }}>
                                    <li>Optimized read-focused workstation.</li>
                                    <li>Can view analytics, calendars, and dashboards without accidental edits.</li>
                                    <li>Full permissions to add and edit meeting memos and storyboard drafts.</li>
                                </ul>
                            </div>
                        </div>
                        
                        <div style={{
                            fontSize: '11px',
                            color: 'var(--ink-faint)',
                            borderTop: '1px solid var(--hairline)',
                            paddingTop: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}>
                            <i className="fa-solid fa-circle-info"></i>
                            <span>Workspace role can be changed on the Lock screen by re-entering the staff key.</span>
                        </div>
                    </div>
                );
            case 'workflows':
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '350px', overflowY: 'auto', paddingRight: '4px' }}>
                        <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.5', color: 'var(--ink-muted)' }}>
                            Navigate through the sidebar to coordinate content operations:
                        </p>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                <div style={{ minWidth: '100px', fontWeight: 600, fontSize: '12px', color: 'var(--ink)' }}>
                                    <i className="fa-solid fa-gauge-high" style={{ width: '16px', marginRight: '6px', color: 'var(--primary)' }}></i>Dashboard
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>
                                    Overview of total publication views, reaches, follow growth, and recent performance highlights.
                                </div>
                            </div>
                            
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', borderTop: '1px solid var(--hairline)', paddingTop: '8px' }}>
                                <div style={{ minWidth: '100px', fontWeight: 600, fontSize: '12px', color: 'var(--ink)' }}>
                                    <i className="fa-solid fa-calendar-days" style={{ width: '16px', marginRight: '6px', color: 'var(--primary)' }}></i>Calendar
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>
                                    Visual publication timeline. Useful for seeing scheduled posting dates. Exports clean PNGs for team updates.
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', borderTop: '1px solid var(--hairline)', paddingTop: '8px' }}>
                                <div style={{ minWidth: '100px', fontWeight: 600, fontSize: '12px', color: 'var(--ink)' }}>
                                    <i className="fa-solid fa-list-check" style={{ width: '16px', marginRight: '6px', color: 'var(--primary)' }}></i>Task List
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>
                                    Tracks action items, priorities, and deadlines. Filter by "Due Today", status, or PIC.
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', borderTop: '1px solid var(--hairline)', paddingTop: '8px' }}>
                                <div style={{ minWidth: '100px', fontWeight: 600, fontSize: '12px', color: 'var(--ink)' }}>
                                    <i className="fa-solid fa-pen-to-square" style={{ width: '16px', marginRight: '6px', color: 'var(--primary)' }}></i>Content Hub
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>
                                    Where storyboards, hooks, and drafts are written. Helps refine scripts before filming.
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', borderTop: '1px solid var(--hairline)', paddingTop: '8px' }}>
                                <div style={{ minWidth: '100px', fontWeight: 600, fontSize: '12px', color: 'var(--ink)' }}>
                                    <i className="fa-solid fa-handshake" style={{ width: '16px', marginRight: '6px', color: 'var(--primary)' }}></i>Meeting Memos
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>
                                    Log meeting notes and action points. Click any card to instantly scroll down and edit its content.
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', borderTop: '1px solid var(--hairline)', paddingTop: '8px' }}>
                                <div style={{ minWidth: '100px', fontWeight: 600, fontSize: '12px', color: 'var(--ink)' }}>
                                    <i className="fa-solid fa-chart-line" style={{ width: '16px', marginRight: '6px', color: 'var(--primary)' }}></i>Analytics
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>
                                    Detailed trend breakdown (monthly/weekly), engagement metrics, and rank lists for PICs and platforms.
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'security':
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.5', color: 'var(--ink-muted)' }}>
                            Understanding the security systems and offline capabilities of the dashboard:
                        </p>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <i className="fa-solid fa-lock" style={{ color: 'var(--primary)', marginTop: '3px', fontSize: '14px', width: '16px' }}></i>
                                <div>
                                    <strong style={{ fontSize: '12px', color: 'var(--ink)', display: 'block' }}>Automatic Session Locking</strong>
                                    <span style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>
                                        To protect sensitive information, refreshing the page or closing the tab automatically locks the database access. This is an intentional security control.
                                    </span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '10px' }}>
                                <i className="fa-solid fa-triangle-exclamation" style={{ color: '#ef4444', marginTop: '3px', fontSize: '14px', width: '16px' }}></i>
                                <div>
                                    <strong style={{ fontSize: '12px', color: 'var(--ink)', display: 'block' }}>Brute Force Lockdown</strong>
                                    <span style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>
                                        Entering incorrect access passcodes 5 consecutive times triggers an automatic 6-hour browser lockdown where no credentials will be accepted.
                                    </span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '10px' }}>
                                <i className="fa-solid fa-cloud-sun" style={{ color: 'var(--primary)', marginTop: '3px', fontSize: '14px', width: '16px' }}></i>
                                <div>
                                    <strong style={{ fontSize: '12px', color: 'var(--ink)', display: 'block' }}>Local Sync & Caching</strong>
                                    <span style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>
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
        <div className="modal-overlay" style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 16000,
            backdropFilter: 'blur(4px)'
        }}>
            <div className="modal-card" style={{
                width: '100%',
                maxWidth: '560px',
                background: 'var(--surface-elevated, #18181b)',
                border: '1px solid var(--hairline, #27272a)',
                borderRadius: '12px',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                boxShadow: 'var(--shadow-lg, 0 10px 25px -5px rgba(0, 0, 0, 0.3))'
            }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--hairline)', paddingBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <i className="fa-solid fa-circle-question" style={{ color: 'var(--primary)', fontSize: '20px' }}></i>
                        <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--ink)' }}>Help & Operations Guide</h3>
                    </div>
                    <button className="gate-modal-close" onClick={onClose} aria-label="Close modal" style={{ padding: '4px', cursor: 'pointer' }}>
                        <i className="fa-solid fa-xmark" style={{ fontSize: '18px' }}></i>
                    </button>
                </div>

                {/* Tabs */}
                <div style={{
                    display: 'flex',
                    borderBottom: '1px solid var(--hairline)',
                    gap: '16px',
                    paddingBottom: '2px'
                }}>
                    <button 
                        onClick={() => setActiveTab('roles')}
                        style={{
                            background: 'none',
                            border: 'none',
                            borderBottom: activeTab === 'roles' ? '2px solid var(--primary)' : '2px solid transparent',
                            color: activeTab === 'roles' ? 'var(--ink)' : 'var(--ink-muted)',
                            padding: '8px 4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: activeTab === 'roles' ? 600 : 500,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.2s'
                        }}
                    >
                        <i className="fa-solid fa-user-lock"></i> Workspace Roles
                    </button>
                    <button 
                        onClick={() => setActiveTab('workflows')}
                        style={{
                            background: 'none',
                            border: 'none',
                            borderBottom: activeTab === 'workflows' ? '2px solid var(--primary)' : '2px solid transparent',
                            color: activeTab === 'workflows' ? 'var(--ink)' : 'var(--ink-muted)',
                            padding: '8px 4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: activeTab === 'workflows' ? 600 : 500,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.2s'
                        }}
                    >
                        <i className="fa-solid fa-route"></i> Workflows
                    </button>
                    <button 
                        onClick={() => setActiveTab('security')}
                        style={{
                            background: 'none',
                            border: 'none',
                            borderBottom: activeTab === 'security' ? '2px solid var(--primary)' : '2px solid transparent',
                            color: activeTab === 'security' ? 'var(--ink)' : 'var(--ink-muted)',
                            padding: '8px 4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: activeTab === 'security' ? 600 : 500,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.2s'
                        }}
                    >
                        <i className="fa-solid fa-shield-halved"></i> Security & Sync
                    </button>
                </div>

                {/* Content */}
                <div className="help-modal-body">
                    {renderTabContent()}
                </div>

                {/* Footer */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--hairline)', paddingTop: '14px', marginTop: '4px' }}>
                    <button 
                        type="button" 
                        className="btn btn-primary" 
                        onClick={onClose}
                        style={{ minWidth: '100px' }}
                    >
                        Got it
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}

