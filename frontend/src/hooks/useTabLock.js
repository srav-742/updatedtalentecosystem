import { useState, useEffect, useCallback, useRef } from 'react';

const useTabLock = (options = {}) => {
    const {
        maxWarnings = 3,
        onMaxWarningsExceeded,
        isActive = false,
        warningTimeout = 3000 // Auto-hide warning after 3 seconds
    } = options;

    const [warnings, setWarnings] = useState(0);
    const [violations, setViolations] = useState([]);
    const [showWarning, setShowWarning] = useState(false);
    const [lastViolationType, setLastViolationType] = useState(null);
    const [isLocked, setIsLocked] = useState(false);
    const [isTerminated, setIsTerminated] = useState(false);

    const warningTimeoutRef = useRef(null);
    const callbacksRef = useRef({ onMaxWarningsExceeded });

    // Update callback ref to avoid stale closures
    useEffect(() => {
        callbacksRef.current.onMaxWarningsExceeded = onMaxWarningsExceeded;
    }, [onMaxWarningsExceeded]);

    const triggerWarning = useCallback((type = 'tab_switch') => {
        if (!isActive || isTerminated) return;

        const newViolation = {
            timestamp: Date.now(),
            type
        };

        setViolations(prev => [...prev, newViolation]);
        setWarnings(prev => {
            const newCount = prev + 1;
            if (newCount >= maxWarnings) {
                setIsTerminated(true);
                setIsLocked(true);
                setShowWarning(false);
                if (callbacksRef.current.onMaxWarningsExceeded) {
                    callbacksRef.current.onMaxWarningsExceeded(newViolation);
                }
            } else {
                setLastViolationType(type);
                setShowWarning(true);
                // Auto-hide warning after timeout
                if (warningTimeoutRef.current) {
                    clearTimeout(warningTimeoutRef.current);
                }
                warningTimeoutRef.current = setTimeout(() => {
                    setShowWarning(false);
                }, warningTimeout);
            }
            return newCount;
        });
    }, [isActive, isTerminated, maxWarnings, warningTimeout]);

    // Handle visibility change (tab switching)
    useEffect(() => {
        if (!isActive || isTerminated) return;

        const handleVisibilityChange = () => {
            if (document.hidden) {
                triggerWarning('tab_switch');
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [isActive, isTerminated, triggerWarning]);

    // Handle window blur (focus lost)
    useEffect(() => {
        if (!isActive || isTerminated) return;

        const handleBlur = () => {
            // Small delay to check if visibility also changed (avoid double counting)
            setTimeout(() => {
                if (!document.hidden) {
                    triggerWarning('window_blur');
                }
            }, 100);
        };

        window.addEventListener('blur', handleBlur);
        return () => {
            window.removeEventListener('blur', handleBlur);
        };
    }, [isActive, isTerminated, triggerWarning]);

    // Handle keyboard shortcuts
    useEffect(() => {
        if (!isActive || isTerminated) return;

        const handleKeyDown = (e) => {
            // Blocked shortcuts
            const blockedShortcuts = [
                { key: 't', ctrl: true, desc: 'new_tab' },
                { key: 'n', ctrl: true, desc: 'new_window' },
                { key: 'l', ctrl: true, desc: 'address_bar' },
                { key: 'w', ctrl: true, desc: 'close_tab' },
                { key: 'tab', alt: true, desc: 'switch_window' },
                { key: 'f4', alt: true, desc: 'close_window' },
                { key: 'printscreen', desc: 'screenshot' },
                { key: 'f12', desc: 'devtools' },
                { key: 'f11', desc: 'fullscreen' },
                { key: 'i', ctrl: true, shift: true, desc: 'devtools' },
                { key: 'j', ctrl: true, shift: true, desc: 'devtools' },
                { key: 'c', ctrl: true, shift: true, desc: 'devtools' },
                { key: 'k', ctrl: true, shift: true, desc: 'devtools' },
            ];

            const keyPressed = e.key.toLowerCase();

            for (const shortcut of blockedShortcuts) {
                const ctrlMatch = shortcut.ctrl ? e.ctrlKey : !e.ctrlKey;
                const altMatch = shortcut.alt ? e.altKey : !e.altKey;
                const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;
                const keyMatch = keyPressed === shortcut.key.toLowerCase();

                if (ctrlMatch && altMatch && shiftMatch && keyMatch) {
                    e.preventDefault();
                    e.stopPropagation();
                    triggerWarning(`keyboard_${shortcut.desc}`);
                    break;
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown, true); // Use capture phase
        return () => {
            document.removeEventListener('keydown', handleKeyDown, true);
        };
    }, [isActive, isTerminated, triggerWarning]);

    // Handle before unload (page close/refresh)
    useEffect(() => {
        if (!isActive || isTerminated) return;

        const handleBeforeUnload = (e) => {
            e.preventDefault();
            e.returnValue = ''; // Required for Chrome
            return '';
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [isActive, isTerminated]);

    // Handle context menu (right-click)
    useEffect(() => {
        if (!isActive || isTerminated) return;

        const handleContextMenu = (e) => {
            e.preventDefault();
            triggerWarning('context_menu');
        };

        document.addEventListener('contextmenu', handleContextMenu);
        return () => {
            document.removeEventListener('contextmenu', handleContextMenu);
        };
    }, [isActive, isTerminated, triggerWarning]);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (warningTimeoutRef.current) {
                clearTimeout(warningTimeoutRef.current);
            }
        };
    }, []);

    const resetWarnings = useCallback(() => {
        setWarnings(0);
        setViolations([]);
        setShowWarning(false);
        setIsLocked(false);
        setIsTerminated(false);
        setLastViolationType(null);
    }, []);

    const dismissWarning = useCallback(() => {
        setShowWarning(false);
        if (warningTimeoutRef.current) {
            clearTimeout(warningTimeoutRef.current);
        }
    }, []);

    return {
        warnings,
        violations,
        showWarning,
        lastViolationType,
        isLocked,
        isTerminated,
        resetWarnings,
        dismissWarning,
        triggerWarning
    };
};

export default useTabLock;
