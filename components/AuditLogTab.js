'use client';

import React from 'react';
import { useDashboard } from './DashboardContext';

export default function AuditLogTab() {
    const { auditLogData, userRole } = useDashboard();
    if (userRole !== 'Admin') {
        return (
            <div className="bg-surface border border-border rounded-lg p-10 text-center text-xs text-muted-foreground">
                Only administrators can view the audit log.
            </div>
        );
    }

    return (
        <section className="space-y-5 max-w-6xl mx-auto">
            <header>
                <p className="text-xs font-mono font-medium text-primary uppercase tracking-wider">Accountability</p>
                <h2 className="text-lg font-semibold text-foreground tracking-tight mt-0.5">Audit Log</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Recent task and security activity records.</p>
            </header>
            <div className="bg-surface border border-border rounded-lg overflow-x-auto">
                <table className="w-full text-left text-xs">
                    <thead className="bg-muted/40 text-[10px] uppercase font-mono font-medium text-muted-foreground tracking-wider border-b border-border">
                        <tr>
                            <th className="px-4 py-2.5 font-medium">User</th>
                            <th className="px-4 py-2.5 font-medium">Action</th>
                            <th className="px-4 py-2.5 font-medium">Record</th>
                            <th className="px-4 py-2.5 font-medium">Time</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {(auditLogData || []).length === 0 ? (
                            <tr>
                                <td colSpan="4" className="px-4 py-12 text-center text-muted-foreground">
                                    No audit events recorded yet.
                                </td>
                            </tr>
                        ) : (auditLogData || []).map((event) => (
                            <tr key={event.id} className="hover:bg-muted/30 transition-colors">
                                <td className="px-4 py-3">
                                    <p className="font-medium text-foreground">{event.userName}</p>
                                    <p className="text-[10px] text-muted-foreground font-mono">{event.role}</p>
                                </td>
                                <td className="px-4 py-3 capitalize text-foreground font-medium">{event.action}</td>
                                <td className="px-4 py-3 text-muted-foreground font-mono">{event.entityType} {event.entityId}</td>
                                <td className="px-4 py-3 text-muted-foreground font-mono whitespace-nowrap">{new Date(Number(event.createdAt)).toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
}
