'use client';

import React, { useState, useEffect } from 'react';
import { useDashboard } from './DashboardContext';
import Icon from './Icon';

export default function LockScreen() {
    const {
        unlockWorkspace,
        getLockdownTimeRemaining,
        appSettingsData,
        darkMode,
        toggleDarkMode
    } = useDashboard();

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
    }, [getLockdownTimeRemaining]);

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

    const appTitle = appSettingsData?.app_full_name || appSettingsData?.app_name || 'GAT';

    return (
        <div className="relative w-full min-h-screen flex items-center justify-center p-4 sm:p-6 bg-background text-zinc-900 dark:text-zinc-100 overflow-hidden selection:bg-orange-500/20">
            {/* Soft Ambient Warmth Background Accents */}
            <div
                className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-orange-500/10 dark:bg-orange-500/5 blur-3xl"
                aria-hidden="true"
            />
            <div
                className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-orange-500/10 dark:bg-orange-500/5 blur-3xl"
                aria-hidden="true"
            />

            {/* Subtle Corner Theme Toggle */}
            <div className="absolute top-5 right-5 z-20">
                <button
                    type="button"
                    onClick={toggleDarkMode}
                    aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                    title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                    className="w-9 h-9 rounded-lg border border-border bg-surface hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 flex items-center justify-center transition-colors cursor-pointer"
                >
                    <Icon name={darkMode ? 'light_mode' : 'dark_mode'} size={16} />
                </button>
            </div>

            {/* Clean Centered Card */}
            <div className="w-full max-w-[420px] sm:max-w-[440px] rounded-2xl border border-border bg-surface p-7 sm:p-9 shadow-xs relative z-10 space-y-6">
                {/* Heading */}
                <div className="text-center space-y-1.5">
                    <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                        CC Internal Gate
                    </h2>
                    <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 font-mono">
                        {appSettingsData?.company_name || 'Internal Content Team'}
                    </p>
                </div>

                {/* Unlock Form */}
                <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4 sm:space-y-5">
                    {/* Alerts */}
                    {lockdownTimeText && (
                        <div
                            className="flex items-start gap-2.5 p-3.5 bg-red-500/10 border border-red-500/20 rounded-lg text-red-600 dark:text-red-400 text-xs sm:text-sm font-medium animate-fade-up"
                            role="alert"
                            aria-live="assertive"
                        >
                            <Icon name="warning" size={16} className="mt-0.5 shrink-0 text-red-500" />
                            <span className="text-pretty">{lockdownTimeText}</span>
                        </div>
                    )}

                    {errorMsg && !lockdownTimeText && (
                        <div
                            className="flex items-start gap-2.5 p-3.5 bg-red-500/10 border border-red-500/20 rounded-lg text-red-600 dark:text-red-400 text-xs sm:text-sm font-medium animate-fade-up"
                            role="alert"
                            aria-live="assertive"
                        >
                            <Icon name="error" size={16} className="mt-0.5 shrink-0 text-red-500" />
                            <span className="text-pretty">{errorMsg}</span>
                        </div>
                    )}

                    {/* Email Input */}
                    <div className="space-y-1.5">
                        <label
                            htmlFor="lockScreenEmail"
                            className="text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 block"
                        >
                            Email Address <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="email"
                            id="lockScreenEmail"
                            className="h-11 w-full bg-zinc-50 dark:bg-zinc-900/50 border border-border rounded-lg px-3.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                            placeholder="user@domain.com"
                            required
                            autoFocus
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
                        <label
                            htmlFor="lockScreenNim"
                            className="text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 block"
                        >
                            Password (NIM) <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="password"
                            id="lockScreenNim"
                            className="h-11 w-full bg-zinc-50 dark:bg-zinc-900/50 border border-border rounded-lg px-3.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                            placeholder="Enter your credential"
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

                    {/* Actions: Clear and Login buttons */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            className="h-11 flex-1 border border-border bg-surface hover:bg-zinc-100/70 dark:hover:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300 font-medium px-4 rounded-lg text-sm transition-colors cursor-pointer text-center"
                            onClick={handleClear}
                        >
                            Clear
                        </button>
                        <button
                            type="submit"
                            className="h-11 flex-1 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-orange-500 dark:text-zinc-950 dark:hover:bg-orange-400 font-medium px-4 rounded-lg text-sm transition-all cursor-pointer text-center disabled:opacity-50 active:scale-[0.98]"
                            disabled={!!lockdownTimeText}
                        >
                            Login
                        </button>
                    </div>
                </form>

                {/* Footer Brand */}
                <div className="pt-2 border-t border-border text-center text-xs text-zinc-600 dark:text-zinc-400 font-mono">
                    <span>{appTitle}</span>
                </div>
            </div>
        </div>
    );
}
