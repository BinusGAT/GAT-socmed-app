import React from 'react';
import { cn } from '@/lib/utils';

export function Table({ className, children, ...props }) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn('w-full caption-bottom text-sm', className)} {...props}>
        {children}
      </table>
    </div>
  );
}

export function TableHeader({ className, children, ...props }) {
  return (
    <thead
      className={cn('sticky top-0 z-10 bg-surface-container-low/90 backdrop-blur-xs border-b border-outline-variant/30 text-xs font-semibold uppercase tracking-wider text-on-surface-variant', className)}
      {...props}
    >
      {children}
    </thead>
  );
}

export function TableBody({ className, children, ...props }) {
  return (
    <tbody
      className={cn('divide-y divide-outline-variant/20 text-on-surface', className)}
      {...props}
    >
      {children}
    </tbody>
  );
}

export function TableRow({ className, children, ...props }) {
  return (
    <tr
      className={cn(
        'transition-colors duration-100 hover:bg-surface-container-low/70',
        className
      )}
      {...props}
    >
      {children}
    </tr>
  );
}

export function TableHead({ className, children, ...props }) {
  return (
    <th
      scope="col"
      className={cn(
        'px-4 py-3 text-left font-semibold text-on-surface-variant whitespace-nowrap',
        className
      )}
      {...props}
    >
      {children}
    </th>
  );
}

export function TableCell({ className, children, ...props }) {
  return (
    <td
      className={cn(
        'px-4 py-3 text-sm align-middle whitespace-nowrap',
        className
      )}
      {...props}
    >
      {children}
    </td>
  );
}
