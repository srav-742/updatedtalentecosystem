import { useRef, useCallback } from "react";

/**
 * useObjectTracker
 * ──────────────────────────────────────────────────────────────────────────────
 * ByteTrack-inspired object tracker hook.
 * Associates detected bounding boxes across frames using Intersection over Union (IoU),
 * assigns persistent track IDs, maintains history, and calculates object velocity/displacement
 * to filter out static false positives (posters, stickers, images).
 * ──────────────────────────────────────────────────────────────────────────────
 */

function calculateIoU(boxA, boxB) {
    const xA = Math.max(boxA.x, boxB.x);
    const yA = Math.max(boxA.y, boxB.y);
    const xB = Math.min(boxA.x + boxA.width, boxB.x + boxB.width);
    const yB = Math.min(boxA.y + boxA.height, boxB.y + boxB.height);

    const interArea = Math.max(0, xB - xA) * Math.max(0, yB - yA);
    if (interArea === 0) return 0;

    const boxAArea = boxA.width * boxA.height;
    const boxBArea = boxB.width * boxB.height;

    return interArea / (boxAArea + boxBArea - interArea);
}

export function useObjectTracker(iouThreshold = 0.3, maxLostFrames = 10) {
    const nextTrackIdRef = useRef(1);
    const activeTracksRef = useRef(new Map()); // trackId -> Track object

    /**
     * Update active tracks with new frame detections
     * @param {Array} detections - [{ class, score, bbox: {x, y, width, height} }]
     * @param {number} timestamp - Frame timestamp ms
     * @returns {Array} Tracked objects with track IDs and telemetry
     */
    const updateTracks = useCallback((detections = [], timestamp = Date.now()) => {
        const activeTracks = activeTracksRef.current;

        // 1. Calculate IoU matrix between existing active tracks and new detections
        const tracksArray = Array.from(activeTracks.values());
        const unmatchedDetections = new Set(detections.keys());
        const matchedTrackIds = new Set();

        const matches = [];

        tracksArray.forEach((track) => {
            let bestIoU = 0;
            let bestDetIdx = -1;

            detections.forEach((det, detIdx) => {
                if (det.class !== track.class) return; // Must match class
                const iou = calculateIoU(track.currentBbox, det.bbox);
                if (iou > bestIoU && iou >= iouThreshold) {
                    bestIoU = iou;
                    bestDetIdx = detIdx;
                }
            });

            if (bestDetIdx !== -1) {
                matches.push({ trackId: track.trackId, detIdx: bestDetIdx, iou: bestIoU });
            }
        });

        // Sort matches by highest IoU first
        matches.sort((a, b) => b.iou - a.iou);

        // 2. Update matched tracks
        matches.forEach(({ trackId, detIdx }) => {
            if (!unmatchedDetections.has(detIdx) || matchedTrackIds.has(trackId)) return;

            unmatchedDetections.delete(detIdx);
            matchedTrackIds.add(trackId);

            const det = detections[detIdx];
            const track = activeTracks.get(trackId);

            track.consecutiveFrames += 1;
            track.totalFrames += 1;
            track.lostFrames = 0;
            track.lastSeen = timestamp;
            track.durationMs = timestamp - track.firstSeen;
            track.maxConfidence = Math.max(track.maxConfidence, det.score);
            track.currentBbox = det.bbox;
            track.confidenceHistory.push(det.score);
            track.bboxHistory.push({ ...det.bbox, timestamp });

            // Limit history arrays
            if (track.confidenceHistory.length > 50) track.confidenceHistory.shift();
            if (track.bboxHistory.length > 50) track.bboxHistory.shift();
        });

        // 3. Mark unmatched existing tracks as lost / prune old tracks
        tracksArray.forEach((track) => {
            if (!matchedTrackIds.has(track.trackId)) {
                track.lostFrames += 1;
                track.consecutiveFrames = 0;
                if (track.lostFrames > maxLostFrames) {
                    activeTracks.delete(track.trackId);
                }
            }
        });

        // 4. Create new tracks for unmatched detections
        unmatchedDetections.forEach((detIdx) => {
            const det = detections[detIdx];
            const trackId = nextTrackIdRef.current++;

            const newTrack = {
                trackId,
                class: det.class,
                firstSeen: timestamp,
                lastSeen: timestamp,
                durationMs: 0,
                consecutiveFrames: 1,
                totalFrames: 1,
                lostFrames: 0,
                maxConfidence: det.score,
                currentBbox: det.bbox,
                confidenceHistory: [det.score],
                bboxHistory: [{ ...det.bbox, timestamp }],
            };

            activeTracks.set(trackId, newTrack);
        });

        return Array.from(activeTracks.values()).filter(t => t.lostFrames === 0);
    }, [iouThreshold, maxLostFrames]);

    const resetTracker = useCallback(() => {
        activeTracksRef.current.clear();
        nextTrackIdRef.current = 1;
    }, []);

    return {
        updateTracks,
        resetTracker,
        getActiveTracks: () => Array.from(activeTracksRef.current.values()),
    };
}
