'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useDashboard } from '../DashboardContext';
import { getPicBadgeClasses, getPicDisplayName } from '../../utils/helpers';
import Icon from '../Icon';

export default function TaskLinksModal({ isOpen, onClose, task }) {
  const { currentData, setCurrentView, setSelectedPostId, showAlert } = useDashboard();
  const [copiedPlatform, setCopiedPlatform] = useState(null);

  if (!isOpen || !task || typeof window === 'undefined') return null;

  // Extract all platform rows for this task ID from currentData
  const platformRows = (currentData || []).filter(
    (row) => String(row.ID) === String(task.id || task.ID)
  );

  const handleCopy = async (platform, url) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedPlatform(platform);
      setTimeout(() => setCopiedPlatform(null), 2000);
      showAlert(`Copied ${platform} link to clipboard!`, 'info');
    } catch {
      showAlert('Failed to copy link.', 'error');
    }
  };

  const handleOpenInDashboard = () => {
    setSelectedPostId(task.id || task.ID);
    setCurrentView('dashboard');
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-background/80 backdrop-blur-sm px-4">
      <div className="bg-surface border border-border rounded-[10px] max-w-md w-full overflow-hidden shadow-none animate-scale-up">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-muted/20">
          <div className="flex items-center gap-2.5 min-w-0">
            <Icon name="link" size={20} className="text-primary" />
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-foreground tracking-tight truncate">
                Content Links &amp; Status
              </h3>
              <p className="text-[11px] text-muted-foreground font-mono truncate">
                ID: {task.id || task.ID}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground p-1 rounded-[6px] hover:bg-muted transition-colors cursor-pointer"
            onClick={onClose}
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 max-h-[420px] overflow-y-auto">
          {/* Task Summary Card */}
          <div className="p-3.5 rounded-[8px] bg-muted/20 border border-border space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              {task.pic && (
                <span className={`px-2 py-0.5 rounded-[6px] text-[10px] font-medium uppercase ${getPicBadgeClasses(task.pic)}`}>
                  {getPicDisplayName(task.pic)}
                </span>
              )}
              {task.category && (
                <span className="px-2 py-0.5 rounded-[6px] text-[10px] font-medium uppercase bg-muted border border-border text-muted-foreground">
                  {task.category}
                </span>
              )}
              {task.date && (
                <span className="text-[11px] text-muted-foreground font-mono">
                  {task.date}
                </span>
              )}
            </div>
            <h4 className="text-xs font-medium text-foreground leading-snug">
              {task.contentTitle || task['Content Title'] || 'Untitled Content'}
            </h4>
          </div>

          {/* Platform Links List */}
          <div className="space-y-2.5">
            <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider block font-medium">
              Live Platform URLs
            </label>

            {platformRows.length === 0 || platformRows.every(r => !r.URL || !String(r.URL).trim()) ? (
              <div className="py-6 px-4 text-center rounded-[8px] bg-muted/10 border border-dashed border-border space-y-2">
                <Icon name="link_off" size={28} className="text-muted-foreground/40 mx-auto" />
                <p className="text-xs text-muted-foreground">No live links attached to this task yet.</p>
                <p className="text-[11px] text-muted-foreground/70">Open in Dashboard to enter platform URLs and metrics.</p>
              </div>
            ) : (
              platformRows
                .filter(row => row.URL && String(row.URL).trim() !== '')
                .map((row, idx) => {
                  const platform = row.Platform || 'Link';
                  const isCopied = copiedPlatform === platform;
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-[8px] bg-muted/20 border border-border gap-3"
                    >
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium text-foreground">{platform}</span>
                          {row.Views && (
                            <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded-[4px]">
                              {row.Views} views
                            </span>
                          )}
                        </div>
                        <a
                          href={row.URL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-primary hover:underline truncate block font-mono"
                          title={row.URL}
                        >
                          {row.URL}
                        </a>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleCopy(platform, row.URL)}
                          className="p-1.5 rounded-[6px] bg-secondary hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                          title="Copy Link"
                        >
                          <Icon name={isCopied ? 'check' : 'content_copy'} size={15} />
                        </button>
                        <a
                          href={row.URL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-[6px] bg-primary/10 hover:bg-primary/20 text-primary transition-colors cursor-pointer"
                          title="Open URL in New Tab"
                        >
                          <Icon name="open_in_new" size={15} />
                        </a>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-border flex items-center justify-between bg-muted/20">
          <button
            type="button"
            className="bg-secondary text-secondary-foreground hover:bg-muted font-medium py-1.5 px-4 rounded-[8px] text-xs transition-colors cursor-pointer"
            onClick={onClose}
          >
            Close
          </button>
          <button
            type="button"
            className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium py-1.5 px-4 rounded-[8px] text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            onClick={handleOpenInDashboard}
          >
            <Icon name="dashboard_customize" size={15} />
            Open in Dashboard
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
