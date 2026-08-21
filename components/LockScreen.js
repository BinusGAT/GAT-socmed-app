'use client';

import React, { useState, useEffect } from 'react';
import { useDashboard } from './DashboardContext';

export default function LockScreen({ sectionName = 'Socmed Apps' }) {
    const { unlockWorkspace, getLockdownTimeRemaining, appSettingsData } = useDashboard();
    const [email, setEmail] = useState('');
    const [nim, setNim] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
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

        const cleanEmail = email.trim();
        const cleanNim = nim.trim();

        if (!cleanEmail || !cleanNim) {
            setErrorMsg('Please enter both Email Address and NIM.');
            return;
        }

        try {
            await unlockWorkspace({ email: cleanEmail, nim: cleanNim });
        } catch (error) {
            setErrorMsg(error.message || 'Authentication failed.');
        }
    };

    const handleClear = () => {
        setEmail('');
        setNim('');
        setErrorMsg('');
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center p-4 bg-background text-on-surface z-50 overflow-hidden">
            {/* Ambient background decoration */}
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                {/* Noise overlay */}
                <div className="noise-overlay"></div>
            </div>

            <div className="relative w-full max-w-md bg-surface-container/70 backdrop-blur-2xl border border-outline-variant/30 rounded-2xl p-stack-lg shadow-2xl space-y-6 z-10 animate-fade-up">
                {/* Header */}
                <div className="flex items-center gap-4 border-b border-outline-variant/20 pb-4">
                    <div className="w-11 h-11 bg-primary-container/20 border border-primary/20 rounded-xl flex items-center justify-center text-primary shadow-sm">
                        <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }} aria-hidden="true">lock</span>
                    </div>
                    <div>
                        <h1 className="font-headline-md text-headline-md font-bold text-on-surface leading-tight text-pretty">
                            CC Internal Gate
                        </h1>
                        <p className="text-xs text-primary tracking-wide font-semibold">
                            {sectionName} Lock
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4">
                    {/* Alerts */}
                    {lockdownTimeText && (
                        <div className="flex items-center gap-3 p-3 bg-error-container/20 border border-error/30 rounded-xl text-error text-body-sm animate-fade-up" role="alert" aria-live="assertive">
                            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">warning</span>
                            <span className="font-medium text-pretty">{lockdownTimeText}</span>
                        </div>
                    )}

                    {errorMsg && !lockdownTimeText && (
                        <div className="flex items-center gap-3 p-3 bg-error-container/10 border border-error/20 rounded-xl text-error text-body-sm animate-fade-up" role="alert" aria-live="assertive">
                            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">error</span>
                            <span className="font-medium text-pretty">{errorMsg}</span>
                        </div>
                    )}

                    {/* Email Input */}
                    <div className="space-y-1.5">
                        <label htmlFor="lockScreenEmail" className="text-xs text-on-surface-variant tracking-wide block font-semibold">
                            Email Address <span className="text-error">*</span>
                        </label>
                        <input
                            type="email"
                            id="lockScreenEmail"
                            className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-2.5 text-body-sm text-on-surface placeholder-on-surface-variant/40 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-200"
                            placeholder="user@domain.com"
                            required
                            autoComplete="username"
                            value={email}
                            onChange={(e) => {
                                setEmail(e.target.value);
                                setErrorMsg('');
                            }}
                            disabled={!!lockdownTimeText}
                        />
                    </div>

                    {/* Password (NIM) Input */}
                    <div className="space-y-1.5">
                        <label htmlFor="lockScreenNim" className="text-xs text-on-surface-variant tracking-wide block font-semibold">
                            Password (NIM) <span className="text-error">*</span>
                        </label>
                        <input
                            type="password"
                            id="lockScreenNim"
                            className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-2.5 text-body-sm text-on-surface placeholder-on-surface-variant/40 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-200"
                            placeholder="Enter your NIM"
                            required
                            autoComplete="current-password"
                            value={nim}
                            onChange={(e) => {
                                setNim(e.target.value);
                                setErrorMsg('');
                            }}
                            disabled={!!lockdownTimeText}
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <button 
                            type="button" 
                            className="flex-1 bg-surface-container-high text-on-surface hover:bg-surface-container-highest font-semibold py-3 px-4 rounded-xl text-body-sm transition-all duration-200 micro-interaction text-center" 
                            onClick={handleClear}
                        >
                            Clear
                        </button>
                        <button 
                            type="submit" 
                            className="flex-1 bg-[#4f46e5] text-white hover:bg-[#4338ca] font-semibold py-3 px-4 rounded-xl text-body-sm transition-all duration-200 micro-interaction text-center disabled:opacity-50 shimmer-button"
                            disabled={!!lockdownTimeText}
                        >
                            Login
                        </button>
                    </div>
                </form>

                <div className="text-center text-xs text-on-surface-variant/70 pt-2.5 border-t border-outline-variant/10 tracking-wide font-medium">
                    {appSettingsData?.company_name || 'Internal Content Team'}
                </div>
            </div>
        </div>
    );
}
