import React from 'react';
import { cn } from '@/lib/utils';

export const Input = React.forwardRef(function Input(
  { className, type = 'text', error, ...props },
  ref
) {
  return (
    <input
      type={type}
      ref={ref}
      className={cn(
        'w-full bg-surface-container-low border border-outline-variant/50 rounded-md px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/50 transition-colors duration-150 outline-none',
        'focus:border-primary focus:ring-1 focus:ring-primary',
        'disabled:cursor-not-allowed disabled:opacity-50',
        error && 'border-error focus:border-error focus:ring-error',
        className
      )}
      {...props}
    />
  );
});

export function Field({ label, error, helperText, id, required, children, className = '' }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label htmlFor={id} className="block text-xs font-semibold text-on-surface tracking-wide">
          {label} {required && <span className="text-error" aria-hidden="true">*</span>}
        </label>
      )}
      {children}
      {helperText && !error && (
        <p className="text-xs text-on-surface-variant leading-normal">{helperText}</p>
      )}
      {error && (
        <p role="alert" className="text-xs text-error font-medium leading-normal">{error}</p>
      )}
    </div>
  );
}
