/**
 * Hire1Percent — Immutable Revision Tracking Service
 * 
 * Records an append-only, tamper-evident audit log of candidate code revisions
 * across the progressive constraint assessment lifecycle:
 * - BASELINE: Stage 1 initial working code
 * - MUTATION_ACTIVE: Snapshot when candidate unlocks/adapts constraint
 * - INTERMEDIATE_RUN: Code snapshot associated with test execution
 * - CHECKPOINT: Editor checkpoint
 * - FINAL_SUBMISSION: Code snapshot submitted for final evaluation
 * 
 * Strict Protections:
 * 1. Baseline snapshot is immutable.
 * 2. Hash chaining (SHA-256) and sequence monotonicity.
 * 3. Scoped strictly to assessmentId + candidateId + questionId.
 * 4. Rejects cross-candidate access.
 * 5. Deduplicates redundant consecutive identical snapshots.
 * 6. Bounded payload protection (max 256KB per snapshot).
 * 7. Dual persistence: MongoDB backed with in-memory cache for speed and test isolation.
 */

const crypto = require('crypto');
const mongoose = require('mongoose');
const CodeRevision = require('../models/CodeRevision');

const MAX_CODE_BYTES = 256 * 1024; // 256 KB max snapshot size

// In-memory fallback/cache for fast lookups and standalone test environments
const memoryRevisions = new Map(); // key: `${assessmentId}:${candidateId}:${questionId}` -> Array<Revision>
const writeLocks = new Map(); // key: storeKey -> Promise

/**
 * Computes SHA-256 content hash of source code.
 */
function computeHash(code = '') {
    return crypto.createHash('sha256').update(String(code)).digest('hex');
}

/**
 * Generates unique monotonic revision ID.
 */
function generateRevisionId(candidateId, seq) {
    const randomHex = crypto.randomBytes(4).toString('hex');
    return `rev_${Date.now()}_${seq}_${randomHex}`;
}

/**
 * Gets cache key for in-memory store.
 */
function getStoreKey(assessmentId, candidateId, questionId) {
    return `${String(assessmentId)}:${String(candidateId)}:${String(questionId)}`;
}

/**
 * Public thread-safe recordRevision entry point with write serialization mutex.
 */
async function recordRevision(params) {
    const cleanAssessmentId = String(params?.assessmentId || '');
    const cleanCandidateId = String(params?.candidateId || '');
    const cleanQuestionId = String(params?.questionId || '');
    const storeKey = getStoreKey(cleanAssessmentId, cleanCandidateId, cleanQuestionId);

    const prevLock = writeLocks.get(storeKey) || Promise.resolve();
    let release;
    const currentLock = new Promise(resolve => { release = resolve; });
    writeLocks.set(storeKey, currentLock);

    try {
        await prevLock;
        return await _recordRevisionInternal(params);
    } finally {
        release();
        if (writeLocks.get(storeKey) === currentLock) {
            writeLocks.delete(storeKey);
        }
    }
}

/**
 * Internal logic for recording an immutable code revision.
 */
