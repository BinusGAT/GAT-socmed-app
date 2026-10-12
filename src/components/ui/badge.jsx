import React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[6px] text-xs font-semibold tracking-wide border transition-colors select-none',
  {
    variants: {
      variant: {
        default: 'bg-surface-container-high border-outline-variant/40 text-on-surface',
        primary: 'bg-primary/10 border-primary/25 text-primary',
        secondary: 'bg-surface-container-low border-outline-variant/30 text-on-surface-variant',
        success: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400',
        warning: 'bg-amber-500/10 border-amber-500/25 text-amber-600 dark:text-amber-400',
        destructive: 'bg-error/10 border-error/25 text-error',
        outline: 'border-outline-variant/60 text-on-surface-variant bg-transparent',
      },
      size: {
        default: 'text-xs py-0.5 px-2',
        sm: 'text-[11px] py-0.25 px-1.5 font-medium',
        lg: 'text-sm py-1 px-2.5',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export function Badge({ className, variant, size, ...props }) {
  return (
    <span
      className={cn(badgeVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { badgeVariants };
