'use client';

import React, { useEffect, useState } from 'react';
import Icon from './Icon';
import { useDashboard } from './DashboardContext';

function deviceLabel(userAgent) {
    const text = String(userAgent || 'Unknown device');
    const browser = text.includes('Edg/') ? 'Microsoft Edge' : text.includes('Chrome/') ? 'Chrome' : text.includes('Firefox/') ? 'Firefox' : text.includes('Safari/') ? 'Safari' : 'Browser';
    const os = text.includes('Windows') ? 'Windows' : text.includes('Android') ? 'Android' : text.includes('iPhone') || text.includes('iPad') ? 'iOS' : text.includes('Mac OS') ? 'macOS' : 'Unknown OS';
    return `${browser} on ${os}`;
}

export default function SessionsTab() {
    const { listSessions, revokeSession } = useDashboard();
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);

    const refresh = async () => {
        setLoading(true);
        try { setSessions(await listSessions()); } finally { setLoading(false); }
    };

    useEffect(() => {
        let active = true;
        listSessions().then((items) => {
            if (active) setSessions(items);
        }).finally(() => {
            if (active) setLoading(false);
        });
        return () => { active = false; };
        // listSessions is provided by the dashboard context and is intentionally loaded once on mount.
    }, []);

    const handleRevoke = async (sessionId) => {
        if (await revokeSession(sessionId)) await refresh();
    };

    return (
        <section className="space-y-5 max-w-4xl mx-auto">
            <header>
                <p className="text-xs font-mono font-medium text-primary uppercase tracking-wider">Security</p>
                <h2 className="text-lg font-semibold text-foreground tracking-tight mt-0.5">Session Management</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Review browsers currently signed in to your account.</p>
            </header>
            <div className="bg-surface border border-border rounded-lg divide-y divide-border">
                {loading ? (
                    <div className="p-8 text-center text-xs text-muted-foreground">Loading sessions...</div>
                ) : sessions.length === 0 ? (
                    <div className="p-8 text-center text-xs text-muted-foreground">No active sessions found.</div>
                ) : sessions.map((session) => (
                    <div key={session.sessionId} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-3">
                            <Icon name="devices" size={18} className="text-primary mt-0.5 shrink-0" />
                            <div>
                                <p className="font-medium text-xs text-foreground flex items-center">
                                    {deviceLabel(session.userAgent)}
                                    {session.current && (
                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-medium uppercase font-mono bg-primary/10 text-primary border border-primary/20 ml-2">
                                            Current
                                        </span>
                                    )}
                                </p>
                                <p className="text-[11px] font-mono text-muted-foreground mt-0.5">
                                    Last active {new Date(Number(session.lastSeenAt || session.createdAt)).toLocaleString()}
                                </p>
                                <p className="text-[10px] font-mono text-muted-foreground/70">
                                    Expires {new Date(Number(session.expiresAt)).toLocaleString()}
                                </p>
                            </div>
                        </div>
                        {!session.current && (
                            <button
                                type="button"
                                onClick={() => handleRevoke(session.sessionId)}
                                className="px-2.5 py-1.5 rounded-md border border-rose-500/25 text-rose-500 hover:bg-rose-500/10 text-xs font-medium uppercase tracking-wider transition-colors"
                            >
                                Revoke
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </section>
    );
}
