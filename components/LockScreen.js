'use client';

import React, { useState, useEffect } from 'react';
import { useDashboard } from './DashboardContext';

export default function LockScreen({ sectionName = 'Workspace' }) {
    const { unlockWorkspace, getLockdownTimeRemaining, appSettingsData } = useDashboard();
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

        const activePasscode = role === 'Viewer' ? 'viewer' : passcode;

        if (!activePasscode) {
            setErrorMsg('Please enter the access key.');
            return;
        }

        try {
            await unlockWorkspace(role, activePasscode);
        } catch (error) {
            setErrorMsg(error.message || 'Authentication failed.');
        }
    };

    const handleCancel = () => {
        setPasscode('');
        setErrorMsg('');
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center p-4 bg-background text-on-surface z-50 overflow-hidden">
            {/* Ambient background decoration */}
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                {/* Noise overlay */}
                <div className="noise-overlay"></div>
                {/* Glowing orbs */}
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/8 blur-[120px] dark:bg-primary/5"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-secondary/8 blur-[120px] dark:bg-secondary/4"></div>
            </div>

            <div className="relative w-full max-w-md bg-surface-container/70 backdrop-blur-2xl border border-outline-variant/30 rounded-2xl p-stack-lg shadow-2xl space-y-6 z-10 animate-fade-up">
                {/* Header */}
                <div className="flex items-center gap-4 border-b border-outline-variant/20 pb-4">
                    <div className="w-11 h-11 bg-primary-container/20 border border-primary/20 rounded-xl flex items-center justify-center text-primary shadow-sm">
                        <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
                    </div>
                    <div>
                        <h2 className="font-headline-md text-headline-md font-bold text-on-surface leading-tight text-pretty">
                            CC Internal Gate
                        </h2>
                        <p className="text-[10px] text-primary uppercase tracking-widest font-bold">
                            {appSettingsData?.app_full_name || 'Content suite'} · {sectionName} Lock
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} autoComplete="off" className="space-y-5">
                    {/* Alerts */}
                    {lockdownTimeText && (
                        <div className="flex items-center gap-3 p-3 bg-error-container/20 border border-error/30 rounded-xl text-error text-body-sm animate-fade-up">
                            <span className="material-symbols-outlined text-[20px]">warning</span>
                            <span className="font-medium text-pretty">{lockdownTimeText}</span>
                        </div>
                    )}

                    {errorMsg && !lockdownTimeText && (
                        <div className="flex items-center gap-3 p-3 bg-error-container/10 border border-error/20 rounded-xl text-error text-body-sm animate-fade-up">
                            <span className="material-symbols-outlined text-[20px]">error</span>
                            <span className="font-medium text-pretty">{errorMsg}</span>
                        </div>
                    )}

                    {/* Role Selection */}
                    <div className="space-y-3">
                        <label className="text-[10px] text-on-surface-variant uppercase tracking-widest block font-bold text-center">
                            Select Workspace Role
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                            <div 
                                className={`flex flex-col items-center justify-center p-3 rounded-xl border cursor-pointer transition-all duration-300 ${
                                    role === 'Admin' 
                                        ? 'border-primary bg-primary/8 text-primary shadow-[0_0_12px_rgba(16,185,129,0.12)] scale-[1.02] font-semibold' 
                                        : 'border-outline-variant/30 bg-surface-container-low text-on-surface-variant hover:border-outline/50 hover:bg-surface-container'
                                }`}
                                onClick={() => !lockdownTimeText && setRole('Admin')}
                            >
                                <span className="material-symbols-outlined text-[22px] mb-1.5" style={role === 'Admin' ? { fontVariationSettings: "'FILL' 1" } : undefined}>admin_panel_settings</span>
                                <span className="text-[9px] font-bold tracking-wider uppercase text-center">Admin</span>
                            </div>
                            <div 
                                className={`flex flex-col items-center justify-center p-3 rounded-xl border cursor-pointer transition-all duration-300 ${
                                    role === 'Creator' 
                                        ? 'border-primary bg-primary/8 text-primary shadow-[0_0_12px_rgba(16,185,129,0.12)] scale-[1.02] font-semibold' 
                                        : 'border-outline-variant/30 bg-surface-container-low text-on-surface-variant hover:border-outline/50 hover:bg-surface-container'
                                }`}
                                onClick={() => !lockdownTimeText && setRole('Creator')}
                            >
                                <span className="material-symbols-outlined text-[22px] mb-1.5" style={role === 'Creator' ? { fontVariationSettings: "'FILL' 1" } : undefined}>palette</span>
                                <span className="text-[9px] font-bold tracking-wider uppercase text-center">Creator</span>
                            </div>
                            <div 
                                className={`flex flex-col items-center justify-center p-3 rounded-xl border cursor-pointer transition-all duration-300 ${
                                    role === 'Viewer' 
                                        ? 'border-primary bg-primary/8 text-primary shadow-[0_0_12px_rgba(16,185,129,0.12)] scale-[1.02] font-semibold' 
                                        : 'border-outline-variant/30 bg-surface-container-low text-on-surface-variant hover:border-outline/50 hover:bg-surface-container'
                                }`}
                                onClick={() => !lockdownTimeText && setRole('Viewer')}
                            >
                                <span className="material-symbols-outlined text-[22px] mb-1.5" style={role === 'Viewer' ? { fontVariationSettings: "'FILL' 1" } : undefined}>visibility</span>
                                <span className="text-[9px] font-bold tracking-wider uppercase text-center">Viewer</span>
                            </div>
                        </div>
                    </div>

                    {/* Passcode Input */}
                    {role !== 'Viewer' && (
                        <div className="space-y-2 animate-fade-up">
                            <label htmlFor="lockScreenPin" className="text-[10px] text-on-surface-variant uppercase tracking-widest block font-bold">
                                Access Key <span className="text-error">*</span>
                            </label>
                            <div className="relative">
                                <input
                                    type={showPasscode ? 'text' : 'password'}
                                    id="lockScreenPin"
                                    className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl pl-4 pr-12 py-3 text-body-sm text-on-surface placeholder-on-surface-variant/40 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-200"
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
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface cursor-pointer p-1 transition-colors"
                                    onClick={() => setShowPasscode(!showPasscode)}
                                    disabled={!!lockdownTimeText}
                                    aria-label={showPasscode ? 'Hide passcode' : 'Show passcode'}
                                >
                                    <span className="material-symbols-outlined text-[20px]">
                                        {showPasscode ? 'visibility_off' : 'visibility'}
                                    </span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        {role !== 'Viewer' && (
                            <button 
                                type="button" 
                                className="flex-1 bg-surface-container-high text-on-surface hover:bg-surface-container-highest font-semibold py-3 px-4 rounded-xl text-body-sm transition-all duration-200 micro-interaction text-center" 
                                onClick={handleCancel}
                            >
                                Clear
                            </button>
                        )}
                        <button 
                            type="submit" 
                            className={`${role === 'Viewer' ? 'w-full' : 'flex-1'} bg-primary text-on-primary hover:opacity-90 font-semibold py-3 px-4 rounded-xl text-body-sm transition-all duration-200 micro-interaction text-center disabled:opacity-50 shimmer-button`} 
                            disabled={!!lockdownTimeText}
                        >
                            {role === 'Viewer' ? 'Enter Workspace' : 'Enable Edit Mode'}
                        </button>
                    </div>
                </form>

                <div className="text-center text-[9px] text-on-surface-variant/40 pt-2.5 border-t border-outline-variant/10 uppercase tracking-widest font-bold">
                    {appSettingsData?.company_name || 'Internal Content Team'}
                </div>
            </div>
        </div>
    );
}
