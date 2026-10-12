'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useDashboard } from './DashboardContext';
import Icon from './Icon';

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
    const appSubtitle = appSettingsData?.app_subtitle || 'Content Workspace';

    return (
        <div className="fixed inset-0 z-50 flex flex-col lg:flex-row bg-background text-zinc-900 dark:text-zinc-100 overflow-hidden">
            {/* Left Column: Form & dynamic brand */}
            <div className="w-full lg:w-[460px] xl:w-[500px] shrink-0 h-full flex flex-col justify-between p-6 sm:p-10 lg:p-12 bg-surface border-r border-border overflow-y-auto z-20">
                {/* Header brand */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 flex items-center justify-center overflow-hidden rounded-lg p-1 bg-surface border border-border shrink-0">
                            <img src="/apple-touch-icon.png" className="w-7 h-7 object-contain rounded" alt="Logo" />
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 truncate leading-tight">
                                {appTitle}
                            </h1>
                            <p className="text-[10px] text-primary tracking-wider uppercase font-semibold font-mono truncate">
                                {appSubtitle}
                            </p>
                        </div>
                    </div>

                    <div className="pt-2">
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider font-semibold bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 mb-2">
                            <Icon name="lock" size={11} weight="bold" />
                            <span>{sectionName} Lock</span>
                        </div>
                        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                            Authentication Gate
                        </h2>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                            Enter your credentials to access team workflows and publishing permissions.
                        </p>
                    </div>
                </div>

                {/* Unlock Form */}
                <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4 my-8">
                    {/* Alerts */}
                    {lockdownTimeText && (
                        <div
                            className="flex items-start gap-2.5 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-600 dark:text-red-400 text-xs font-medium animate-fade-up"
                            role="alert"
                            aria-live="assertive"
                        >
                            <Icon name="warning" size={16} className="mt-0.5 shrink-0 text-red-500" />
                            <span className="text-pretty">{lockdownTimeText}</span>
                        </div>
                    )}

                    {errorMsg && !lockdownTimeText && (
                        <div
                            className="flex items-start gap-2.5 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-600 dark:text-red-400 text-xs font-medium animate-fade-up"
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
                            className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block"
                        >
                            Email Address <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="email"
                            id="lockScreenEmail"
                            className="w-full bg-zinc-50 dark:bg-zinc-900/50 border border-border rounded-lg px-3.5 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
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
                            className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block"
                        >
                            Password (NIM) <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="password"
                            id="lockScreenNim"
                            className="w-full bg-zinc-50 dark:bg-zinc-900/50 border border-border rounded-lg px-3.5 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
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

                    {/* Actions */}
                    <div className="flex gap-2.5 pt-2">
                        <button
                            type="button"
                            className="flex-1 border border-border bg-surface hover:bg-zinc-100/70 dark:hover:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300 font-medium py-2.5 px-4 rounded-lg text-xs transition-colors cursor-pointer text-center"
                            onClick={handleClear}
                        >
                            Clear
                        </button>
                        <button
                            type="submit"
                            className="flex-1 bg-primary text-on-primary hover:opacity-90 font-medium py-2.5 px-4 rounded-lg text-xs transition-all cursor-pointer text-center disabled:opacity-50 active:scale-[0.98]"
                            disabled={!!lockdownTimeText}
                        >
                            Login
                        </button>
                    </div>
                </form>

                {/* Footer Brand */}
                <div className="pt-4 border-t border-border flex items-center justify-between text-[11px] text-zinc-400 font-mono">
                    <span>{appSettingsData?.company_name || 'Internal Content Team'}</span>
                    <span>v0.1.0-alpha</span>
                </div>
            </div>

            {/* Right Column: Editorial visual split (hidden on mobile) */}
            <div className="hidden lg:flex flex-1 relative bg-zinc-950 overflow-hidden items-end p-12 z-10">
                <Image
                    src="/img/lock-editorial.jpg"
                    alt="Editorial workspace"
                    fill
                    priority
                    sizes="(min-width: 1024px) 60vw, 100vw"
                    className="object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10 z-10" />

                <div className="relative z-20 max-w-lg space-y-2 text-white">
                    <p className="text-[10px] font-mono uppercase tracking-widest text-orange-400 font-semibold">
                        Content Operations &amp; Intelligence
                    </p>
                    <blockquote className="text-xl font-medium tracking-tight leading-snug text-white/95 text-pretty">
                        &ldquo;Quiet craftsmanship and rigorous workflow coordination for modern digital media.&rdquo;
                    </blockquote>
                    <p className="text-xs text-white/60 font-mono pt-1">
                        {appTitle} &middot; Editorial Platform
                    </p>
                </div>
            </div>
        </div>
    );
}
