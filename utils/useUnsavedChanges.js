'use client';

import { useEffect } from 'react';

export function useUnsavedChanges(isDirty) {
    useEffect(() => {
        if (!isDirty) return;
        const handleBeforeUnload = (event) => {
            event.preventDefault();
            event.returnValue = '';
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isDirty]);
}
