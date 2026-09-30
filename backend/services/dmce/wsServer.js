/**
 * DMCE WebSocket Gateway & Telemetry Ingestion Server
 * 
 * Ingests 500ms batched Monaco editor telemetry frames from candidate clients:
 * - Event ordering preserved via sequence IDs (seqId)
 * - Associates telemetry with document hashes
 * - Broadcasts real-time mutation triggers directly to active candidate browser sessions
 * - Handles disconnect/reconnect and malformed payloads safely without disrupting coding
 */

const WebSocket = require('ws');
const { ingestTelemetryBatch, getSession } = require('./sessionManager');

let wssInstance = null;
const clientConnections = new Map(); // sessionId -> WebSocket

/**
 * Initializes and binds WebSocket server to HTTP server instance.
 * 
 * @param {import('http').Server} httpServer
 */
function initWebSocketServer(httpServer) {
    if (wssInstance) {
        return wssInstance;
    }

    wssInstance = new WebSocket.Server({ noServer: true });

    httpServer.on('upgrade', (request, socket, head) => {
        const url = new URL(request.url, `http://${request.headers.host}`);
        if (url.pathname === '/ws/telemetry' || url.pathname === '/ws/dmce') {
            wssInstance.handleUpgrade(request, socket, head, (ws) => {
                wssInstance.emit('connection', ws, request);
            });
        }
    });

    wssInstance.on('connection', (ws, request) => {
        let boundSessionId = null;
        console.log('[DMCE-WS] [TELEMETRY_CONNECTED] Client connected to DMCE telemetry stream');

        ws.on('message', (messageBuffer) => {
            try {
                const message = JSON.parse(messageBuffer.toString('utf8'));
                const { type, sessionId, seqId, events, documentHash } = message;

                if (type === 'INIT_SESSION' || type === 'JOIN') {
                    boundSessionId = sessionId;
                    clientConnections.set(sessionId, ws);
                    ws.send(JSON.stringify({
                        type: 'SESSION_ACK',
                        sessionId,
                        serverTime: Date.now()
                    }));
                    return;
                }

                if (type === 'TELEMETRY_BATCH' || Array.isArray(events)) {
                    const sid = sessionId || boundSessionId;
                    if (sid) {
                        boundSessionId = sid;
                        clientConnections.set(sid, ws);
                        ingestTelemetryBatch(sid, {
                            seqId,
                            events: events || [],
                            documentHash
                        });

                        ws.send(JSON.stringify({
                            type: 'BATCH_ACK',
                            seqId,
                            timestamp: Date.now()
                        }));
                    }
                    return;
                }

                if (type === 'PING') {
                    ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
                }
            } catch (err) {
                // Ignore malformed payloads safely - NEVER break candidate coding
                console.warn('[DMCE-WS] Malformed telemetry frame received:', err.message);
            }
        });

        ws.on('close', () => {
            if (boundSessionId) {
                clientConnections.delete(boundSessionId);
            }
            console.log('[DMCE-WS] [TELEMETRY_DISCONNECTED] Client disconnected from telemetry stream');
        });

        ws.on('error', (err) => {
            console.warn('[DMCE-WS] Telemetry socket warning:', err.message);
        });
    });

    console.log('[DMCE-WS] WebSocket Telemetry Gateway attached to HTTP server on /ws/telemetry');
    return wssInstance;
}

/**
 * Pushes live mutation notification to the connected candidate UI.
 */
function broadcastMutationToCandidate(sessionId, mutationPayload) {
    if (!sessionId || !clientConnections.has(sessionId)) {
        return false;
    }
    const ws = clientConnections.get(sessionId);
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'MUTATION_TRIGGERED',
            payload: mutationPayload
        }));
        return true;
    }
    return false;
}

module.exports = {
    initWebSocketServer,
    broadcastMutationToCandidate,
    getConnectedClientCount: () => clientConnections.size,
    _clientConnections: clientConnections
};
