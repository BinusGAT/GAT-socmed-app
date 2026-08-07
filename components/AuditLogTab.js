'use client';

import React from 'react';
import { useDashboard } from './DashboardContext';

export default function AuditLogTab() {
    const { auditLogData, userRole } = useDashboard();
    if (userRole !== 'Admin') {
        return <div className="glass-panel rounded-xl p-10 text-center text-on-surface-variant">Only administrators can view the audit log.</div>;
    }

    return (
        <section className="space-y-6 max-w-6xl mx-auto">
            <header>
                <p className="text-body-sm text-primary font-semibold">Accountability</p>
                <h2 className="text-headline-md font-bold text-on-surface">Audit Log</h2>
                <p className="text-body-sm text-on-surface-variant mt-1">Recent task and security activity.</p>
            </header>
            <div className="glass-panel rounded-xl overflow-x-auto">
                <table className="w-full text-left text-body-sm">
                    <thead className="bg-surface-container-low text-[10px] uppercase tracking-wider text-on-surface-variant">
                        <tr><th className="px-5 py-3">User</th><th className="px-5 py-3">Action</th><th className="px-5 py-3">Record</th><th className="px-5 py-3">Time</th></tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/15">
                        {(auditLogData || []).length === 0 ? (
                            <tr><td colSpan="4" className="px-5 py-12 text-center text-on-surface-variant">No audit events recorded yet.</td></tr>
                        ) : (auditLogData || []).map((event) => (
                            <tr key={event.id} className="hover:bg-surface-container-low/60">
                                <td className="px-5 py-4"><p className="font-semibold text-on-surface">{event.userName}</p><p className="text-[10px] text-on-surface-variant">{event.role}</p></td>
                                <td className="px-5 py-4 capitalize text-on-surface">{event.action}</td>
                                <td className="px-5 py-4 text-on-surface-variant">{event.entityType} {event.entityId}</td>
                                <td className="px-5 py-4 text-on-surface-variant whitespace-nowrap">{new Date(Number(event.createdAt)).toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
}
