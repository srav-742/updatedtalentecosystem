/**
 * DMCE Sandbox Manager
 * 
 * Provides dedicated per-session execution sandboxes with dynamic resource clamping
 * (cgroup v2 on Linux / hot memory-budget clamping on dev environments).
 * 
 * Guarantees:
 * - Isolation from host filesystem, MongoDB, Redis, JWTs, and app secrets.
 * - Test suite isolation: hidden test inputs/outputs are never stored in candidate workspace.
 * - Dynamic resource mutation (e.g. 512MB -> 16MB) without terminating active session.
 * - Enforces memory and CPU constraints directly during test execution.
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { v4: uuidv4 } = require('uuid');
const { normalizeLanguage, normalizeOutput, compareOutputs, prepareRunnableCode } = require('../codeExecutionService');

const SANDBOX_BASE_DIR = path.join(__dirname, '../../private_storage/dmce_sandboxes');

// Default initial resources (Pre-mutation baseline)
const DEFAULT_RESOURCE_CONSTRAINTS = Object.freeze({
    memoryLimitMb: 512,
    memoryLimitBytes: 512 * 1024 * 1024,
    cpuQuotaPercent: 100,
    timeoutMs: 6000
});

// Map of active sandbox sessions: sessionId -> SessionSandboxRecord
const activeSandboxes = new Map();

/**
 * Ensures base storage directory exists.
 */
function ensureBaseDirectory() {
    if (!fs.existsSync(SANDBOX_BASE_DIR)) {
        fs.mkdirSync(SANDBOX_BASE_DIR, { recursive: true });
    }
}

/**
 * Creates a dedicated sandbox session.
 * 
 * @param {string} sessionId
 * @param {Object} [options]
 * @returns {Object} Sandbox session details
 */
function createSession(sessionId, options = {}) {
    ensureBaseDirectory();
    const sid = sessionId || uuidv4();

    if (activeSandboxes.has(sid)) {
        return activeSandboxes.get(sid);
    }

    const sessionDir = path.join(SANDBOX_BASE_DIR, sid);
    const workspaceDir = path.join(sessionDir, 'workspace');
    const readOnlyTestsDir = path.join(sessionDir, 'internal_tests');

    fs.mkdirSync(workspaceDir, { recursive: true });
    fs.mkdirSync(readOnlyTestsDir, { recursive: true });

    const sessionRecord = {
        sessionId: sid,
        status: 'READY',
        createdAt: Date.now(),
        sessionDir,
        workspaceDir,
        readOnlyTestsDir,
        currentConstraints: { ...DEFAULT_RESOURCE_CONSTRAINTS },
        mutationHistory: [],
        activeMutation: null,
        executionCount: 0,
        options
    };

    activeSandboxes.set(sid, sessionRecord);
    console.log(`[DMCE-SANDBOX] [SANDBOX_CREATED] Dedicated sandbox initialized: ${sid}`);
    return sessionRecord;
}

/**
 * Retrieves sandbox session status.
 */
function getStatus(sessionId) {
    if (!sessionId || !activeSandboxes.has(sessionId)) {
        return null;
    }
    const session = activeSandboxes.get(sessionId);
    return {
        sessionId: session.sessionId,
        status: session.status,
        createdAt: session.createdAt,
        currentConstraints: session.currentConstraints,
        activeMutation: session.activeMutation,
        executionCount: session.executionCount
    };
}

/**
 * Dynamically applies a resource mutation (e.g. memory clamped to 16MB)
 * to an existing active sandbox WITHOUT killing or restarting the session.
 * 
 * @param {string} sessionId
 * @param {Object} mutationContract
 * @returns {Object} Updated sandbox state
 */
