/**
 * Behavior Analysis Engine
 * ──────────────────────────────────────────────────────────────────────────────
 * Pure-function module that aggregates signals from all detectors and applies
 * temporal rules to determine confirmed violations. No React dependencies.
 *
 * This is the "brain" of the multi-layer proctoring pipeline — it prevents
 * false positives by requiring multi-signal confirmation before triggering.
 * ──────────────────────────────────────────────────────────────────────────────
 */

// ── Score penalty table ──────────────────────────────────────────────────────
export const SCORE_PENALTIES = {
    mobile_phone_detected: 30,
    multiple_faces_detected: 40,
    looking_away: 10,
    continuous_talking: 15,
    no_face_detected: 20,
    phone_near_face: 25,
    phone_near_ear: 35,
    eyes_closed: 15,
    head_turned: 10,
    hand_near_lap: 5,
    multiple_voices: 20,
    new_object_appeared: 10,
    secondary_laptop_detected: 20,
    book_detected: 10,
    tablet_detected: 25,
    earphone_detected: 15,
    suspicious_object_detected: 10,
    person_count_violation: 35,
    rapid_gaze_movement: 5,
    hand_leaving_frame: 5,
    background_noise: 5,
    environment_change: 10,
};

// ── Temporal rule definitions ────────────────────────────────────────────────
export const PHONE_RULES = {
    ignoreUnderMs: 0,           // Immediate detection (0ms delay)
    warningAfterMs: 0,          // Immediate warning on appearance
    majorWarningAfterMs: 3000,  // > 3 seconds → major warning
    autoSubmitAfterMs: 8000,    // > 8 seconds → auto submit
    minConfidence: 0.45,        // Calibrated confidence threshold (0.45)
    minConsecutiveFrames: 1,    // Flag on frame 1 appearance
    minPersistenceMs: 0,        // Immediate persistence trigger
    staticMovementThreshold: 20, // < 20px movement = static (ignore)
    dynamicMovementThreshold: 20, // > 20px movement in 2s = real phone
    confirmationFrames: 1,      // Immediate confirmation on 1st frame
};

export const FACE_RULES = {
    noFaceWarningMs: 3000,       // 3 seconds no face → warning
    noFaceViolationMs: 10000,    // 10 seconds no face → violation
    multipleFacesImmediate: true, // Multiple faces → immediate warning
    minVisibilityPercent: 90,    // Face must be visible 90% of session
};

export const GAZE_RULES = {
    lookAwayAngle: 35,           // Yaw > 35° considered "looking away"
    lookAwayDurationMs: 5000,    // 5 seconds before warning
    eyeClosedDurationMs: 5000,   // Eyes closed > 5s → violation
    talkingDurationMs: 10000,    // Talking > 10s → possible cheating
};

export const PROXIMITY_RULES = {
    phoneNearFaceDistancePx: 150,  // Phone within 150px of face → warning
    phoneNearEarProbability: 0.95, // Phone near ear = 95% cheating
};

// ── Confidence ramp-up validator ─────────────────────────────────────────────
/**
 * Validates that a detection has passed through the confidence ramp-up stages.
 * Returns the current stage: 'ignore', 'wait', 'confirmed'
 */
export function evaluateConfidenceRamp(confidenceHistory) {
    if (!confidenceHistory || confidenceHistory.length === 0) return 'ignore';

    const latest = confidenceHistory[confidenceHistory.length - 1];

    if (latest < 0.40) return 'ignore';
    if (latest < 0.45) return 'wait';
    return 'confirmed';
}

// ── Static vs Dynamic object classifier ──────────────────────────────────────
/**
 * Determines if a tracked object is static (poster/wallpaper) or dynamic (real).
 * @param {Array} bboxHistory - Array of {x, y, width, height, timestamp}
 * @returns {'static' | 'dynamic' | 'unknown'}
 */
