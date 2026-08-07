'use client';

import { createPortal } from 'react-dom';

export default function DeleteConfirmModal({ isOpen, onClose, onConfirm, message }) {
  if (!isOpen || typeof window === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-[999]">
      <div className="w-full max-w-[400px] bg-surface-container border border-outline-variant/30 rounded-xl p-6 shadow-2xl flex flex-col items-center gap-4 text-center">
        <span className="material-symbols-outlined text-error text-[32px]" aria-hidden="true">warning</span>
        <h3 className="text-headline-md font-bold text-on-surface">Confirm Delete</h3>
        <p className="text-body-sm text-on-surface-variant/80 leading-relaxed">{message || 'Are you sure you want to delete this item?'}</p>
        <div className="flex gap-3 w-full mt-2">
          <button type="button" className="flex-1 bg-surface-container-high text-on-surface hover:bg-surface-container-highest font-semibold py-2.5 px-4 rounded-lg text-body-sm transition-all micro-interaction" onClick={onClose}>Cancel</button>
          <button type="button" className="flex-1 bg-error-container/20 text-error border border-error/20 hover:bg-error-container/30 font-semibold py-2.5 px-4 rounded-lg text-body-sm transition-all micro-interaction" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