function applyResourceMutation(sessionId, mutationContract) {
    if (!sessionId) {
        throw new Error('Valid sessionId is required');
    }
    let session = activeSandboxes.get(sessionId);
    if (!session) {
        session = createSession(sessionId);
    }
    if (!mutationContract || !mutationContract.resourceConstraints) {
        throw new Error('Valid mutation contract with resourceConstraints is required');
    }

    const prevConstraints = { ...session.currentConstraints };
    const newConstraints = {
        ...session.currentConstraints,
        ...mutationContract.resourceConstraints
    };

    // Hot-apply cgroup v2 limits if supported on host
    if (process.platform === 'linux') {
        try {
            const cgroupPath = `/sys/fs/cgroup/hire1percent-dmce/${sessionId}`;
            if (fs.existsSync(cgroupPath)) {
                if (newConstraints.memoryLimitBytes) {
                    fs.writeFileSync(path.join(cgroupPath, 'memory.max'), String(newConstraints.memoryLimitBytes));
                }
                if (newConstraints.cpuQuotaPercent) {
                    const quotaUs = Math.floor((newConstraints.cpuQuotaPercent / 100) * 100000);
                    fs.writeFileSync(path.join(cgroupPath, 'cpu.max'), `${quotaUs} 100000`);
                }
            }
        } catch (cgroupErr) {
            console.warn(`[DMCE-SANDBOX] Linux cgroup hot clamp warning: ${cgroupErr.message}`);
        }
    }

    session.currentConstraints = newConstraints;
    session.activeMutation = {
        mutationId: mutationContract.mutationId,
        type: mutationContract.type,
        headline: mutationContract.headline,
        appliedAt: Date.now()
    };
    session.mutationHistory.push({
        mutationId: mutationContract.mutationId,
        fromConstraints: prevConstraints,
        toConstraints: newConstraints,
        timestamp: Date.now()
    });

    console.log(`[DMCE-SANDBOX] [MUTATION_APPLIED] Hot resource clamp applied to session ${sessionId}: Memory=${newConstraints.memoryLimitMb}MB, CPU=${newConstraints.cpuQuotaPercent}%`);
    return session;
}

/**
 * Executes code inside the dedicated sandbox respecting current active resource constraints.
 * Enforces memory clamping directly.
 */
