/**
 * Hire1Percent — Asynchronous Integrity Analysis Queue & Background Worker
 * 
 * Manages asynchronous dispatch and processing of AI Code Change Analysis tasks.
 * Prevents Gemini latency from blocking candidate assessment submission or code runs.
 * 
 * Features:
 * - In-process worker with concurrency control (max 3 concurrent jobs).
 * - Monitored lifecycle states: PENDING -> PROCESSING -> COMPLETED / INSUFFICIENT_EVIDENCE / FAILED.
 * - Idempotency & duplicate job deduplication.
 * - Bounded retries (max 2 retries on network/503 errors).
 * - Result persistence to MongoDB Application record.
 */

const { analyzeCodeChange } = require('./aiCodeChangeAnalysisService');
const Application = require('../models/Application');

const JOB_STATUSES = Object.freeze({
    PENDING: 'pending',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    INSUFFICIENT_EVIDENCE: 'insufficient_evidence',
    FAILED: 'failed'
});

// In-memory queue storage: jobId -> Job
const jobQueue = new Map();
let isWorkerRunning = false;
const MAX_CONCURRENT_JOBS = 3;
let activeJobCount = 0;

/**
 * Creates unique job key for deduplication.
 */
function makeJobKey(assessmentId, candidateId, questionId) {
    return `${String(assessmentId)}:${String(candidateId)}:${String(questionId)}`;
}

/**
 * Enqueues an analysis job for background processing.
 */
function enqueueAnalysisJob(payload) {
    const jobKey = makeJobKey(payload.assessmentId, payload.candidateId, payload.questionId);

    // If already queued and pending/processing, do not duplicate
    if (jobQueue.has(jobKey)) {
        const existing = jobQueue.get(jobKey);
        if (existing.status === JOB_STATUSES.PENDING || existing.status === JOB_STATUSES.PROCESSING) {
            return {
                enqueued: false,
                jobId: jobKey,
                status: existing.status,
                message: 'Job already in progress'
            };
        }
    }

    const job = {
        jobId: jobKey,
        payload,
        status: JOB_STATUSES.PENDING,
        createdAt: new Date(),
        startedAt: null,
        completedAt: null,
        attempts: 0,
        maxAttempts: 2,
        result: null,
        error: null
    };

    jobQueue.set(jobKey, job);

    // Trigger queue consumer asynchronously
    setImmediate(processQueue);

    return {
        enqueued: true,
        jobId: jobKey,
        status: JOB_STATUSES.PENDING
    };
}

/**
 * Gets status and result of an integrity analysis job.
 */
function getJobStatus(jobKey) {
    const job = jobQueue.get(jobKey);
    if (!job) return null;
    return {
        jobId: job.jobId,
        status: job.status,
        createdAt: job.createdAt,
        completedAt: job.completedAt,
        result: job.result,
        error: job.error
    };
}

/**
 * Background worker processing loop.
 */
async function processQueue() {
    if (isWorkerRunning) return;
    isWorkerRunning = true;

    try {
        while (activeJobCount < MAX_CONCURRENT_JOBS) {
            // Find next pending job
            let nextJob = null;
            for (const job of jobQueue.values()) {
                if (job.status === JOB_STATUSES.PENDING) {
                    nextJob = job;
                    break;
                }
            }

            if (!nextJob) break;

            nextJob.status = JOB_STATUSES.PROCESSING;
            nextJob.startedAt = new Date();
            nextJob.attempts++;
            activeJobCount++;

            // Process job concurrently without blocking loop
            executeJob(nextJob).finally(() => {
                activeJobCount--;
                setImmediate(processQueue);
            });
        }
    } finally {
        isWorkerRunning = false;
    }
}

/**
 * Executes a single analysis job and stores result.
 */
async function executeJob(job) {
    try {
        const result = await analyzeCodeChange(job.payload);

        job.result = result;
        job.completedAt = new Date();
        job.status = result.analysisStatus === 'completed'
            ? JOB_STATUSES.COMPLETED
            : (result.analysisStatus === 'insufficient_evidence' ? JOB_STATUSES.INSUFFICIENT_EVIDENCE : JOB_STATUSES.FAILED);

        // Persist analysis result to Application document if available
        await persistResultToApplication(job.payload, result);
    } catch (err) {
        console.warn(`[INTEGRITY-QUEUE] Job execution failed for ${job.jobId}:`, err.message);

        if (job.attempts < job.maxAttempts) {
            // Requeue for retry
            job.status = JOB_STATUSES.PENDING;
        } else {
            job.status = JOB_STATUSES.FAILED;
            job.error = err.message;
            job.completedAt = new Date();
        }
    }
}

/**
 * Persists integrity analysis into Application document.
 */
async function persistResultToApplication(payload, analysisResult) {
    try {
        const { assessmentId, candidateId, questionId } = payload;
        if (!assessmentId || !candidateId) return;

        const appQuery = {
            $or: [
                { _id: assessmentId },
                { jobId: assessmentId, userId: candidateId }
            ]
        };

        const app = await Application.findOne(appQuery);
        if (!app) return;

        // Find matching coding answer
        const answer = (app.codingAnswers || []).find(a =>
            String(a.questionId) === String(questionId) || String(a._id) === String(questionId)
        );

        if (answer) {
            answer.integrityAnalysis = analysisResult;
            await app.save();
        }
    } catch (dbErr) {
        console.warn('[INTEGRITY-QUEUE] Application persist warning:', dbErr.message);
    }
}

/**
 * Clears in-memory queue (for testing).
 */
function clearQueue() {
    jobQueue.clear();
    activeJobCount = 0;
    isWorkerRunning = false;
}

module.exports = {
    enqueueAnalysisJob,
    getJobStatus,
    makeJobKey,
    clearQueue,
    JOB_STATUSES
};
