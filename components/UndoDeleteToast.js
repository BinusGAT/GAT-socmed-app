'use client';

import Icon from './Icon';

export default function UndoDeleteToast({ deletion, onUndo }) {
    if (!deletion) return null;
    return (
        <div role="status" aria-live="polite" className="undo-delete-toast">
            <Icon name="delete_clock" size={20} aria-hidden="true" />
            <span><strong>{deletion.label}</strong> will be deleted shortly.</span>
            <button type="button" onClick={onUndo}>Undo</button>
        </div>
    );
}