export function classifyObjectMovement(bboxHistory) {
    if (!bboxHistory || bboxHistory.length < 2) return 'dynamic';

    const first = bboxHistory[0];
    const last = bboxHistory[bboxHistory.length - 1];
    const timeDiffMs = last.timestamp - first.timestamp;

    if (timeDiffMs < 3000) return 'dynamic'; // Allow handheld phones to trigger immediately

    // Calculate total displacement
    const dx = Math.abs(last.x - first.x);
    const dy = Math.abs(last.y - first.y);
    const displacement = Math.sqrt(dx * dx + dy * dy);

    // Only flag as static if completely motionless for 3+ full seconds
    if (displacement < 5 && timeDiffMs >= 3000) return 'static';

    return 'dynamic';
}

// ── Phone detection state machine ────────────────────────────────────────────
/**
 * Evaluates a tracked phone object and returns the appropriate action.
 * @param {Object} track - Tracked object state
 * @returns {Object} { action, severity, reason }
 */
export function evaluatePhoneTrack(track) {
    if (!track) return { action: 'ignore', severity: null, reason: 'No track' };

    const {
        consecutiveFrames = 0,
        durationMs = 0,
        maxConfidence = 0,
        confidenceHistory = [],
        bboxHistory = [],
    } = track;

    // Rule: Ignore if below confidence threshold
    if (maxConfidence < PHONE_RULES.minConfidence) {
        return { action: 'ignore', severity: null, reason: `Low confidence: ${maxConfidence.toFixed(2)}` };
    }

    // Rule: Check confidence ramp-up
    const rampStatus = evaluateConfidenceRamp(confidenceHistory);
    if (rampStatus === 'ignore') {
        return { action: 'ignore', severity: null, reason: 'Confidence ramp: ignore' };
    }

    // Rule: Check for static object (poster/wallpaper)
    const movementClass = classifyObjectMovement(bboxHistory);
    if (movementClass === 'static') {
        return { action: 'ignore', severity: null, reason: 'Static object detected (poster/wallpaper)' };
    }

    // Escalation rules based on duration
    if (durationMs >= PHONE_RULES.autoSubmitAfterMs) {
        return { action: 'auto_submit', severity: 'critical', reason: `Phone detected for ${(durationMs / 1000).toFixed(1)}s — auto-submit threshold exceeded` };
    }

    if (durationMs >= PHONE_RULES.majorWarningAfterMs) {
        return { action: 'major_warning', severity: 'high', reason: `Phone detected for ${(durationMs / 1000).toFixed(1)}s` };
    }

    // Instant warning on 1st detection frame
    return { action: 'warning', severity: 'high', reason: `Mobile phone detected in frame` };
}

// ── Face presence evaluator ──────────────────────────────────────────────────
/**
 * Evaluates face presence signals and returns action.
 * @param {Object} faceState
 * @returns {Object} { action, severity, eventType, reason }
 */
export function evaluateFacePresence(faceState) {
    const { faceCount = 1, noFaceDurationMs = 0, multipleFacesDurationMs = 0 } = faceState;

    if (faceCount === 0) {
        if (noFaceDurationMs >= FACE_RULES.noFaceViolationMs) {
            return {
                action: 'violation',
                severity: 'high',
                eventType: 'no_face_detected',
                reason: `No face for ${(noFaceDurationMs / 1000).toFixed(1)}s — violation threshold`,
            };
        }
        if (noFaceDurationMs >= FACE_RULES.noFaceWarningMs) {
            return {
                action: 'warning',
                severity: 'medium',
                eventType: 'no_face_detected',
                reason: `No face for ${(noFaceDurationMs / 1000).toFixed(1)}s`,
            };
        }
        return { action: 'wait', severity: null, eventType: null, reason: 'No face — monitoring' };
    }

    if (faceCount > 1) {
        return {
            action: 'warning',
            severity: 'high',
            eventType: 'multiple_faces_detected',
            reason: `${faceCount} faces detected`,
        };
    }

    return { action: 'ok', severity: null, eventType: null, reason: 'Single face detected' };
}