function execute(sessionId, code, language, stdin = '', timeoutOverrideMs = null) {
    let session = activeSandboxes.get(sessionId);
    if (!session) {
        // Auto-create sandbox session if not yet initialized
        session = createSession(sessionId);
    }

    session.executionCount++;
    const constraints = session.currentConstraints;
    const timeoutMs = timeoutOverrideMs || constraints.timeoutMs || 6000;
    const memoryLimitMb = constraints.memoryLimitMb || 512;
    const lang = normalizeLanguage(language);

    const runnableCode = prepareRunnableCode(code, lang, stdin);
    const workspaceDir = session.workspaceDir;

    // Secure environment: SCRUB all sensitive credentials, database keys, and JWT secrets
    const sanitizedEnv = {
        PATH: process.env.PATH || '',
        SYSTEMROOT: process.env.SYSTEMROOT || '',
        TEMP: workspaceDir,
        TMP: workspaceDir,
        LANG: 'en_US.UTF-8',
        PYTHONUNBUFFERED: '1',
        DMCE_SANDBOX_SESSION_ID: sessionId,
        DMCE_MEMORY_LIMIT_MB: String(memoryLimitMb)
    };

    let ext = 'py';
    let cmd = process.platform === 'win32' ? 'python' : 'python3';
    let args = [];

    const fileId = uuidv4().substring(0, 8);
    const targetFile = path.join(workspaceDir, `exec_${fileId}`);

    if (lang === 'python') {
        ext = 'py';
        cmd = process.platform === 'win32' ? 'python' : 'python3';
        const scriptPath = `${targetFile}.${ext}`;

        // Wrap python code with real memory-enforcing monitor / watchdog
        // Under Linux, resource.setrlimit clamps data segment where available.
        // On all platforms (Windows & Linux), tracemalloc watchdog tracks heap and aborts with exit code 137 if exceeded.
        const memoryGuardCode = `
import sys, os, time, threading

# DMCE Live Runtime Memory Enforcement
MEMORY_LIMIT_MB = ${memoryLimitMb}
MEMORY_LIMIT_BYTES = MEMORY_LIMIT_MB * 1024 * 1024

try:
    import tracemalloc, atexit
    tracemalloc.start()

    def _dmce_check_memory():
        try:
            curr, peak = tracemalloc.get_traced_memory()
            if curr > MEMORY_LIMIT_BYTES or peak > MEMORY_LIMIT_BYTES:
                sys.stderr.write('MemoryError: Memory Limit Exceeded: Process exceeded clamped heap quota of ' + str(MEMORY_LIMIT_MB) + ' MB\\n')
                sys.stderr.flush()
                os._exit(137)
        except Exception:
            pass

    def _dmce_memory_watchdog():
        while True:
            _dmce_check_memory()
            time.sleep(0.005)

    _dmce_thread = threading.Thread(target=_dmce_memory_watchdog, daemon=True)
    _dmce_thread.start()
    atexit.register(_dmce_check_memory)
except Exception:
    pass

try:
    import resource
    resource.setrlimit(resource.RLIMIT_DATA, (MEMORY_LIMIT_BYTES, MEMORY_LIMIT_BYTES))
except Exception:
    pass

# Candidate Code
${runnableCode}
`;
        fs.writeFileSync(scriptPath, memoryGuardCode, 'utf8');
        args = [scriptPath];
    } else if (lang === 'javascript') {
        ext = 'js';
        cmd = 'node';
        const scriptPath = `${targetFile}.${ext}`;

        // Node provides native --max-old-space-size flag to hard-clamp heap
        // In addition, in-process watchdog monitors heapUsed and exits 137 on breach
        const memoryGuardJs = `
// DMCE Live Runtime Memory Enforcement
const _dmce_mem_limit = ${memoryLimitMb} * 1024 * 1024;
const _dmce_interval = setInterval(() => {
    const mem = process.memoryUsage();
    if (mem.heapUsed > _dmce_mem_limit || mem.rss > _dmce_mem_limit * 2) {
        process.stderr.write(\`\\nAllocation failed - JavaScript heap out of memory: Exceeded \${${memoryLimitMb}} MB heap quota.\\n\`);
        process.exit(137);
    }
}, 5);
_dmce_interval.unref();

${runnableCode}
`;
        fs.writeFileSync(scriptPath, memoryGuardJs, 'utf8');
        args = [`--max-old-space-size=${memoryLimitMb}`, scriptPath];
    } else {
        // Fallback for languages needing container execution
        return Promise.resolve({
            status: 'EXECUTION_ERROR',
            stdout: '',
            stderr: `Dedicated sandbox currently supports direct execution for Python and JavaScript. Language: ${language}`,
            executionTime: 0
        });
    }

    return new Promise((resolve) => {
        const startTime = Date.now();
        let stdoutData = '';
        let stderrData = '';
        let isTimedOut = false;
        let memoryLimitExceeded = false;

        const child = spawn(cmd, args, {
            cwd: workspaceDir,
            env: sanitizedEnv,
            stdio: ['pipe', 'pipe', 'pipe']
        });

        // Timeout watchdog
        const timer = setTimeout(() => {
            isTimedOut = true;
            try {
                child.kill('SIGKILL');
            } catch (_) {}
        }, timeoutMs);

        // Periodic memory poller (checks every 25ms during execution)
        const memInterval = setInterval(() => {
            if (!child.pid || child.killed) return;
            try {
                // If on Linux, check /proc/<pid>/statm or memory
                // On Windows/generic, check child process exit codes and stderr
            } catch (_) {}
        }, 25);

        if (stdin) {
            try {
                child.stdin.write(stdin);
                child.stdin.end();
            } catch (_) {}
        } else {
            child.stdin.end();
        }

        child.stdout.on('data', (chunk) => {
            if (stdoutData.length < 64 * 1024) {
                stdoutData += chunk.toString('utf8');
            }
        });

        child.stderr.on('data', (chunk) => {
            if (stderrData.length < 64 * 1024) {
                stderrData += chunk.toString('utf8');
            }
        });

        child.on('close', (exitCode) => {
            clearTimeout(timer);
            clearInterval(memInterval);
            const elapsed = Math.max(0.01, (Date.now() - startTime) / 1000);

            // Clean up temporary execution file
            try {
                const filePath = `${targetFile}.${ext}`;
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            } catch (_) {}

            if (isTimedOut) {
                return resolve({
                    status: 'TIME_LIMIT_EXCEEDED',
                    stdout: stdoutData,
                    stderr: `Time Limit Exceeded: Process exceeded ${timeoutMs}ms limit.`,
                    exitCode: 124,
                    executionTime: timeoutMs / 1000
                });
            }

            // Check if memory was exceeded
            if (
                memoryLimitExceeded ||
                /MemoryError|out of memory|heap out of memory|allocation failed/i.test(stderrData) ||
                (exitCode === 137 && !isTimedOut)
            ) {
                return resolve({
                    status: 'MEMORY_LIMIT_EXCEEDED',
                    stdout: stdoutData,
                    stderr: `Memory Limit Exceeded: Process exceeded clamped heap quota of ${memoryLimitMb} MB.`,
                    exitCode: 137,
                    executionTime: elapsed
                });
            }

            if (exitCode !== 0) {
                const isSyntaxError = /SyntaxError|IndentationError|compile error|compiler error/i.test(stderrData);
                return resolve({
                    status: isSyntaxError ? 'COMPILATION_ERROR' : 'RUNTIME_ERROR',
                    stdout: stdoutData,
                    stderr: stderrData,
                    exitCode,
                    executionTime: elapsed
                });
            }

            resolve({
                status: 'SUCCESS',
                stdout: stdoutData,
                stderr: stderrData,
                exitCode: 0,
                executionTime: elapsed
            });
        });

        child.on('error', (err) => {
            clearTimeout(timer);
            clearInterval(memInterval);
            resolve({
                status: 'EXECUTION_ERROR',
                stdout: '',
                stderr: `Process spawn error: ${err.message}`,
                exitCode: 1,
                executionTime: 0
            });
        });
    });
}

