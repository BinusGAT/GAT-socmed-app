'use client';

import { useRef, useState } from 'react';

export function useDeferredDelete({ delayMs = 6000 } = {}) {
    const [pendingDeletion, setPendingDeletion] = useState(null);
    const timerRef = useRef(null);

    const scheduleDelete = ({ label, execute }) => {
        if (timerRef.current) return false;
        const deadline = Date.now() + delayMs;
        setPendingDeletion({ label, deadline });
        timerRef.current = setTimeout(async () => {
            timerRef.current = null;
            setPendingDeletion(null);
            await execute();
        }, delayMs);
        return true;
    };

    const undoDelete = () => {
        if (!timerRef.current) return false;
        clearTimeout(timerRef.current);
        timerRef.current = null;
        setPendingDeletion(null);
        return true;
    };

    return { pendingDeletion, scheduleDelete, undoDelete };
}