// ── Gaze evaluator ───────────────────────────────────────────────────────────
/**
 * Evaluates gaze and head pose signals.
 * @param {Object} gazeState
 * @returns {Object} { action, severity, eventType, reason }
 */
export function evaluateGaze(gazeState) {
    const {
        yawAngle = 0,
        lookAwayDurationMs = 0,
        eyesClosed = false,
        eyesClosedDurationMs = 0,
        isTalking = false,
        talkingDurationMs = 0,
    } = gazeState;

    // Eyes closed check
    if (eyesClosed && eyesClosedDurationMs >= GAZE_RULES.eyeClosedDurationMs) {
        return {
            action: 'violation',
            severity: 'high',
            eventType: 'eyes_closed',
            reason: `Eyes closed for ${(eyesClosedDurationMs / 1000).toFixed(1)}s`,
        };
    }

    // Look away check
    if (Math.abs(yawAngle) > GAZE_RULES.lookAwayAngle && lookAwayDurationMs >= GAZE_RULES.lookAwayDurationMs) {
        return {
            action: 'warning',
            severity: 'medium',
            eventType: 'looking_away',
            reason: `Looking away (${yawAngle.toFixed(0)}°) for ${(lookAwayDurationMs / 1000).toFixed(1)}s`,
        };
    }

    // Continuous talking
    if (isTalking && talkingDurationMs >= GAZE_RULES.talkingDurationMs) {
        return {
            action: 'warning',
            severity: 'medium',
            eventType: 'continuous_talking',
            reason: `Talking continuously for ${(talkingDurationMs / 1000).toFixed(1)}s`,
        };
    }

    return { action: 'ok', severity: null, eventType: null, reason: 'Gaze normal' };
}

// ── Phone-face proximity evaluator ───────────────────────────────────────────
/**
 * Checks if a phone bounding box is near the face bounding box.
 * @param {Object} phoneBbox - {x, y, width, height}
 * @param {Object} faceBbox - {x, y, width, height}
 * @returns {Object} { isNearFace, isNearEar, distance }
 */
export function evaluatePhoneProximity(phoneBbox, faceBbox) {
    if (!phoneBbox || !faceBbox) {
        return { isNearFace: false, isNearEar: false, distance: Infinity };
    }

    const phoneCenterX = phoneBbox.x + phoneBbox.width / 2;
    const phoneCenterY = phoneBbox.y + phoneBbox.height / 2;
    const faceCenterX = faceBbox.x + faceBbox.width / 2;
    const faceCenterY = faceBbox.y + faceBbox.height / 2;

    const dx = phoneCenterX - faceCenterX;
    const dy = phoneCenterY - faceCenterY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    const isNearFace = distance < PROXIMITY_RULES.phoneNearFaceDistancePx;

    // Phone near ear: phone is to the side of the face and roughly at ear height
    const isNearEar = isNearFace &&
        Math.abs(dx) > faceBbox.width * 0.3 && // Significantly to one side
        Math.abs(dy) < faceBbox.height * 0.4;   // Roughly at ear height

    return { isNearFace, isNearEar, distance };
}

// ── Proctoring score calculator ──────────────────────────────────────────────
/**
 * Computes the current proctoring score from event history.
 * @param {Array} events - Array of confirmed event types
 * @param {number} startScore - Starting score (default 100)
 * @returns {number} Current score (0–100)
 */
export function computeProctoringScore(events, startScore = 100) {
    let score = startScore;
    for (const event of events) {
        const penalty = SCORE_PENALTIES[event.eventType] || SCORE_PENALTIES[event] || 5;
        score = Math.max(0, score - penalty);
    }
    return score;
}

// ── Status from score ────────────────────────────────────────────────────────
export function getStatusFromScore(score) {
    if (score >= 85) return 'clean';
    if (score >= 70) return 'low_risk';
    if (score >= 40) return 'suspicious';
    return 'critical';
}

