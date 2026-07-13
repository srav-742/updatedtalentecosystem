/**
 * Warning Escalation Engine
 * ──────────────────────────────────────────────────────────────────────────────
 * Manages warning states, escalation from informational toasts to modal overlays
 * and auto-submission, evidence frame snapshots, and warning event emission.
 * No UI styling here — strictly escalation logic and history tracking.
 * ──────────────────────────────────────────────────────────────────────────────
 */

export const ESCALATION_LEVELS = {
    INFO: 'info',               // Non-blocking toast notification
    WARNING: 'warning',         // Standard warning overlay / toast
    MAJOR: 'major',             // Modal overlay with countdown
    CRITICAL: 'critical',       // Persistent overlay require reset or review
    AUTO_SUBMIT: 'auto_submit', // Mandatory exam termination and auto-submit
};

export const DEFAULT_WARNING_CONFIG = {
    maxMinorWarnings: 3,        // Escalates to major warning after 3 minor warnings
    maxMajorWarnings: 2,        // Escalates to auto-submit after 2 major warnings
    snapshotQuality: 0.7,       // JPEG quality for captured evidence frames
    snapshotWidth: 640,
    snapshotHeight: 480,
};

export class WarningEngine {
    constructor(config = {}) {
        this.config = { ...DEFAULT_WARNING_CONFIG, ...config };
        this.warningHistory = [];
        this.currentLevel = ESCALATION_LEVELS.INFO;
        this.counts = {
            [ESCALATION_LEVELS.INFO]: 0,
            [ESCALATION_LEVELS.WARNING]: 0,
            [ESCALATION_LEVELS.MAJOR]: 0,
            [ESCALATION_LEVELS.CRITICAL]: 0,
            [ESCALATION_LEVELS.AUTO_SUBMIT]: 0,
        };
        this.listeners = new Set();
    }

    addListener(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    notify(event) {
        for (const listener of this.listeners) {
            try {
                listener(event);
            } catch (e) {
                console.error('[WarningEngine] Listener error:', e);
            }
        }
    }

    /**
     * Process an incoming action from the Behavior Engine and determine escalation
     * @param {Object} action - { action, eventType, severity, reason, data, proctoringScore }
     * @param {HTMLVideoElement|HTMLCanvasElement|null} videoElement - For frame capture
     */
    processAction(action, videoElement = null) {
        if (!action || action.action === 'wait' || action.action === 'ok') {
            return null;
        }

        const timestamp = new Date().toISOString();
        let level = ESCALATION_LEVELS.INFO;

        if (action.action === 'auto_submit') {
            level = ESCALATION_LEVELS.AUTO_SUBMIT;
        } else if (action.severity === 'critical') {
            level = ESCALATION_LEVELS.CRITICAL;
        } else if (action.severity === 'high' || action.action === 'major_warning') {
            level = ESCALATION_LEVELS.MAJOR;
        } else if (action.severity === 'medium' || action.action === 'warning') {
            level = ESCALATION_LEVELS.WARNING;
        }

        // Apply escalation rules based on counts
        this.counts[level] += 1;

        if (level === ESCALATION_LEVELS.WARNING && this.counts[ESCALATION_LEVELS.WARNING] >= this.config.maxMinorWarnings) {
            level = ESCALATION_LEVELS.MAJOR;
        }

        if (level === ESCALATION_LEVELS.MAJOR && this.counts[ESCALATION_LEVELS.MAJOR] >= this.config.maxMajorWarnings) {
            level = ESCALATION_LEVELS.AUTO_SUBMIT;
        }

        this.currentLevel = level;

        // Capture evidence snapshot if video element is provided
        let snapshotDataUrl = null;
        if (videoElement && (level === ESCALATION_LEVELS.MAJOR || level === ESCALATION_LEVELS.CRITICAL || level === ESCALATION_LEVELS.AUTO_SUBMIT)) {
            snapshotDataUrl = this.captureSnapshot(videoElement);
        }

        const warningRecord = {
            id: `${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            timestamp,
            level,
            eventType: action.eventType,
            reason: action.reason,
            severity: action.severity,
            proctoringScore: action.proctoringScore,
            data: action.data || {},
            snapshot: snapshotDataUrl,
        };

        this.warningHistory.push(warningRecord);
        this.notify(warningRecord);

        return warningRecord;
    }

    captureSnapshot(videoElement) {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = this.config.snapshotWidth;
            canvas.height = this.config.snapshotHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
            return canvas.toDataURL('image/jpeg', this.config.snapshotQuality);
        } catch (e) {
            console.warn('[WarningEngine] Failed to capture snapshot:', e);
            return null;
        }
    }

    getHistory() {
        return [...this.warningHistory];
    }

    getCounts() {
        return { ...this.counts };
    }

    reset() {
        this.warningHistory = [];
        this.currentLevel = ESCALATION_LEVELS.INFO;
        Object.keys(this.counts).forEach(k => { this.counts[k] = 0; });
    }
}
