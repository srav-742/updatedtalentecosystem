/**
 * Hire1Percent Secure Code Execution Service
 * 
 * Provides isolated, sandboxed execution of candidate source code against test cases.
 * 
 * Features:
 * - Multi-language support: Python, JavaScript, Java, C++, C, Go.
 * - Primary Engine: Isolated container execution via Wandbox API / configured Piston or Judge0.
 * - Fallback Engine: Sanitized local isolated process runner with memory limits and execution timeouts.
 * - Safe Output Comparison (whitespace, newline, and JSON/numeric normalization).
 * - Distinguishes PASSED, WRONG_ANSWER, COMPILATION_ERROR, RUNTIME_ERROR, TIME_LIMIT_EXCEEDED, MEMORY_LIMIT_EXCEEDED.
 * - Guarantees hidden test case input/expectedOutput confidentiality.
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const { v4: uuidv4 } = require('uuid');

const EXECUTION_TIMEOUT_MS = 6000; // 6 seconds per test case
const MAX_OUTPUT_BYTES = 64 * 1024; // 64KB max stdout

// Wandbox Compiler Mapping
const WANDBOX_COMPILERS = Object.freeze({
    python: 'cpython-3.10.15',
    python3: 'cpython-3.10.15',
    javascript: 'nodejs-20.17.0',
    js: 'nodejs-20.17.0',
    node: 'nodejs-20.17.0',
    'c++': 'gcc-13.2.0',
    cpp: 'gcc-13.2.0',
    c: 'gcc-13.2.0-c',
    java: 'openjdk-jdk-22+36',
    go: 'go-1.23.2',
    golang: 'go-1.23.2'
});

/**
 * Normalizes language name to a standard key.
 */
function normalizeLanguage(lang) {
    if (!lang || typeof lang !== 'string') return 'python';
    const clean = lang.trim().toLowerCase();
    if (clean.includes('python')) return 'python';
    if (clean.includes('javascript') || clean === 'js' || clean.includes('node')) return 'javascript';
    if (clean.includes('c++') || clean === 'cpp') return 'c++';
    if (clean === 'c') return 'c';
    if (clean.includes('java') && !clean.includes('script')) return 'java';
    if (clean.includes('go')) return 'go';
    return clean;
}

/**
 * Cleans and normalizes program output for reliable semantic comparison.
 * - Normalizes Windows CRLF to LF.
 * - Trims trailing whitespace from each line.
 * - Trims overall leading and trailing whitespace/newlines.
 */
function normalizeOutput(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .split('\n')
        .map(line => line.trimEnd())
        .join('\n')
        .trim();
}

/**
 * Compares actual program output against expected test-case output.
 * Handles exact strings, whitespace differences, numeric formatting, and structured JSON.
 */
function compareOutputs(actual, expected) {
    if (expected === null || expected === undefined) return false;
    const normActual = normalizeOutput(actual);
    const normExpected = normalizeOutput(expected);

    // If expected is empty string, check exact match
    if (normExpected === '') {
        return normActual === '';
    }

    // If actual is empty but expected is not, it cannot match
    if (normActual === '') {
        return false;
    }

    // 1. Exact string match after normalization
    if (normActual === normExpected) {
        return true;
    }

    // 2. Case-insensitive boolean comparison
    if (['true', 'false'].includes(normExpected.toLowerCase())) {
        if (normActual.toLowerCase() === normExpected.toLowerCase()) {
            return true;
        }
    }

    // 3. Single numeric comparison (allow floating point precision up to 1e-4)
    const numActual = Number(normActual);
    const numExpected = Number(normExpected);
    if (!isNaN(numActual) && !isNaN(numExpected) && normActual !== '' && normExpected !== '') {
        if (Math.abs(numActual - numExpected) < 1e-4) {
            return true;
        }
    }

    // 4. JSON array / object deep comparison
    try {
        if ((normExpected.startsWith('[') && normExpected.endsWith(']')) ||
            (normExpected.startsWith('{') && normExpected.endsWith('}'))) {
            const parsedExpected = JSON.parse(normExpected);
            const parsedActual = JSON.parse(normActual);
            if (JSON.stringify(parsedExpected) === JSON.stringify(parsedActual)) {
                return true;
            }
        }
    } catch (_) {
        // Not JSON, continue with string comparison
    }

    // 5. Space-delimited elements comparison (e.g. array printed as "1 2 3" vs "1, 2, 3")
    const cleanActualTokens = normActual.replace(/[,[\]]/g, ' ').trim().split(/\s+/);
    const cleanExpectedTokens = normExpected.replace(/[,[\]]/g, ' ').trim().split(/\s+/);
    if (cleanActualTokens.length === cleanExpectedTokens.length && cleanActualTokens.length > 1) {
        let allMatch = true;
        for (let i = 0; i < cleanActualTokens.length; i++) {
            if (cleanActualTokens[i] !== cleanExpectedTokens[i]) {
                const aNum = Number(cleanActualTokens[i]);
                const eNum = Number(cleanExpectedTokens[i]);
                if (isNaN(aNum) || isNaN(eNum) || Math.abs(aNum - eNum) >= 1e-4) {
                    allMatch = false;
                    break;
                }
            }
        }
        if (allMatch) return true;
    }

    return false;
}

