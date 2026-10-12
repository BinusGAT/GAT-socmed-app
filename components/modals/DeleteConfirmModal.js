'use client';

import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useDialogFocus } from '../../utils/useDialogFocus';

export default function DeleteConfirmModal({ 
  isOpen, 
  onClose, 
  onCancel, 
  onConfirm, 
  title = 'Delete item?', 
  message, 
  isPending = false,
  seriesOptions = null 
}) {
  const cancelButtonRef = useRef(null);
  const titleId = useId();
  const descriptionId = useId();
  const closeDialog = onClose || onCancel;
  const dialogRef = useDialogFocus(isOpen, { onEscape: isPending ? undefined : closeDialog, initialFocusRef: cancelButtonRef });

  useEffect(() => {
    if (!isOpen) return;
    cancelButtonRef.current?.focus();
  }, [isOpen]);

  if (!isOpen || typeof window === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-[999]" onMouseDown={(event) => event.target === event.currentTarget && !isPending && closeDialog?.()}>
      <div ref={dialogRef} role="alertdialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId} tabIndex={-1} className="w-full max-w-[420px] bg-surface-container border border-outline-variant/30 rounded-xl p-6 shadow-2xl flex flex-col items-center gap-4 text-center">
        <span className="material-symbols-outlined text-error text-[32px]" aria-hidden="true">warning</span>
        <h3 id={titleId} className="text-headline-md font-bold text-on-surface">{title}</h3>
        <p id={descriptionId} className="text-body-sm text-on-surface-variant/80 leading-relaxed">{message || 'This action cannot be undone.'}</p>
        
        {seriesOptions?.isSeries && (
          <div className="w-full p-3 bg-primary/10 border border-primary/20 rounded-lg text-xs text-on-surface text-left space-y-1">
            <p className="font-bold flex items-center gap-1 text-primary">
              <span className="material-symbols-outlined text-[15px]">repeat</span> Part of a recurring series
            </p>
            <p className="text-on-surface-variant">Choose how you want to apply this deletion:</p>
          </div>
        )}

        <div className={`w-full mt-2 ${seriesOptions?.isSeries ? 'flex flex-col gap-2' : 'flex gap-3'}`}>
          {seriesOptions?.isSeries ? (
            <>
              <button 
                type="button" 
                disabled={isPending}
                className="w-full bg-error/20 hover:bg-error/30 text-error border border-error/30 font-semibold py-2 px-3 rounded-lg text-body-sm transition-colors cursor-pointer"
                onClick={() => onConfirm('single')}
              >
                Delete this task only
              </button>
              <button 
                type="button" 
                disabled={isPending}
                className="w-full bg-error/85 hover:bg-error text-on-error font-semibold py-2 px-3 rounded-lg text-body-sm transition-colors cursor-pointer"
                onClick={() => onConfirm('future')}
              >
                Delete this &amp; all future tasks
              </button>
              <button 
                type="button" 
                disabled={isPending}
                className="w-full bg-error text-on-error hover:opacity-90 font-semibold py-2 px-3 rounded-lg text-body-sm transition-opacity cursor-pointer"
                onClick={() => onConfirm('all')}
              >
                Delete entire series
              </button>
              <button ref={cancelButtonRef} type="button" disabled={isPending} className="w-full bg-surface-container-high text-on-surface hover:bg-surface-container-highest font-semibold py-2 px-4 rounded-lg text-body-sm transition-all micro-interaction disabled:opacity-60" onClick={closeDialog}>Cancel</button>
            </>
          ) : (
            <>
              <button ref={cancelButtonRef} type="button" disabled={isPending} className="flex-1 bg-surface-container-high text-on-surface hover:bg-surface-container-highest font-semibold py-2.5 px-4 rounded-lg text-body-sm transition-all micro-interaction disabled:opacity-60" onClick={closeDialog}>Cancel</button>
              <button type="button" disabled={isPending} aria-busy={isPending ? 'true' : 'false'} className="flex-1 bg-error-container/20 text-error border border-error/20 hover:bg-error-container/30 font-semibold py-2.5 px-4 rounded-lg text-body-sm transition-all micro-interaction disabled:cursor-wait disabled:opacity-60" onClick={() => onConfirm('single')}>{isPending ? 'Deleting…' : 'Delete'}</button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
