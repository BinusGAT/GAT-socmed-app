import React from 'react';
import { cn } from '@/lib/utils';

export function Panel({ className, children, ...props }) {
  return (
    <div
      className={cn(
        'rounded-[10px] border border-outline-variant/30 bg-surface-container text-on-surface shadow-xs transition-colors',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function PanelHeader({ className, children, ...props }) {
  return (
    <div
      className={cn(
        'flex items-center justify-between px-5 py-4 border-b border-outline-variant/20 bg-surface-container-low/60 rounded-t-[10px]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function PanelTitle({ className, children, ...props }) {
  return (
    <h3
      className={cn('text-sm font-bold text-on-surface tracking-tight', className)}
      {...props}
    >
      {children}
    </h3>
  );
}

export function PanelDescription({ className, children, ...props }) {
  return (
    <p
      className={cn('text-xs text-on-surface-variant leading-relaxed', className)}
      {...props}
    >
      {children}
    </p>
  );
}

export function PanelContent({ className, children, ...props }) {
  return (
    <div className={cn('p-5', className)} {...props}>
      {children}
    </div>
  );
}

export function PanelFooter({ className, children, ...props }) {
  return (
    <div
      className={cn(
        'flex items-center justify-between px-5 py-3.5 border-t border-outline-variant/20 bg-surface-container-low/40 rounded-b-[10px]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
