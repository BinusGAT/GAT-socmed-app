'use client';

import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useDialogFocus } from '../utils/useDialogFocus';

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
            <div ref={dialogRef} role="alertdialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} className="w-full max-w-sm rounded-xl border border-outline-variant/30 bg-surface-container p-6 shadow-2xl">
                <span className="material-symbols-outlined text-amber-500" aria-hidden="true">edit_note</span>
                <h2 id={titleId} className="mt-3 text-headline-sm font-bold text-on-surface">Discard unsaved changes?</h2>
                <p className="mt-2 text-body-sm leading-relaxed text-on-surface-variant">Your task draft is saved in this browser, but these changes have not been sent to the workspace.</p>
                <div className="mt-5 flex justify-end gap-3">
                    <button ref={keepButtonRef} type="button" onClick={onKeepEditing} className="rounded-lg bg-surface-container-high px-4 py-2 text-body-sm font-semibold text-on-surface">Keep editing</button>
                    <button type="button" onClick={onDiscard} className="rounded-lg border border-error/25 bg-error/10 px-4 py-2 text-body-sm font-semibold text-error">Discard</button>
                </div>
            </div>
        </div>,
        document.body,
    );
}
