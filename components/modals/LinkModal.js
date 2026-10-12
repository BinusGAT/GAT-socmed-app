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
      <div className="w-full max-w-[400px] bg-surface border border-border rounded-[10px] p-6 shadow-none space-y-4">
        <h3 className="text-base font-semibold text-foreground tracking-tight">Insert Link</h3>
        <form onSubmit={submit} className="space-y-4">
          <label htmlFor="rich-text-link-url" className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider block font-medium">Link URL</label>
          <input id="rich-text-link-url" type="url" className="w-full bg-background border border-border rounded-[8px] px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors font-mono" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://example.com" required autoFocus />
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" className="bg-secondary text-secondary-foreground hover:bg-muted font-medium py-2 px-4 rounded-[8px] text-xs transition-colors" onClick={close}>Cancel</button>
            <button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium py-2 px-4 rounded-[8px] text-xs transition-colors">Insert</button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}

