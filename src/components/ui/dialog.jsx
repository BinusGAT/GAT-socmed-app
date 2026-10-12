'use client';

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import Icon from './icon';

export function Dialog({
  isOpen,
  onClose,
  title,
  description,
  children,
  className = '',
  maxWidth = 'max-w-md',
  isAlert = false,
  showClose = true,
  'aria-labelledby': ariaLabelledby,
  'aria-describedby': ariaDescribedby,
}) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        onClose?.();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || typeof window === 'undefined') return null;

  return createPortal(
    <div
      role="presentation"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/60 backdrop-blur-xs animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose?.();
        }
      }}
    >
      <div
        ref={panelRef}
        role={isAlert ? 'alertdialog' : 'dialog'}
        aria-modal="true"
        aria-labelledby={ariaLabelledby}
        aria-describedby={ariaDescribedby}
        className={cn(
          'relative w-full rounded-[10px] border border-outline-variant/30 bg-surface-container text-on-surface p-6 shadow-2xl animate-scale-up',
          maxWidth,
          className
        )}
      >
        {(title || showClose) && (
          <div className="flex items-start justify-between pb-3 border-b border-outline-variant/20 mb-4">
            <div className="space-y-0.5 min-w-0 pr-4">
              {title && (
                <h3 id={ariaLabelledby} className="text-base font-bold text-on-surface">
                  {title}
                </h3>
              )}
              {description && (
                <p id={ariaDescribedby} className="text-xs text-on-surface-variant">
                  {description}
                </p>
              )}
            </div>
            {showClose && (
              <button
                type="button"
                onClick={onClose}
                className="rounded-md p-1.5 text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors cursor-pointer"
                aria-label="Close"
              >
                <Icon name="close" size={18} />
              </button>
            )}
          </div>
        )}

        <div>{children}</div>
      </div>
    </div>,
    document.body
  );
}
