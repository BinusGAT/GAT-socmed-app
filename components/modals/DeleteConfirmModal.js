'use client';

import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';

export default function DeleteConfirmModal({ isOpen, onClose, onCancel, onConfirm, title = 'Delete item?', message, isPending = false }) {
  const cancelButtonRef = useRef(null);
  const titleId = useId();
  const descriptionId = useId();
  const closeDialog = onClose || onCancel;

  useEffect(() => {
    if (!isOpen) return;
    cancelButtonRef.current?.focus();
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !isPending) closeDialog?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isPending, closeDialog]);

  if (!isOpen || typeof window === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-[999]" onMouseDown={(event) => event.target === event.currentTarget && !isPending && closeDialog?.()}>
      <div role="alertdialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId} className="w-full max-w-[400px] bg-surface-container border border-outline-variant/30 rounded-xl p-6 shadow-2xl flex flex-col items-center gap-4 text-center">
        <span className="material-symbols-outlined text-error text-[32px]" aria-hidden="true">warning</span>
        <h3 id={titleId} className="text-headline-md font-bold text-on-surface">{title}</h3>
        <p id={descriptionId} className="text-body-sm text-on-surface-variant/80 leading-relaxed">{message || 'This action cannot be undone.'}</p>
        <div className="flex gap-3 w-full mt-2">
          <button ref={cancelButtonRef} type="button" disabled={isPending} className="flex-1 bg-surface-container-high text-on-surface hover:bg-surface-container-highest font-semibold py-2.5 px-4 rounded-lg text-body-sm transition-all micro-interaction disabled:opacity-60" onClick={closeDialog}>Cancel</button>
          <button type="button" disabled={isPending} aria-busy={isPending ? 'true' : 'false'} className="flex-1 bg-error-container/20 text-error border border-error/20 hover:bg-error-container/30 font-semibold py-2.5 px-4 rounded-lg text-body-sm transition-all micro-interaction disabled:cursor-wait disabled:opacity-60" onClick={onConfirm}>{isPending ? 'Deleting…' : 'Delete'}</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