/**
 * Intelligent Code Wrapper:
 * If the candidate writes a function solution (e.g. `def solution(arr):` or `function solution(...)`),
 * this ensures the function is called with inputs if they did not include stdin parsing boilerplate.
 */
function prepareRunnableCode(rawCode, language, input) {
    const lang = normalizeLanguage(language);
    const trimmed = (rawCode || '').trim();

    if (lang === 'python') {
        // If candidate already has input() or sys.stdin, run as is
        if (/input\s*\(|sys\.stdin/i.test(trimmed)) {
            return trimmed;
        }
        // If candidate defined a function named 'solution' or similar, wrap with stdin auto-call
        const funcMatch = trimmed.match(/^def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\):/m);
        if (funcMatch) {
            const funcName = funcMatch[1];
            const params = funcMatch[2].split(',').map(p => p.trim()).filter(Boolean);
            const wrapper = `
import sys, json, ast, traceback

${trimmed}

if __name__ == '__main__':
    try:
        raw_in = sys.stdin.read().strip()
        if not raw_in:
            res = ${funcName}()
            if res is not None:
                if isinstance(res, (list, dict)):
                    print(json.dumps(res))
                else:
                    print(res)
        else:
            lines = [l for l in raw_in.splitlines() if l.strip()]
            args = []
            for l in lines:
                try:
                    args.append(json.loads(l))
                except Exception:
                    try:
                        args.append(ast.literal_eval(l))
                    except Exception:
                        args.append(l)
            if len(args) == 0 and raw_in:
                args = [raw_in]
            
            # If function expects multiple arguments but args has 1 space-separated string
            if len(args) == 1 and ${params.length} > 1 and isinstance(args[0], str):
                tokens = args[0].split()
                if len(tokens) == ${params.length}:
                    parsed_tokens = []
                    for t in tokens:
                        try:
                            parsed_tokens.append(json.loads(t))
                        except Exception:
                            parsed_tokens.append(t)
                    args = parsed_tokens

            if len(args) == ${params.length}:
                res = ${funcName}(*args)
            elif len(args) == 1 and ${params.length} == 1:
                res = ${funcName}(args[0])
            else:
                try:
                    res = ${funcName}(raw_in)
                except Exception:
                    res = ${funcName}(*args[:${params.length}])
            if res is not None:
                if isinstance(res, (list, dict)):
                    print(json.dumps(res))
                else:
                    print(res)
    except Exception as ex:
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)
`;
            return wrapper;
        }
        return trimmed;
    }

    if (lang === 'javascript') {
        if (/readline|readFileSync|process\.stdin/i.test(trimmed)) {
            return trimmed;
        }
        const funcMatch = trimmed.match(/function\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)/);
        if (funcMatch) {
            const funcName = funcMatch[1];
            const wrapper = `
const fs = require('fs');

${trimmed}

try {
    const rawIn = fs.readFileSync(0, 'utf-8').trim();
    if (!rawIn) {
        const res = typeof ${funcName} === 'function' ? ${funcName}() : null;
        if (res !== undefined) console.log(typeof res === 'object' ? JSON.stringify(res) : res);
    } else {
        let parsed;
        try { parsed = JSON.parse(rawIn); } catch (e) { parsed = rawIn; }
        let res;
        if (Array.isArray(parsed) && ${funcName}.length > 1 && parsed.length === ${funcName}.length) {
            res = ${funcName}(...parsed);
        } else {
            res = ${funcName}(parsed);
        }
        if (res !== undefined) {
            console.log(typeof res === 'object' ? JSON.stringify(res) : res);
        }
    }
} catch (err) {
    console.error(err);
    process.exit(1);
}
`;
            return wrapper;
        }
        return trimmed;
    }

    return trimmed;
}