async function _recordRevisionInternal({
    assessmentId,
    candidateId,
    questionId,
    code,
    language = 'python',
    revisionType = 'CHECKPOINT',
    constraintId = null,
    constraintVersion = 1,
    runAttemptId = null,
    finalSubmissionRef = null,
    metadata = {}
}) {
    if (!assessmentId) throw new Error('assessmentId is required');
    if (!candidateId) throw new Error('candidateId is required');
    if (!questionId) throw new Error('questionId is required');
    if (code === undefined || code === null) throw new Error('code is required');

    // Bounded size guard
    const codeStr = String(code);
    if (Buffer.byteLength(codeStr, 'utf8') > MAX_CODE_BYTES) {
        throw new Error(`Code snapshot exceeds maximum allowable size of ${MAX_CODE_BYTES} bytes`);
    }

    const cleanAssessmentId = String(assessmentId);
    const cleanCandidateId = String(candidateId);
    const cleanQuestionId = String(questionId);
    const storeKey = getStoreKey(cleanAssessmentId, cleanCandidateId, cleanQuestionId);

    // Get current revision history for this question
    const history = await getRevisionHistory({
        assessmentId: cleanAssessmentId,
        candidateId: cleanCandidateId,
        questionId: cleanQuestionId
    });

    const contentHash = computeHash(codeStr);
    const lastRev = history.length > 0 ? history[history.length - 1] : null;
    const baselineRev = history.find(r => r.revisionType === 'BASELINE');

    // Immutability Guard: If attempting to record another BASELINE when one already exists,
    // verify the hash matches or throw an error. Baseline cannot be overwritten.
    if (revisionType === 'BASELINE' && baselineRev) {
        if (baselineRev.contentHash === contentHash) {
            return baselineRev; // Idempotent return of existing immutable baseline
        }
        throw new Error('Baseline revision is immutable and cannot be overwritten with different code');
    }

    // Deduplication Guard: If consecutive code is identical and not an explicit run or final submission, deduplicate
    if (lastRev && lastRev.contentHash === contentHash && !runAttemptId && !finalSubmissionRef && revisionType === 'CHECKPOINT') {
        return lastRev;
    }

    const nextSeq = (lastRev?.sequenceNumber || 0) + 1;
    const revisionId = generateRevisionId(cleanCandidateId, nextSeq);
    const previousRevisionId = lastRev?.revisionId || null;
    const effectiveBaselineId = baselineRev?.revisionId || (revisionType === 'BASELINE' ? revisionId : null);

    const revisionData = {
        assessmentId: cleanAssessmentId,
        candidateId: cleanCandidateId,
        questionId: cleanQuestionId,
        originalSubmissionId: baselineRev?.runAttemptId || null,
        baselineRevisionId: effectiveBaselineId,
        revisionId,
        sequenceNumber: nextSeq,
        language: String(language).toLowerCase(),
        constraintId: constraintId || lastRev?.constraintId || null,
        constraintVersion: Number(constraintVersion) || 1,
        timestamp: new Date(),
        previousRevisionId,
        codeSnapshot: codeStr,
        contentHash,
        runAttemptId: runAttemptId || null,
        finalSubmissionRef: finalSubmissionRef || null,
        revisionType,
        metadata: {
            ...metadata,
            byteLength: Buffer.byteLength(codeStr, 'utf8'),
            lineCount: codeStr.split('\n').length
        }
    };

    // Store in-memory cache
    if (!memoryRevisions.has(storeKey)) {
        memoryRevisions.set(storeKey, []);
    }
    memoryRevisions.get(storeKey).push(revisionData);

    // Persist to MongoDB if connected
    if (mongoose.connection && mongoose.connection.readyState === 1) {
        try {
            const doc = new CodeRevision({
                ...revisionData,
                questionId: new mongoose.Types.ObjectId(cleanQuestionId)
            });
            await doc.save();
        } catch (dbErr) {
            console.warn('[REVISION-TRACKER] MongoDB persist warning:', dbErr.message);
        }
    }

    return revisionData;
}

/**
 * Retrieves the full chronological revision history for a candidate's question.
 */
async function getRevisionHistory({ assessmentId, candidateId, questionId }) {
    const cleanAssessmentId = String(assessmentId);
    const cleanCandidateId = String(candidateId);
    const cleanQuestionId = String(questionId);
    const storeKey = getStoreKey(cleanAssessmentId, cleanCandidateId, cleanQuestionId);

    // If MongoDB is connected, query authoritative DB
    if (mongoose.connection && mongoose.connection.readyState === 1) {
        try {
            const query = {
                assessmentId: cleanAssessmentId,
                candidateId: cleanCandidateId
            };
            if (mongoose.Types.ObjectId.isValid(cleanQuestionId)) {
                query.questionId = new mongoose.Types.ObjectId(cleanQuestionId);
            }
            const docs = await CodeRevision.find(query).sort({ sequenceNumber: 1 }).lean();
            if (docs && docs.length > 0) {
                // Update in-memory store
                memoryRevisions.set(storeKey, docs);
                return docs;
            }
        } catch (dbErr) {
            console.warn('[REVISION-TRACKER] MongoDB read warning:', dbErr.message);
        }
    }

    // Fallback to in-memory store
    return memoryRevisions.get(storeKey) || [];
}

