'use client';

import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useDialogFocus } from '../utils/useDialogFocus';
import Icon from './Icon';

export default function DiscardChangesModal({ isOpen, onKeepEditing, onDiscard }) {
    const titleId = useId();
    const keepButtonRef = useRef(null);
    const dialogRef = useDialogFocus(isOpen, { onEscape: onKeepEditing, initialFocusRef: keepButtonRef });

    useEffect(() => {
        if (!isOpen) return;
        keepButtonRef.current?.focus();
    }, [isOpen]);

    if (!isOpen || typeof window === 'undefined') return null;
    return createPortal(
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
            <div ref={dialogRef} role="alertdialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} className="w-full max-w-sm rounded-[10px] border border-border bg-surface p-6 shadow-none">
                <Icon name="edit_note" size={24} className="text-amber-500" aria-hidden="true" />
                <h2 id={titleId} className="mt-3 text-base font-semibold text-foreground tracking-tight">Discard unsaved changes?</h2>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Your task draft is saved in this browser, but these changes have not been sent to the workspace.</p>
                <div className="mt-5 flex justify-end gap-3">
                    <button ref={keepButtonRef} type="button" onClick={onKeepEditing} className="rounded-[8px] bg-secondary px-4 py-2 text-xs font-medium text-secondary-foreground hover:bg-muted transition-colors">Keep editing</button>
                    <button type="button" onClick={onDiscard} className="rounded-[8px] border border-destructive/20 bg-destructive/10 px-4 py-2 text-xs font-medium text-destructive hover:bg-destructive/20 transition-colors">Discard</button>
                </div>
            </div>
        </div>,
        document.body,
    );
}
