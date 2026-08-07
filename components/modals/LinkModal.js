'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';

export default function LinkModal({ isOpen, onClose, onConfirm }) {
  const [url, setUrl] = useState('https://');
  if (!isOpen || typeof window === 'undefined') return null;

  function close() {
    setUrl('https://');
    onClose();
  }

  function submit(event) {
    event.preventDefault();
    onConfirm(url);
  }

  return createPortal(
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-[999]">
      <div className="w-full max-w-[400px] bg-surface-container border border-outline-variant/30 rounded-xl p-6 shadow-2xl space-y-4">
        <h3 className="text-body-lg font-bold text-on-surface">Insert Link</h3>
        <form onSubmit={submit} className="space-y-4">
          <label htmlFor="rich-text-link-url" className="text-label-md text-on-surface-variant uppercase tracking-widest block font-bold">Link URL</label>
          <input id="rich-text-link-url" type="url" className="w-full bg-surface-container-low border border-outline-variant/30 rounded px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-primary" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://example.com" required autoFocus />
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" className="bg-surface-container-high text-on-surface hover:bg-surface-container-highest font-semibold py-2 px-4 rounded text-body-sm transition-all micro-interaction" onClick={close}>Cancel</button>
            <button type="submit" className="bg-primary text-on-primary hover:opacity-90 font-semibold py-2 px-4 rounded text-body-sm transition-all micro-interaction">Insert</button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}

