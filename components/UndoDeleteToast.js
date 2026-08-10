'use client';

export default function UndoDeleteToast({ deletion, onUndo }) {
    if (!deletion) return null;
    return (
        <div role="status" aria-live="polite" className="undo-delete-toast">
            <span className="material-symbols-outlined" aria-hidden="true">delete_clock</span>
            <span><strong>{deletion.label}</strong> will be deleted shortly.</span>
            <button type="button" onClick={onUndo}>Undo</button>
        </div>
    );
}