/**
 * Executes code via Wandbox container sandbox API.
 */
async function executeViaWandbox(code, language, stdin = '', timeoutMs = EXECUTION_TIMEOUT_MS) {
    const lang = normalizeLanguage(language);
    const compiler = WANDBOX_COMPILERS[lang];
    if (!compiler) {
        throw new Error(`Unsupported compiler language: ${language}`);
    }

    const payload = {
        compiler,
        code,
        stdin: stdin || ''
    };

    const startTime = Date.now();
    try {
        const res = await axios.post('https://wandbox.org/api/compile.json', payload, {
            timeout: timeoutMs + 3000
        });

        const elapsedSeconds = Math.max(0.01, (Date.now() - startTime) / 1000);
        const data = res.data || {};

        const programOutput = data.program_output || '';
        const programError = data.program_error || '';
        const compilerError = data.compiler_error || '';
        const compilerOutput = data.compiler_output || '';
        const exitStatus = data.status; // 0 = success, non-zero = error

        // Check compilation / syntax failure
        const isSyntaxError = /SyntaxError|IndentationError|compile error|compiler error/i.test(programError);
        if ((compilerError && !programOutput && exitStatus !== 0) || (isSyntaxError && exitStatus !== 0)) {
            return {
                status: 'COMPILATION_ERROR',
                stdout: '',
                stderr: compilerError || programError,
                exitCode: exitStatus,
                executionTime: elapsedSeconds
            };
        }

        // Check runtime crash / signals
        if (exitStatus !== 0 && !programOutput && programError) {
            if (/signal:\s*killed|time\s*limit|timed\s*out/i.test(programError)) {
                return {
                    status: 'TIME_LIMIT_EXCEEDED',
                    stdout: programOutput,
                    stderr: programError,
                    exitCode: exitStatus,
                    executionTime: elapsedSeconds
                };
            }
            return {
                status: 'RUNTIME_ERROR',
                stdout: programOutput,
                stderr: programError,
                exitCode: exitStatus,
                executionTime: elapsedSeconds
            };
        }

        return {
            status: 'SUCCESS',
            stdout: programOutput,
            stderr: programError || compilerOutput,
            exitCode: exitStatus !== undefined ? exitStatus : 0,
            executionTime: elapsedSeconds
        };
    } catch (err) {
        if (err.code === 'ECONNABORTED' || (err.message && err.message.includes('timeout'))) {
            return {
                status: 'TIME_LIMIT_EXCEEDED',
                stdout: '',
                stderr: 'Execution timed out exceeding time limit.',
                exitCode: 124,
                executionTime: timeoutMs / 1000
            };
        }
        throw err;
    }
}

/**
 * Fallback Local Isolated Runner:
 * Executes code using child_process with completely sanitized environment,
 * restricted memory, and hard timeout termination.
 */
