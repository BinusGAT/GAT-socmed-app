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
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-background/60 backdrop-blur-xs px-4">
      <div className="bg-surface-container border border-outline-variant/30 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl animate-scale-up">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-outline-variant/20 flex justify-between items-center bg-surface-container-lowest">
          <div className="flex items-center gap-2.5 min-w-0">
            <Icon name="link" size={22} className="text-primary" />
            <div className="min-w-0">
              <h3 className="text-body-md font-bold text-on-surface font-display truncate">
                Content Links &amp; Status
              </h3>
              <p className="text-[11px] text-on-surface-variant font-mono truncate">
                ID: {task.id || task.ID}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg hover:bg-surface-container-high transition-colors cursor-pointer"
            onClick={onClose}
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 max-h-[420px] overflow-y-auto">
          {/* Task Summary Card */}
          <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/20 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              {task.pic && (
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getPicBadgeClasses(task.pic)}`}>
                  {getPicDisplayName(task.pic)}
                </span>
              )}
              {task.category && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-surface-container-high border border-outline-variant/30 text-on-surface-variant">
                  {task.category}
                </span>
              )}
              {task.date && (
                <span className="text-[11px] text-on-surface-variant font-mono">
                  {task.date}
                </span>
              )}
            </div>
            <h4 className="text-body-sm font-semibold text-on-surface leading-snug">
              {task.contentTitle || task['Content Title'] || 'Untitled Content'}
            </h4>
          </div>

          {/* Platform Links List */}
          <div className="space-y-2.5">
            <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider block">
              Live Platform URLs
            </label>

            {platformRows.length === 0 || platformRows.every(r => !r.URL || !String(r.URL).trim()) ? (
              <div className="py-6 px-4 text-center rounded-xl bg-surface-container-low border border-dashed border-outline-variant/30 space-y-2">
                <Icon name="link_off" size={28} className="text-on-surface-variant/40 mx-auto" />
                <p className="text-body-sm text-on-surface-variant">No live links attached to this task yet.</p>
                <p className="text-[11px] text-on-surface-variant/70">Open in Dashboard to enter platform URLs and metrics.</p>
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
                      className="flex items-center justify-between p-3 rounded-xl bg-surface-container-low border border-outline-variant/20 gap-3"
                    >
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-on-surface">{platform}</span>
                          {row.Views && (
                            <span className="text-[10px] text-on-surface-variant font-mono bg-surface-container-high px-1.5 py-0.2 rounded">
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
                          className="p-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
                          title="Copy Link"
                        >
                          <Icon name={isCopied ? 'check' : 'content_copy'} size={16} />
                        </button>
                        <a
                          href={row.URL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors cursor-pointer"
                          title="Open URL in New Tab"
                        >
                          <Icon name="open_in_new" size={16} />
                        </a>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-outline-variant/20 flex items-center justify-between bg-surface-container-lowest">
          <button
            type="button"
            className="bg-surface-container-high text-on-surface hover:bg-surface-container-highest font-semibold py-1.5 px-4 rounded-lg text-body-sm transition-colors cursor-pointer"
            onClick={onClose}
          >
            Close
          </button>
          <button
            type="button"
            className="bg-primary text-on-primary hover:opacity-90 font-semibold py-1.5 px-4 rounded-lg text-body-sm transition-opacity flex items-center gap-1.5 cursor-pointer shadow-xs"
            onClick={handleOpenInDashboard}
          >
            <Icon name="dashboard_customize" size={16} />
            Open in Dashboard
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