// ── Create initial behavior state ────────────────────────────────────────────
export function createBehaviorState() {
    return {
        score: 100,
        confirmedEvents: [],
        activeTracks: {},           // trackId → track state
        noFaceStartTime: null,
        multipleFacesStartTime: null,
        lookAwayStartTime: null,
        eyesClosedStartTime: null,
        talkingStartTime: null,
        lastFaceCount: 1,
        totalFramesProcessed: 0,
        framesWithFace: 0,
        environmentObjects: new Set(),
        warningLevel: 'none',       // none → info → warning → major → critical → auto_submit
    };
}

// ── Main behavior analysis function ──────────────────────────────────────────
/**
 * Processes a batch of signals from all detectors and returns actions to take.
 * This is the core decision function — called every frame sample (200ms).
 *
 * @param {Object} state - Current BehaviorState (mutable)
 * @param {Object} signals - All detector signals for this frame
 * @returns {Array} Array of actions to take: [{action, eventType, severity, reason, data}]
 */
export function analyzeFrame(state, signals) {
    const actions = [];
    const now = Date.now();

    state.totalFramesProcessed += 1;

    // ── Face presence analysis ───────────────────────────────────────────────
    const faceCount = signals.faceCount ?? 1;

    if (faceCount >= 1) {
        state.framesWithFace += 1;
    }

    if (faceCount === 0) {
        if (!state.noFaceStartTime) {
            state.noFaceStartTime = now;
        }
        const noFaceDuration = now - state.noFaceStartTime;
        const faceResult = evaluateFacePresence({
            faceCount: 0,
            noFaceDurationMs: noFaceDuration,
        });
        if (faceResult.action !== 'wait' && faceResult.action !== 'ok') {
            actions.push({
                action: faceResult.action,
                eventType: faceResult.eventType,
                severity: faceResult.severity,
                reason: faceResult.reason,
                data: { durationMs: noFaceDuration },
            });
        }
    } else {
        state.noFaceStartTime = null;
    }

    if (faceCount > 1) {
        if (!state.multipleFacesStartTime) {
            state.multipleFacesStartTime = now;
        }
        actions.push({
            action: 'warning',
            eventType: 'multiple_faces_detected',
            severity: 'high',
            reason: `${faceCount} faces detected`,
            data: { faceCount },
        });
    } else {
        state.multipleFacesStartTime = null;
    }

    state.lastFaceCount = faceCount;

    // ── Gaze / head pose analysis ────────────────────────────────────────────
    if (signals.yawAngle !== undefined) {
        const isLookingAway = Math.abs(signals.yawAngle) > GAZE_RULES.lookAwayAngle;

        if (isLookingAway) {
            if (!state.lookAwayStartTime) state.lookAwayStartTime = now;
            const lookAwayDuration = now - state.lookAwayStartTime;
            const gazeResult = evaluateGaze({
                yawAngle: signals.yawAngle,
                lookAwayDurationMs: lookAwayDuration,
            });
            if (gazeResult.action !== 'ok') {
                actions.push({
                    action: gazeResult.action,
                    eventType: gazeResult.eventType,
                    severity: gazeResult.severity,
                    reason: gazeResult.reason,
                    data: { yawAngle: signals.yawAngle, durationMs: lookAwayDuration },
                });
            }
        } else {
            state.lookAwayStartTime = null;
        }
    }

    // ── Eye closure analysis ─────────────────────────────────────────────────
    if (signals.eyesClosed) {
        if (!state.eyesClosedStartTime) state.eyesClosedStartTime = now;
        const closedDuration = now - state.eyesClosedStartTime;
        const gazeResult = evaluateGaze({
            eyesClosed: true,
            eyesClosedDurationMs: closedDuration,
        });
        if (gazeResult.action !== 'ok') {
            actions.push({
                action: gazeResult.action,
                eventType: gazeResult.eventType,
                severity: gazeResult.severity,
                reason: gazeResult.reason,
                data: { durationMs: closedDuration },
            });
        }
    } else {
        state.eyesClosedStartTime = null;
    }

    // ── Object tracking analysis ─────────────────────────────────────────────
    if (signals.trackedObjects) {
        for (const track of signals.trackedObjects) {
            if (track.class === 'cell phone' || track.class === 'remote') {
                const phoneResult = evaluatePhoneTrack(track);
                if (phoneResult.action !== 'ignore' && phoneResult.action !== 'wait') {
                    actions.push({
                        action: phoneResult.action,
                        eventType: 'mobile_phone_detected',
                        severity: phoneResult.severity,
                        reason: phoneResult.reason,
                        data: {
                            trackId: track.trackId,
                            confidence: track.maxConfidence,
                            durationMs: track.durationMs,
                            bbox: track.currentBbox,
                        },
                    });
                }

                // Phone-face proximity check
                if (signals.faceBbox && track.currentBbox) {
                    const proximity = evaluatePhoneProximity(track.currentBbox, signals.faceBbox);
                    if (proximity.isNearEar) {
                        actions.push({
                            action: 'violation',
                            eventType: 'phone_near_ear',
                            severity: 'critical',
                            reason: `Phone near ear detected (distance: ${proximity.distance.toFixed(0)}px)`,
                            data: { distance: proximity.distance, trackId: track.trackId },
                        });
                    } else if (proximity.isNearFace) {
                        actions.push({
                            action: 'warning',
                            eventType: 'phone_near_face',
                            severity: 'high',
                            reason: `Phone near face (distance: ${proximity.distance.toFixed(0)}px)`,
                            data: { distance: proximity.distance, trackId: track.trackId },
                        });
                    }
                }
            }

            // Other suspicious objects
            if (['laptop', 'book', 'tv'].includes(track.class) && track.durationMs > 2000) {
                const isNew = !state.environmentObjects.has(`${track.class}_${track.trackId}`);
                if (isNew && track.consecutiveFrames >= 3) {
                    state.environmentObjects.add(`${track.class}_${track.trackId}`);
                    actions.push({
                        action: 'warning',
                        eventType: 'new_object_appeared',
                        severity: 'medium',
                        reason: `New ${track.class} appeared after environment check`,
                        data: { class: track.class, trackId: track.trackId },
                    });
                }
            }
        }
    }

    // ── Hand position analysis ───────────────────────────────────────────────
    if (signals.handPositions) {
        for (const hand of signals.handPositions) {
            if (hand.position === 'near_ear' && signals.hasPhone) {
                actions.push({
                    action: 'violation',
                    eventType: 'phone_near_ear',
                    severity: 'critical',
                    reason: 'Hand near ear with phone detected — high cheating probability',
                    data: { handPosition: hand },
                });
            }
            if (hand.position === 'near_lap' && signals.hasPhone) {
                actions.push({
                    action: 'warning',
                    eventType: 'hand_near_lap',
                    severity: 'medium',
                    reason: 'Hand near lap with phone detected',
                    data: { handPosition: hand },
                });
            }
        }
    }

    // ── Audio analysis ───────────────────────────────────────────────────────
    if (signals.audioSignals) {
        if (signals.audioSignals.multipleVoices) {
            actions.push({
                action: 'warning',
                eventType: 'multiple_voices',
                severity: 'high',
                reason: 'Multiple voices detected in audio stream',
                data: { audioLevel: signals.audioSignals.level },
            });
        }
    }

    // ── Update score for confirmed actions ───────────────────────────────────
    for (const act of actions) {
        if (act.action !== 'wait' && act.action !== 'ok') {
            const penalty = SCORE_PENALTIES[act.eventType] || 5;
            state.score = Math.max(0, state.score - penalty);
            act.proctoringScore = state.score;
        }
    }

    return actions;
}
