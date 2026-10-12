'use client';

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import Icon from './icon';

export function Drawer({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  className = '',
  maxWidth = 'max-w-xl',
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
      className="fixed inset-0 z-[100] flex justify-end bg-background/60 backdrop-blur-xs animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose?.();
        }
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabelledby}
        aria-describedby={ariaDescribedby}
        className={cn(
          'relative flex h-full w-full flex-col border-l border-outline-variant/30 bg-surface-container text-on-surface shadow-2xl animate-slide-in',
          maxWidth,
          className
        )}
      >
        {/* Drawer Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-outline-variant/20 bg-surface-container-low px-6 py-4">
          <div className="space-y-0.5 min-w-0 pr-4">
            {title && (
              <h2
                id={ariaLabelledby}
                className="text-base font-bold text-on-surface truncate"
              >
                {title}
              </h2>
            )}
            {description && (
              <p
                id={ariaDescribedby}
                className="text-xs text-on-surface-variant truncate"
              >
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors cursor-pointer"
            aria-label="Close"
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {children}
        </div>

        {/* Drawer Footer */}
        {footer && (
          <div className="shrink-0 border-t border-outline-variant/20 bg-surface-container-low px-6 py-3.5">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
