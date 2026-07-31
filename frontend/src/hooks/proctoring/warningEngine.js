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
    warningCooldownMs: 60000,   // Wait 60 seconds before showing another warning popup
    mergeWindowMs: 30000,       // Merge events of the same type occurring within 30s
    maxEvidenceFrames: 5,       // Capped to prevent memory issues
};

export class WarningEngine {
    constructor(config = {}) {
        this.config = { ...DEFAULT_WARNING_CONFIG, ...config };
        this.warningHistory = []; // List of all logged/merged warning records
        this.currentLevel = ESCALATION_LEVELS.INFO;
        this.counts = {
            [ESCALATION_LEVELS.INFO]: 0,
            [ESCALATION_LEVELS.WARNING]: 0,
            [ESCALATION_LEVELS.MAJOR]: 0,
            [ESCALATION_LEVELS.CRITICAL]: 0,
            [ESCALATION_LEVELS.AUTO_SUBMIT]: 0,
        };
        this.listeners = new Set();
        this.lastWarningPopupTime = 0; // Tracks the last time a popup warning was displayed
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

        const nowMs = Date.now();
        const eventType = action.eventType || 'unknown';
        const currentConfidence = action.data?.confidence || 0.85;

        // ── 1. Event Deduplication & Merging ─────────────────────────────────
        // Find if a matching event type exists recently (within merge window)
        const existingRecord = this.warningHistory.find(
            (r) => r.eventType === eventType && (nowMs - new Date(r.endTime).getTime() < this.config.mergeWindowMs)
        );

        if (existingRecord) {
            // Merge into the existing record
            existingRecord.endTime = new Date(nowMs).toISOString();
            existingRecord.duration = Math.round((nowMs - new Date(existingRecord.startTime).getTime()) / 1000);
            existingRecord.maxConfidence = Math.max(existingRecord.maxConfidence, currentConfidence);

            // Capture new evidence frame (if applicable and within limit)
            if (videoElement && existingRecord.evidenceFrames.length < this.config.maxEvidenceFrames) {
                const snapshot = this.captureSnapshot(videoElement);
                if (snapshot) {
                    existingRecord.evidenceFrames.push(snapshot);
                    existingRecord.snapshot = snapshot; // Keep latest snapshot as primary reference
                }
            }

            // Trigger listener notification for update
            this.notify({ ...existingRecord, isMergedUpdate: true });
            return existingRecord;
        }

        // ── 2. Cooldown system for Warning Popups ────────────────────────────
        // Check if we should suppress the warning popup/toast to avoid spamming
        const isPopupLevel = action.severity === 'critical' || action.severity === 'high' || action.action === 'major_warning' || action.action === 'warning';
        const onCooldown = nowMs - this.lastWarningPopupTime < this.config.warningCooldownMs;

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

        // If on cooldown and it's a popup-level warning, demote it to info/silent logging
        let shouldShowPopup = isPopupLevel && !onCooldown;
        if (level === ESCALATION_LEVELS.AUTO_SUBMIT) {
            shouldShowPopup = true; // Auto-submit can never be suppressed
        }

        if (shouldShowPopup) {
            this.lastWarningPopupTime = nowMs;
        } else if (isPopupLevel) {
            // Log silently, do not show popup/toast
            level = ESCALATION_LEVELS.INFO;
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

        // Capture initial snapshot
        let snapshotDataUrl = null;
        const initialEvidenceFrames = [];
        if (videoElement) {
            snapshotDataUrl = this.captureSnapshot(videoElement);
            if (snapshotDataUrl) {
                initialEvidenceFrames.push(snapshotDataUrl);
            }
        }

        const warningRecord = {
            id: `${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            startTime: new Date(nowMs).toISOString(),
            endTime: new Date(nowMs).toISOString(),
            timestamp: new Date(nowMs).toISOString(),
            level,
            eventType,
            reason: action.reason,
            severity: action.severity || 'medium',
            proctoringScore: action.proctoringScore,
            duration: 0,
            maxConfidence: currentConfidence,
            evidenceFrames: initialEvidenceFrames,
            snapshot: snapshotDataUrl,
            data: action.data || {},
            shouldShowPopup, // UI can check this flag to decide on alerts
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
        this.lastWarningPopupTime = 0;
    }
}