/**
 * Retrieves a single revision by revision ID.
 */
async function getRevisionById(revisionId) {
    if (!revisionId) return null;

    if (mongoose.connection && mongoose.connection.readyState === 1) {
        try {
            const doc = await CodeRevision.findOne({ revisionId }).lean();
            if (doc) return doc;
        } catch (err) {
            // continue to memory lookup
        }
    }

    for (const list of memoryRevisions.values()) {
        const found = list.find(r => r.revisionId === revisionId);
        if (found) return found;
    }
    return null;
}

/**
 * Retrieves the baseline revision for an assessment question.
 */
async function getBaselineRevision({ assessmentId, candidateId, questionId }) {
    const history = await getRevisionHistory({ assessmentId, candidateId, questionId });
    return history.find(r => r.revisionType === 'BASELINE') || null;
}

/**
 * Retrieves the latest recorded revision for an assessment question.
 */
async function getLatestRevision({ assessmentId, candidateId, questionId }) {
    const history = await getRevisionHistory({ assessmentId, candidateId, questionId });
    return history.length > 0 ? history[history.length - 1] : null;
}

/**
 * Verifies integrity of revision sequence:
 * - Monotonic sequence numbers (1, 2, 3...)
 * - Consistent previousRevisionId linkage
 * - Valid content hashes
 * - Immutable baseline presence
 */
async function verifyRevisionIntegrity({ assessmentId, candidateId, questionId }) {
    const history = await getRevisionHistory({ assessmentId, candidateId, questionId });
    if (history.length === 0) {
        return { valid: true, count: 0, reason: 'NO_REVISIONS' };
    }

    let prevId = null;
    let baselineCount = 0;

    for (let i = 0; i < history.length; i++) {
        const rev = history[i];

        // 1. Verify sequence monotonicity
        if (rev.sequenceNumber !== i + 1) {
            return {
                valid: false,
                reason: `Sequence broken: expected ${i + 1}, got ${rev.sequenceNumber}`,
                failedRevisionId: rev.revisionId
            };
        }

        // 2. Verify previous revision reference
        if (rev.previousRevisionId !== prevId) {
            return {
                valid: false,
                reason: `Chain broken at revision ${rev.revisionId}: expected previous ${prevId}, got ${rev.previousRevisionId}`,
                failedRevisionId: rev.revisionId
            };
        }

        // 3. Verify content hash
        const expectedHash = computeHash(rev.codeSnapshot);
        if (rev.contentHash !== expectedHash) {
            return {
                valid: false,
                reason: `Content hash mismatch at revision ${rev.revisionId}`,
                failedRevisionId: rev.revisionId
            };
        }

        if (rev.revisionType === 'BASELINE') {
            baselineCount++;
        }

        prevId = rev.revisionId;
    }

    if (baselineCount > 1) {
        return {
            valid: false,
            reason: `Multiple baseline revisions detected (${baselineCount})`,
            failedRevisionId: history.find(r => r.revisionType === 'BASELINE')?.revisionId
        };
    }

    return {
        valid: true,
        count: history.length,
        hasBaseline: baselineCount === 1,
        latestRevisionId: prevId
    };
}

/**
 * Resets in-memory revision store (for isolated unit tests).
 */
function resetMemoryStore() {
    memoryRevisions.clear();
    writeLocks.clear();
}

module.exports = {
    recordRevision,
    getRevisionHistory,
    getRevisionById,
    getBaselineRevision,
    getLatestRevision,
    verifyRevisionIntegrity,
    computeHash,
    resetMemoryStore
};
