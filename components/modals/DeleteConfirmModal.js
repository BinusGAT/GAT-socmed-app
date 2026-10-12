import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useDialogFocus } from '../../utils/useDialogFocus';
import Icon from '../Icon';

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
      <div ref={dialogRef} role="alertdialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId} tabIndex={-1} className="w-full max-w-[420px] bg-surface border border-border rounded-[10px] p-6 shadow-none flex flex-col items-center gap-4 text-center">
        <Icon name="warning" size={36} className="text-destructive" aria-hidden="true" />
        <h3 id={titleId} className="text-base font-semibold text-foreground tracking-tight">{title}</h3>
        <p id={descriptionId} className="text-xs text-muted-foreground leading-relaxed">{message || 'This action cannot be undone.'}</p>
        
        {seriesOptions?.isSeries && (
          <div className="w-full p-3 bg-primary/10 border border-primary/20 rounded-[8px] text-xs text-foreground text-left space-y-1">
            <p className="font-semibold flex items-center gap-1.5 text-primary">
              <Icon name="repeat" size={15} /> Part of a recurring series
            </p>
            <p className="text-muted-foreground">Choose how you want to apply this deletion:</p>
          </div>
        )}

        <div className={`w-full mt-2 ${seriesOptions?.isSeries ? 'flex flex-col gap-2' : 'flex gap-3'}`}>
          {seriesOptions?.isSeries ? (
            <>
              <button 
                type="button" 
                disabled={isPending}
                className="w-full bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/20 font-medium py-2 px-3 rounded-[8px] text-xs transition-colors cursor-pointer"
                onClick={() => onConfirm('single')}
              >
                Delete this task only
              </button>
              <button 
                type="button" 
                disabled={isPending}
                className="w-full bg-destructive/80 hover:bg-destructive text-destructive-foreground font-medium py-2 px-3 rounded-[8px] text-xs transition-colors cursor-pointer"
                onClick={() => onConfirm('future')}
              >
                Delete this &amp; all future tasks
              </button>
              <button 
                type="button" 
                disabled={isPending}
                className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90 font-medium py-2 px-3 rounded-[8px] text-xs transition-colors cursor-pointer"
                onClick={() => onConfirm('all')}
              >
                Delete entire series
              </button>
              <button ref={cancelButtonRef} type="button" disabled={isPending} className="w-full bg-secondary text-secondary-foreground hover:bg-muted font-medium py-2 px-4 rounded-[8px] text-xs transition-colors disabled:opacity-60" onClick={closeDialog}>Cancel</button>
            </>
          ) : (
            <>
              <button ref={cancelButtonRef} type="button" disabled={isPending} className="flex-1 bg-secondary text-secondary-foreground hover:bg-muted font-medium py-2.5 px-4 rounded-[8px] text-xs transition-colors disabled:opacity-60" onClick={closeDialog}>Cancel</button>
              <button type="button" disabled={isPending} aria-busy={isPending ? 'true' : 'false'} className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90 font-medium py-2.5 px-4 rounded-[8px] text-xs transition-colors disabled:cursor-wait disabled:opacity-60" onClick={() => onConfirm('single')}>{isPending ? 'Deleting...' : 'Delete'}</button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