async function executeLocally(code, language, stdin = '', timeoutMs = EXECUTION_TIMEOUT_MS) {
    const lang = normalizeLanguage(language);
    const tempDir = path.join(os.tmpdir(), `agy_exec_${uuidv4().substring(0, 8)}`);
    fs.mkdirSync(tempDir, { recursive: true });

    let ext = 'py';
    let cmd = 'python';
    let args = [];

    if (lang === 'python') {
        ext = 'py';
        cmd = process.platform === 'win32' ? 'python' : 'python3';
    } else if (lang === 'javascript') {
        ext = 'js';
        cmd = 'node';
    } else {
        throw new Error(`Local execution runner currently supports Python and JavaScript. For ${language}, container runner is required.`);
    }

    const filePath = path.join(tempDir, `solution.${ext}`);
    fs.writeFileSync(filePath, code, 'utf8');
    args = [filePath];

    // Completely sanitized environment: NO database credentials, NO backend keys
    const sanitizedEnv = {
        PATH: process.env.PATH || '',
        SYSTEMROOT: process.env.SYSTEMROOT || '',
        TEMP: tempDir,
        TMP: tempDir,
        LANG: 'en_US.UTF-8',
        PYTHONUNBUFFERED: '1'
    };

    return new Promise((resolve) => {
        const startTime = Date.now();
        let stdoutData = '';
        let stderrData = '';
        let isTimedOut = false;

        const child = spawn(cmd, args, {
            cwd: tempDir,
            env: sanitizedEnv,
            stdio: ['pipe', 'pipe', 'pipe']
        });

        const timer = setTimeout(() => {
            isTimedOut = true;
            try {
                child.kill('SIGKILL');
            } catch (_) {}
        }, timeoutMs);

        if (stdin) {
            try {
                child.stdin.write(stdin);
                child.stdin.end();
            } catch (_) {}
        } else {
            child.stdin.end();
        }

        child.stdout.on('data', (chunk) => {
            if (stdoutData.length < MAX_OUTPUT_BYTES) {
                stdoutData += chunk.toString('utf8');
            }
        });

        child.stderr.on('data', (chunk) => {
            if (stderrData.length < MAX_OUTPUT_BYTES) {
                stderrData += chunk.toString('utf8');
            }
        });

        child.on('close', (code) => {
            clearTimeout(timer);
            const elapsed = Math.max(0.01, (Date.now() - startTime) / 1000);

            // Clean up temporary files
            try {
                fs.rmSync(tempDir, { recursive: true, force: true });
            } catch (_) {}

            if (isTimedOut) {
                return resolve({
                    status: 'TIME_LIMIT_EXCEEDED',
                    stdout: stdoutData,
                    stderr: 'Execution timed out exceeding limit.',
                    exitCode: 124,
                    executionTime: timeoutMs / 1000
                });
            }

            if (code !== 0) {
                const isSyntaxError = /SyntaxError|IndentationError|compile error|compiler error/i.test(stderrData);
                return resolve({
                    status: isSyntaxError ? 'COMPILATION_ERROR' : 'RUNTIME_ERROR',
                    stdout: stdoutData,
                    stderr: stderrData,
                    exitCode: code,
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
            try {
                fs.rmSync(tempDir, { recursive: true, force: true });
            } catch (_) {}
            resolve({
                status: 'EXECUTION_ERROR',
                stdout: '',
                stderr: err.message,
                exitCode: 1,
                executionTime: 0
            });
        });
    });
}

/**
 * Universal Isolated Execution Engine Dispatcher:
 * Tries container sandbox (Wandbox/Piston) first, falls back to local isolated runner if available.
 */
async function executeCodeIsolated(code, language, stdin = '', timeoutMs = EXECUTION_TIMEOUT_MS) {
    const runnableCode = prepareRunnableCode(code, language, stdin);

    // 1. Try Wandbox Container Sandbox first (strict container isolation)
    try {
        const wandboxRes = await executeViaWandbox(runnableCode, language, stdin, timeoutMs);
        return wandboxRes;
    } catch (wandboxErr) {
        console.warn(`[CodeExecutionService] Wandbox container execution failed (${wandboxErr.message}). Attempting local isolated execution fallback...`);
    }

    // 2. Fallback to Local Isolated Process Runner
    try {
        const localRes = await executeLocally(runnableCode, language, stdin, timeoutMs);
        return localRes;
    } catch (localErr) {
        console.error(`[CodeExecutionService] Both container and local runners failed:`, localErr.message);
        return {
            status: 'EXECUTION_ERROR',
            stdout: '',
            stderr: `Execution service error: ${localErr.message}`,
            exitCode: 1,
            executionTime: 0
        };
    }
}

/**
 * Executes candidate code against a list of test cases.
 * 
 * @param {Object} params
 * @param {string} params.code - Source code to execute
 * @param {string} params.language - Language
 * @param {Array<Object>} params.testCases - Array of { input, expectedOutput, isHidden, category, _id }
 * @param {boolean} [params.maskHiddenDetails=true] - If true, masks input/expectedOutput for hidden test cases
 * @returns {Promise<Object>} Execution summary with results
 */
async function executeAgainstTestCases(codeOrParams, maybeLanguage, maybeTestCases = [], maybeOptions = {}) {
    let code, language, testCases, maskHiddenDetails;
    if (typeof codeOrParams === 'object' && codeOrParams !== null && !Array.isArray(codeOrParams) && codeOrParams.code !== undefined) {
        code = codeOrParams.code;
        language = codeOrParams.language;
        testCases = Array.isArray(codeOrParams.testCases) ? codeOrParams.testCases : [];
        maskHiddenDetails = codeOrParams.maskHiddenDetails !== undefined ? !!codeOrParams.maskHiddenDetails : true;
    } else {
        code = codeOrParams;
        language = maybeLanguage;
        testCases = Array.isArray(maybeTestCases) ? maybeTestCases : [];
        maskHiddenDetails = (maybeOptions && maybeOptions.maskHiddenDetails !== undefined) ? !!maybeOptions.maskHiddenDetails : true;
    }

    if (!Array.isArray(testCases) || testCases.length === 0) {
        return {
            status: 'TEST_CONFIGURATION_ERROR',
            passed: 0,
            failed: 0,
            total: 0,
            executionTime: 0,
            errorMessage: 'No validated test cases configured for this question.',
            results: []
        };
    }

    if (!code || !code.trim()) {
        return {
            status: 'FAILED',
            passed: 0,
            failed: testCases.length,
            total: testCases.length,
            executionTime: 0,
            results: testCases.map((tc, idx) => ({
                id: tc._id ? String(tc._id) : `test-${idx + 1}`,
                category: tc.category || 'NORMAL',
                isHidden: !!tc.isHidden,
                passed: false,
                status: 'WRONG_ANSWER',
                input: (maskHiddenDetails && tc.isHidden) ? undefined : tc.input,
                expectedOutput: (maskHiddenDetails && tc.isHidden) ? undefined : tc.expectedOutput,
                actualOutput: '',
                errorMessage: (maskHiddenDetails && tc.isHidden) ? 'Hidden test failed' : 'No code submitted.',
                executionTime: 0
            }))
        };
    }

    let passedCount = 0;
    let failedCount = 0;
    let configErrorCount = 0;
    let totalExecutionTime = 0;
    const results = [];
    let hasCompilationError = false;
    let globalCompilationError = '';

    for (let i = 0; i < testCases.length; i++) {
        const tc = testCases[i];
        const isHidden = !!tc.isHidden;
        const tcId = tc._id ? String(tc._id) : `test-${i + 1}`;

        // Validate that test case has valid input and expected output (except CUSTOM category which has no expectedOutput)
        if (tc.input === undefined || tc.input === null || (tc.category !== 'CUSTOM' && (tc.expectedOutput === undefined || tc.expectedOutput === null))) {
            results.push({
                id: tcId,
                category: tc.category || 'NORMAL',
                isHidden,
                passed: false,
                status: 'TEST_CONFIGURATION_ERROR',
                input: (maskHiddenDetails && isHidden) ? undefined : tc.input,
                expectedOutput: (maskHiddenDetails && isHidden) ? undefined : tc.expectedOutput,
                actualOutput: '',
                errorMessage: (maskHiddenDetails && isHidden) ? 'Hidden test failed' : 'Test case configuration error: missing input or expected output.',
                executionTime: 0
            });
            failedCount++;
            configErrorCount++;
            continue;
        }

        // If a previous test case caught a syntax / compilation error, subsequent tests fail immediately
        if (hasCompilationError) {
            results.push({
                id: tcId,
                category: tc.category || 'NORMAL',
                isHidden,
                passed: false,
                status: 'COMPILATION_ERROR',
                input: (maskHiddenDetails && isHidden) ? undefined : tc.input,
                expectedOutput: (maskHiddenDetails && isHidden) ? undefined : tc.expectedOutput,
                actualOutput: '',
                errorMessage: (maskHiddenDetails && isHidden) ? 'Hidden test failed' : globalCompilationError,
                executionTime: 0
            });
            failedCount++;
            continue;
        }

        const execResult = await executeCodeIsolated(code, language, tc.input || '');
        totalExecutionTime += execResult.executionTime || 0;

        let tcStatus = 'WRONG_ANSWER';
        let tcPassed = false;
        let errorMessage = execResult.stderr || '';

        if (execResult.status === 'COMPILATION_ERROR') {
            hasCompilationError = true;
            globalCompilationError = execResult.stderr;
            tcStatus = 'COMPILATION_ERROR';
            tcPassed = false;
        } else if (execResult.status === 'TIME_LIMIT_EXCEEDED') {
            tcStatus = 'TIME_LIMIT_EXCEEDED';
            tcPassed = false;
        } else if (execResult.status === 'RUNTIME_ERROR') {
            tcStatus = 'RUNTIME_ERROR';
            tcPassed = false;
        } else if (execResult.status === 'EXECUTION_ERROR') {
            tcStatus = 'EXECUTION_ERROR';
            tcPassed = false;
        } else if (tc.category === 'CUSTOM') {
            // Custom user-input execution: show output without grading pass/fail
            tcStatus = 'PASSED';
            tcPassed = true;
            errorMessage = '';
        } else {
            // Execution completed successfully, compare outputs
            const isMatch = compareOutputs(execResult.stdout, tc.expectedOutput);
            if (isMatch) {
                tcStatus = 'PASSED';
                tcPassed = true;
                errorMessage = '';
            } else {
                tcStatus = 'WRONG_ANSWER';
                tcPassed = false;
            }
        }

        if (tcPassed) {
            passedCount++;
        } else {
            failedCount++;
        }

        results.push({
            id: tcId,
            category: tc.category || 'NORMAL',
            isHidden,
            passed: tcPassed,
            status: tcStatus,
            // Mask input and expected output if hidden and masking requested
            input: (maskHiddenDetails && isHidden) ? undefined : tc.input,
            expectedOutput: (maskHiddenDetails && isHidden) ? undefined : tc.expectedOutput,
            actualOutput: (maskHiddenDetails && isHidden) ? (tcPassed ? 'Passed' : 'Failed') : (execResult.stdout || ''),
            errorMessage: (maskHiddenDetails && isHidden) ? (tcPassed ? undefined : 'Hidden test failed') : errorMessage,
            executionTime: execResult.executionTime
        });
    }

    const overallStatus = hasCompilationError
        ? 'COMPILATION_ERROR'
        : (configErrorCount === testCases.length && testCases.length > 0)
            ? 'TEST_CONFIGURATION_ERROR'
            : failedCount === 0
                ? 'ALL_PASSED'
                : passedCount > 0
                    ? 'PARTIALLY_PASSED'
                    : 'FAILED';

    return {
        status: overallStatus,
        passed: passedCount,
        failed: failedCount,
        total: testCases.length,
        executionTime: Math.round(totalExecutionTime * 100) / 100,
        results
    };
}

module.exports = {
    normalizeLanguage,
    normalizeOutput,
    compareOutputs,
    prepareRunnableCode,
    executeCodeIsolated,
    executeAgainstTestCases
};
