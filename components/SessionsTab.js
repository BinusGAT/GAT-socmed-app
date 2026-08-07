'use client';

import React, { useEffect, useState } from 'react';
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleRevoke = async (sessionId) => {
        if (await revokeSession(sessionId)) await refresh();
    };

    return (
        <section className="space-y-6 max-w-4xl mx-auto">
            <header>
                <p className="text-body-sm text-primary font-semibold">Security</p>
                <h2 className="text-headline-md font-bold text-on-surface">Session Management</h2>
                <p className="text-body-sm text-on-surface-variant mt-1">Review browsers currently signed in to your account.</p>
            </header>
            <div className="glass-panel rounded-xl divide-y divide-outline-variant/15">
                {loading ? (
                    <div className="p-8 text-center text-on-surface-variant">Loading sessions...</div>
                ) : sessions.length === 0 ? (
                    <div className="p-8 text-center text-on-surface-variant">No active sessions found.</div>
                ) : sessions.map((session) => (
                    <div key={session.sessionId} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-3">
                            <span className="material-symbols-outlined text-primary mt-0.5">devices</span>
                            <div>
                                <p className="font-semibold text-on-surface">{deviceLabel(session.userAgent)} {session.current && <span className="text-[10px] text-primary ml-2">Current</span>}</p>
                                <p className="text-[11px] text-on-surface-variant mt-1">Last active {new Date(Number(session.lastSeenAt || session.createdAt)).toLocaleString()}</p>
                                <p className="text-[10px] text-on-surface-variant/70">Expires {new Date(Number(session.expiresAt)).toLocaleString()}</p>
                            </div>
                        </div>
                        {!session.current && <button type="button" onClick={() => handleRevoke(session.sessionId)} className="px-3 py-2 rounded-lg border border-error/25 text-error hover:bg-error/10 text-body-sm font-semibold">Revoke</button>}
                    </div>
                ))}
            </div>
        </section>
    );
}