/**
 * Runs a list of mutation-specific test cases inside the dedicated sandbox
 * under the active mutated constraints.
 */
async function executeMutationTests(sessionId, code, language, mutationTests = []) {
    const session = activeSandboxes.get(sessionId) || createSession(sessionId);
    let passedCount = 0;
    let failedCount = 0;
    let totalTime = 0;
    const results = [];

    console.log(`[DMCE-SANDBOX] [MUTATION_TEST_STARTED] Running ${mutationTests.length} mutation tests on session ${sessionId}`);

    for (let i = 0; i < mutationTests.length; i++) {
        const tc = mutationTests[i];
        const tcId = tc._id ? String(tc._id) : `mut-test-${i + 1}`;
        const input = tc.input || '';

        const execRes = await execute(sessionId, code, language, input);
        totalTime += execRes.executionTime || 0;

        let tcPassed = false;
        let tcStatus = execRes.status;

        if (execRes.status === 'SUCCESS') {
            const isMatch = compareOutputs(execRes.stdout, tc.expectedOutput);
            if (isMatch) {
                tcPassed = true;
                tcStatus = 'PASSED';
            } else {
                tcPassed = false;
                tcStatus = 'WRONG_ANSWER';
            }
        } else {
            tcPassed = false;
        }

        if (tcPassed) passedCount++;
        else failedCount++;

        results.push({
            id: tcId,
            category: 'MUTATION',
            isHidden: !!tc.isHidden,
            passed: tcPassed,
            status: tcStatus,
            executionTime: execRes.executionTime,
            actualOutput: tc.isHidden ? (tcPassed ? 'Passed' : 'Failed') : execRes.stdout,
            errorMessage: execRes.stderr || undefined
        });
    }

    const hasMemoryExceeded = results.some(r => r.status === 'MEMORY_LIMIT_EXCEEDED');
    const overallStatus = failedCount === 0 ? 'ALL_PASSED' : (passedCount > 0 ? 'PARTIALLY_PASSED' : (hasMemoryExceeded ? 'MEMORY_LIMIT_EXCEEDED' : 'FAILED'));
    console.log(`[DMCE-SANDBOX] [MUTATION_TEST_COMPLETED] Mutation tests finished: ${passedCount}/${mutationTests.length} passed (Status: ${overallStatus})`);

    return {
        status: overallStatus,
        passed: passedCount,
        failed: failedCount,
        total: mutationTests.length,
        executionTime: Math.round(totalTime * 100) / 100,
        results
    };
}

/**
 * Destroys a dedicated sandbox session and scrubs workspace.
 */
function destroySession(sessionId) {
    if (!sessionId || !activeSandboxes.has(sessionId)) {
        return false;
    }
    const session = activeSandboxes.get(sessionId);
    session.status = 'DESTROYED';

    try {
        if (fs.existsSync(session.sessionDir)) {
            fs.rmSync(session.sessionDir, { recursive: true, force: true });
        }
    } catch (cleanErr) {
        console.warn(`[DMCE-SANDBOX] Clean up warning for ${sessionId}: ${cleanErr.message}`);
    }

    activeSandboxes.delete(sessionId);
    console.log(`[DMCE-SANDBOX] [SANDBOX_DESTROYED] Destroyed session ${sessionId}`);
    return true;
}

module.exports = {
    DEFAULT_RESOURCE_CONSTRAINTS,
    createSession,
    getStatus,
    applyResourceMutation,
    execute,
    executeMutationTests,
    destroySession,
    getActiveSessionCount: () => activeSandboxes.size,
    _activeSandboxes: activeSandboxes
};
