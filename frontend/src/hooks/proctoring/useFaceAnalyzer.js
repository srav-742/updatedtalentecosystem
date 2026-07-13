import { useEffect, useRef, useState, useCallback } from "react";

/**
 * useFaceAnalyzer
 * ──────────────────────────────────────────────────────────────────────────────
 * MediaPipe FaceMesh analyzer hook.
 * Computes face counts, head pose yaw angles, Eye Aspect Ratio (EAR) for closure,
 * and 3D landmark positions.
 * ──────────────────────────────────────────────────────────────────────────────
 */

const MEDIAPIPE_CDN = "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619";

function loadScript(src) {
    return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) return resolve();
        const script = document.createElement("script");
        script.src = src;
        script.async = true;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

function euclideanDist(p1, p2) {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy);
}

function calculateEAR(eyeLandmarks) {
    // 6 point EAR calculation
    const v1 = euclideanDist(eyeLandmarks[1], eyeLandmarks[5]);
    const v2 = euclideanDist(eyeLandmarks[2], eyeLandmarks[4]);
    const h = euclideanDist(eyeLandmarks[0], eyeLandmarks[3]);
    return (v1 + v2) / (2.0 * h);
}

export function useFaceAnalyzer({ isActive = false, videoElement = null }) {
    const [ready, setReady] = useState(false);
    const [faceState, setFaceState] = useState({
        faceCount: 0,
        landmarks: null,
        yawAngle: 0,
        eyesClosed: false,
        faceBbox: null,
    });

    const faceMeshRef = useRef(null);

    useEffect(() => {
        if (!isActive) return;

        let cancelled = false;

        const initFaceMesh = async () => {
            try {
                await loadScript(`${MEDIAPIPE_CDN}/face_mesh.js`);
                if (cancelled) return;

                const FaceMesh = window.FaceMesh;
                if (!FaceMesh) return;

                const mesh = new FaceMesh({
                    locateFile: (file) => `${MEDIAPIPE_CDN}/${file}`,
                });

                mesh.setOptions({
                    maxNumFaces: 3,
                    refineLandmarks: true,
                    minDetectionConfidence: 0.75,
                    minTrackingConfidence: 0.75,
                });

                mesh.onResults((results) => {
                    if (cancelled) return;

                    const faces = results.multiFaceLandmarks || [];
                    const faceCount = faces.length;

                    if (faceCount === 0) {
                        setFaceState({
                            faceCount: 0,
                            landmarks: null,
                            yawAngle: 0,
                            eyesClosed: false,
                            faceBbox: null,
                        });
                        return;
                    }

                    const primaryFace = faces[0];

                    // 1. Calculate Bounding Box
                    let minX = 1, maxX = 0, minY = 1, maxY = 0;
                    primaryFace.forEach(pt => {
                        if (pt.x < minX) minX = pt.x;
                        if (pt.x > maxX) maxX = pt.x;
                        if (pt.y < minY) minY = pt.y;
                        if (pt.y > maxY) maxY = pt.y;
                    });
                    const faceBbox = {
                        x: minX * 640,
                        y: minY * 480,
                        width: (maxX - minX) * 640,
                        height: (maxY - minY) * 480
                    };

                    // 2. Yaw Angle Estimation (nose tip 1 vs cheeks 234, 454)
                    const nose = primaryFace[1];
                    const leftCheek = primaryFace[234];
                    const rightCheek = primaryFace[454];

                    let yawAngle = 0;
                    if (nose && leftCheek && rightCheek) {
                        const dLeft = euclideanDist(nose, leftCheek);
                        const dRight = euclideanDist(nose, rightCheek);
                        const ratio = dRight > 0.001 ? dLeft / dRight : 1;
                        yawAngle = (ratio - 1.0) * 45; // Approximate yaw angle in degrees
                    }

                    // 3. Eyes Closed (EAR calculation: Left Eye 33, 160, 158, 133, 153, 144)
                    let eyesClosed = false;
                    if (primaryFace.length > 160) {
                        const leftEye = [
                            primaryFace[33], primaryFace[160], primaryFace[158],
                            primaryFace[133], primaryFace[153], primaryFace[144]
                        ];
                        const ear = calculateEAR(leftEye);
                        eyesClosed = ear < 0.18; // EAR threshold for closed eyes
                    }

                    setFaceState({
                        faceCount,
                        landmarks: primaryFace,
                        yawAngle,
                        eyesClosed,
                        faceBbox,
                    });
                });

                await mesh.initialize();
                if (!cancelled) {
                    faceMeshRef.current = mesh;
                    setReady(true);
                }
            } catch (err) {
                console.error("[Face Analyzer] FaceMesh init error:", err);
            }
        };

        initFaceMesh();

        return () => {
            cancelled = true;
        };
    }, [isActive]);

    const processFrame = useCallback(async () => {
        if (!ready || !faceMeshRef.current || !videoElement || videoElement.readyState < 2) return;
        try {
            await faceMeshRef.current.send({ image: videoElement });
        } catch (e) {
            // Frame process error
        }
    }, [ready, videoElement]);

    return {
        ready,
        faceState,
        processFrame,
    };
}
