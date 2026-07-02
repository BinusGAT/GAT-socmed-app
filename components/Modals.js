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

    // Regenerate preview whenever the modal opens or theme changes
    useEffect(() => {
        if (isOpen) {
            // Default theme to body dark-mode
            const isBodyDark = document.body.classList.contains('dark-mode');
            setExportTheme(isBodyDark ? 'dark' : 'light');
        } else {
            // Cleanup
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
    }, [isOpen, exportTheme]);

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
            clone.removeAttribute('style');

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
