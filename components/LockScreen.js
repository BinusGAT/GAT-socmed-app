'use client';

import React, { useState, useEffect } from 'react';
import { useDashboard } from './DashboardContext';

export default function LockScreen({ sectionName = 'Database' }) {
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

        updateCountdown();
        interval = setInterval(updateCountdown, 1000);

        return () => {
            if (interval) clearInterval(interval);
        };
    }, []);

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
            await unlockWorkspace(role, passcode);
        } catch (error) {
            setErrorMsg(error.message || 'Authentication failed.');
        }
    };

    const handleCancel = () => {
        setPasscode('');
        setErrorMsg('');
    };

    return (
        <div className="lock-screen-container" style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '60vh',
            padding: '24px',
            width: '100%'
        }}>
            <div className="gate-modal-card" style={{ margin: '0 auto' }}>
                <div className="gate-modal-header">
                    <h2><i className="fa-solid fa-user-lock"></i> CC Internal Gate</h2>
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
                            <label htmlFor="lockScreenPin" className="gate-label">
                                GAT STAFF ACCESS KEY <span className="required" style={{ color: '#ef4444' }}>*</span>
                            </label>
                            <div className="gate-input-wrapper">
                                <input
                                    type={showPasscode ? 'text' : 'password'}
                                    id="lockScreenPin"
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
                        <button type="button" className="gate-btn-cancel" onClick={handleCancel}>Cancel</button>
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
