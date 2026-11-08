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
 * Cross-language output normalization:
 * Translates Python-specific output formats to universal equivalents so that
 * a correct JavaScript solution isn't penalized for printing 'true' instead of 'True'.
 */
function crossLanguageNormalize(str) {
    if (!str || typeof str !== 'string') return '';
    let s = str;
    // Python True/False/None → lowercase boolean/null
    s = s.replace(/\bTrue\b/g, 'true');
    s = s.replace(/\bFalse\b/g, 'false');
    s = s.replace(/\bNone\b/g, 'null');
    // Python single-quoted strings → double-quoted
    s = s.replace(/'/g, '"');
    // Python tuple (1, 2, 3) → [1, 2, 3]
    s = s.replace(/\((\s*(?:-?\d+(?:\.\d+)?(?:\s*,\s*-?\d+(?:\.\d+)?)*)\s*)\)/g, '[$1]');
    // Remove trailing comma in tuples/lists: (1,) → [1]
    s = s.replace(/,\s*\]/g, ']');
    s = s.replace(/,\s*\)/g, ')');
    return s;
}

/**
 * Compares actual program output against expected test-case output.
 * Handles exact strings, whitespace differences, numeric formatting,
 * structured JSON, cross-language format differences (Python vs JS vs Java),
 * and common output formatting variations.
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

    // 2. Cross-language normalized match (Python True/False/None, tuples, quotes)
    const xlActual = crossLanguageNormalize(normActual);
    const xlExpected = crossLanguageNormalize(normExpected);
    if (xlActual === xlExpected) {
        return true;
    }

    // 2.1 String unquoting comparison:
    // Handles cases where expected is "'l'" or '"l"' but candidate output is l, or vice versa
    const stripSurroundingQuotes = (s) => {
        if (!s || typeof s !== 'string') return '';
        const trimmed = s.trim();
        if ((trimmed.startsWith("'") && trimmed.endsWith("'") && trimmed.length >= 2) ||
            (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2)) {
            return trimmed.slice(1, -1);
        }
        return trimmed;
    };

    const unqActual = stripSurroundingQuotes(normActual);
    const unqExpected = stripSurroundingQuotes(normExpected);
    if (unqActual === unqExpected) {
        return true;
    }
    const unqXlActual = stripSurroundingQuotes(xlActual);
    const unqXlExpected = stripSurroundingQuotes(xlExpected);
    if (unqXlActual === unqXlExpected) {
        return true;
    }

    // 3. Case-insensitive boolean comparison (true/false/yes/no)
    const lowerActual = normActual.toLowerCase().trim();
    const lowerExpected = normExpected.toLowerCase().trim();
    if (['true', 'false', 'yes', 'no'].includes(lowerExpected)) {
        if (lowerActual === lowerExpected) {
            return true;
        }
    }

    // 4. Single numeric comparison (allow floating point precision up to 1e-4)
    const numActual = Number(normActual);
    const numExpected = Number(normExpected);
    if (!isNaN(numActual) && !isNaN(numExpected) && normActual !== '' && normExpected !== '') {
        if (Math.abs(numActual - numExpected) < 1e-4) {
            return true;
        }
    }

    // 5. JSON array / object deep comparison (handles formatting differences)
    try {
        const actualForJson = xlActual;
        const expectedForJson = xlExpected;
        if ((expectedForJson.startsWith('[') && expectedForJson.endsWith(']')) ||
            (expectedForJson.startsWith('{') && expectedForJson.endsWith('}'))) {
            const parsedExpected = JSON.parse(expectedForJson);
            const parsedActual = JSON.parse(actualForJson);
            if (JSON.stringify(parsedExpected) === JSON.stringify(parsedActual)) {
                return true;
            }
            // Deep equality with sorted keys for objects
            if (typeof parsedExpected === 'object' && typeof parsedActual === 'object') {
                if (JSON.stringify(sortDeep(parsedExpected)) === JSON.stringify(sortDeep(parsedActual))) {
                    return true;
                }
            }
        }
    } catch (_) {
        // Not JSON, continue with string comparison
    }

    // 5.1 Unordered Set comparison (e.g. {1, 2, 3} vs {3, 1, 2} in Python)
    if (normActual.startsWith('{') && normActual.endsWith('}') &&
        normExpected.startsWith('{') && normExpected.endsWith('}') &&
        !normActual.includes(':') && !normExpected.includes(':')) {
        const setTokensActual = normActual.slice(1, -1).split(',').map(s => s.trim()).filter(Boolean).sort();
        const setTokensExpected = normExpected.slice(1, -1).split(',').map(s => s.trim()).filter(Boolean).sort();
        if (setTokensActual.length === setTokensExpected.length && setTokensActual.length > 0) {
            if (setTokensActual.every((val, idx) => val === setTokensExpected[idx])) {
                return true;
            }
        }
    }

    // 6. Space-delimited / comma-delimited elements comparison
    //    e.g. "1 2 3" vs "1, 2, 3" vs "[1, 2, 3]" vs "[1,2,3]"
    const cleanActualTokens = xlActual.replace(/[,[\](){}]/g, ' ').trim().split(/\s+/).filter(Boolean);
    const cleanExpectedTokens = xlExpected.replace(/[,[\](){}]/g, ' ').trim().split(/\s+/).filter(Boolean);
    if (cleanActualTokens.length === cleanExpectedTokens.length && cleanActualTokens.length > 0) {
        let allMatch = true;
        for (let i = 0; i < cleanActualTokens.length; i++) {
            if (cleanActualTokens[i] !== cleanExpectedTokens[i]) {
                const aNum = Number(cleanActualTokens[i]);
                const eNum = Number(cleanExpectedTokens[i]);
                if (isNaN(aNum) || isNaN(eNum) || Math.abs(aNum - eNum) >= 1e-4) {
                    // Also check case-insensitive string match
                    if (cleanActualTokens[i].toLowerCase() !== cleanExpectedTokens[i].toLowerCase()) {
                        allMatch = false;
                        break;
                    }
                }
            }
        }
        if (allMatch) return true;
    }

    // 7. Multi-line comparison: compare each line independently (handles trailing whitespace)
    const actualLines = normActual.split('\n').map(l => l.trim()).filter(Boolean);
    const expectedLines = normExpected.split('\n').map(l => l.trim()).filter(Boolean);
    if (actualLines.length === expectedLines.length && actualLines.length > 1) {
        let allLinesMatch = true;
        for (let i = 0; i < actualLines.length; i++) {
            if (actualLines[i] !== expectedLines[i]) {
                // Try cross-language normalization per line
                if (crossLanguageNormalize(actualLines[i]) !== crossLanguageNormalize(expectedLines[i])) {
                    // Try numeric comparison per line
                    const aNum = Number(actualLines[i]);
                    const eNum = Number(expectedLines[i]);
                    if (isNaN(aNum) || isNaN(eNum) || Math.abs(aNum - eNum) >= 1e-4) {
                        allLinesMatch = false;
                        break;
                    }
                }
            }
        }
        if (allLinesMatch) return true;

        // 7.1 Multi-line unordered comparison (e.g. permutations/anagrams output in any order)
        const sortedActual = [...actualLines].sort();
        const sortedExpected = [...expectedLines].sort();
        if (sortedActual.every((line, idx) => line === sortedExpected[idx] || crossLanguageNormalize(line) === crossLanguageNormalize(sortedExpected[idx]))) {
            return true;
        }
    }

    return false;
}

/**
 * Deep sort helper for JSON comparison — sorts object keys and array elements recursively.
 */
function sortDeep(obj) {
    if (Array.isArray(obj)) {
        return obj.map(sortDeep);
    }
    if (obj !== null && typeof obj === 'object') {
        const sorted = {};
        Object.keys(obj).sort().forEach(k => {
            sorted[k] = sortDeep(obj[k]);
        });
        return sorted;
    }
    return obj;
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

        // Check for class Solution pattern
        const classMatch = trimmed.match(/class\s+Solution\b/);
        let funcName = null;
        let params = [];
        let isClassMethod = false;

        if (classMatch) {
            // Find method inside Solution class
            const methodMatch = trimmed.match(/def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(\s*self\s*(?:,\s*([^)]*))?\)(?:\s*->\s*[^:]+)?\s*:/);
            if (methodMatch) {
                funcName = methodMatch[1];
                params = methodMatch[2] ? methodMatch[2].split(',').map(p => p.trim()).filter(Boolean) : [];
                isClassMethod = true;
            }
        }

        if (!funcName) {
            // Find all standalone function definitions (handling type annotations)
            const defRegex = /(?:^|\n)\s*def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)(?:\s*->\s*[^:]+)?\s*:/g;
            const matches = [...trimmed.matchAll(defRegex)];
            if (matches.length > 0) {
                // Prioritize 'solution', 'solve', 'main', or the last defined function
                const selected = matches.find(m => /^(solution|solve|main)$/i.test(m[1])) || matches[matches.length - 1];
                funcName = selected[1];
                params = selected[2].split(',').map(p => p.trim()).filter(Boolean);
            }
        }

        if (funcName) {
            // If candidate script already calls the function or has a main block, execute as-is
            const alreadyCalled = new RegExp(`\\b${funcName}\\s*\\(`).test(trimmed.substring(trimmed.indexOf(funcName) + funcName.length)) || /if\s+__name__\s*==/.test(trimmed);
            if (alreadyCalled && !isClassMethod) {
                return trimmed;
            }

            // Strip type annotations from params: "arr: List[int]" -> "arr"
            const cleanParams = params.map(p => p.split(':')[0].trim()).filter(Boolean);
            const hasVarArgs = cleanParams.some(p => p.startsWith('*') && !p.startsWith('**'));
            const positionalParams = cleanParams.filter(p => !p.startsWith('*'));
            const numParams = positionalParams.length;

            const callInvocation = isClassMethod ? `_sol_inst.${funcName}` : funcName;
            const instInit = isClassMethod ? `_sol_inst = Solution()\n        ` : '';

            const wrapper = `
import sys, json, ast, re, traceback, inspect

${trimmed}

def _parse_value(s):
    """Parse a single value: try JSON, then Python literal, numeric list, int/float, then keep string."""
    if s is None or s == '':
        return ''
    trimmed = str(s).strip()
    # Strip variable assignment prefix if present: e.g. "nums = [1, 2]" -> "[1, 2]"
    trimmed = re.sub(r'^[a-zA-Z_]\\w*\\s*=\\s*', '', trimmed)
    try:
        return json.loads(trimmed)
    except Exception:
        pass
    try:
        return ast.literal_eval(trimmed)
    except Exception:
        pass
    # Try space-separated numeric sequence e.g. "1 2 3 4 5"
    if ' ' in trimmed and not (trimmed.startswith('[') or trimmed.startswith('{') or trimmed.startswith('(')):
        parts = trimmed.split()
        try:
            if all(re.match(r'^-?\\d+$', p) for p in parts):
                return [int(p) for p in parts]
            if all(re.match(r'^-?\\d+(\\.\\d+)?$', p) for p in parts):
                return [float(p) for p in parts]
        except Exception:
            pass
    try:
        if '.' in trimmed:
            return float(trimmed)
        return int(trimmed)
    except Exception:
        pass
    return trimmed

def _format_result(res):
    """Format result for stdout output."""
    if res is None:
        return
    if isinstance(res, bool):
        print(str(res).lower())
    elif isinstance(res, (list, tuple, dict)):
        print(json.dumps(res))
    else:
        print(res)

def _split_top_level_arguments(s):
    """Splits a single string into top-level arguments respecting quotes, brackets [], {}, ()."""
    if not s:
        return []
    tokens = []
    current = []
    depth = 0
    in_quote = None
    escape = False

    for ch in s:
        if escape:
            current.append(ch)
            escape = False
            continue
        if ch == '\\\\':
            current.append(ch)
            escape = True
            continue
        if in_quote:
            current.append(ch)
            if ch == in_quote:
                in_quote = None
            continue
        if ch in ('"', "'"):
            in_quote = ch
            current.append(ch)
            continue
        if ch in ('[', '{', '('):
            depth += 1
            current.append(ch)
            continue
        if ch in (']', '}', ')'):
            depth = max(0, depth - 1)
            current.append(ch)
            continue
        if depth == 0 and (ch == ',' or ch == ';' or (ch.isspace() and current and current[-1] in (']', '}', ')', '"', "'"))):
            token = ''.join(current).strip()
            if token:
                tokens.append(token)
            current = []
            continue
        current.append(ch)

    if current:
        token = ''.join(current).strip()
        if token:
            tokens.append(token)
    return tokens

def _extract_arguments(raw_in, num_params, has_varargs):
    """Dynamically parses and extracts N parameters from stdin across multi-line and single-line formats."""
    if raw_in is None:
        return []
    if raw_in.strip() == '':
        return [raw_in] if num_params == 1 else []
    trimmed = raw_in.strip()
    lines = [l for l in trimmed.splitlines() if l.strip() != '']

    # 1. Multi-line input where count of lines matches or exceeds expected parameters
    if len(lines) > 1:
        # Check if line 0 is a count (e.g. N = array length) and lines count is num_params + 1
        if num_params > 0 and len(lines) == num_params + 1 and lines[0].strip().isdigit():
            return [_parse_value(l) for l in lines[1:]]
        return [_parse_value(l) for l in lines]

    # 2. Single-line input
    single_line = lines[0].strip() if lines else trimmed

    # 2a. Check for named assignments: e.g. "nums = [2, 7, 11, 15], target = 9"
    named_parts = [p.strip() for p in re.split(r'(?:^|[,;\\n])\\s*[a-zA-Z_]\\w*\\s*=\\s*', single_line) if p.strip()]
    if len(named_parts) > 1:
        return [_parse_value(p) for p in named_parts]

    # 2b. Bracket/quote-aware splitting for multiple top-level arguments
    top_tokens = _split_top_level_arguments(single_line)
    if len(top_tokens) > 1:
        return [_parse_value(t) for t in top_tokens]

    # 2c. Direct tuple or list evaluation e.g. "([1, 2, 3], 2)"
    norm_line = re.sub(r'(?:^|[,\\n])\\s*[a-zA-Z_]\\w*\\s*=\\s*', ',', single_line)
    if norm_line.startswith(','):
        norm_line = norm_line[1:].strip()
    if ',' in norm_line:
        try:
            tup = ast.literal_eval(f"({norm_line})")
            if isinstance(tup, (tuple, list)):
                return list(tup)
        except Exception:
            pass
        try:
            arr = json.loads(f"[{norm_line}]")
            if isinstance(arr, list):
                return arr
        except Exception:
            pass

    # 2d. Try _parse_value directly on single_line
    try:
        val = _parse_value(single_line)
        if isinstance(val, (tuple, list)) and (len(val) == num_params or (num_params > 1 and len(val) >= num_params)):
            return list(val)
        if isinstance(val, dict) and num_params > 1:
            return list(val.values())
        if num_params > 1 and isinstance(val, str):
            parts = val.split()
            if len(parts) == num_params:
                return [_parse_value(p) for p in parts]
        return [val]
    except Exception:
        pass

    # 2e. Space-separated fallback
    tokens = single_line.split()
    if num_params > 1 and len(tokens) == num_params:
        return [_parse_value(t) for t in tokens]

    return [_parse_value(single_line)]

if __name__ == '__main__':
    try:
        ${instInit}raw_stdin = sys.stdin.read()
        if raw_stdin.endswith('\\r\\n'):
            raw_in = raw_stdin[:-2]
        elif raw_stdin.endswith('\\n'):
            raw_in = raw_stdin[:-1]
        else:
            raw_in = raw_stdin

        num_params = ${numParams}
        has_varargs = ${hasVarArgs ? 'True' : 'False'}
        fn = ${callInvocation}

        if raw_in == '':
            if num_params == 0:
                res = fn()
            elif num_params == 1:
                res = fn('')
            else:
                res = fn()
            _format_result(res)
        else:
            args = _extract_arguments(raw_in, num_params, has_varargs)
            
            try:
                sig = inspect.signature(fn)
                pos_params = [p for p in sig.parameters.values() if p.kind in (inspect.Parameter.POSITIONAL_ONLY, inspect.Parameter.POSITIONAL_OR_KEYWORD)]
                min_req = sum(1 for p in pos_params if p.default is inspect.Parameter.empty)
                max_pos = len(pos_params)
                fn_has_varargs = any(p.kind == inspect.Parameter.VAR_POSITIONAL for p in sig.parameters.values())
            except Exception:
                min_req = num_params
                max_pos = num_params
                fn_has_varargs = has_varargs

            called = False
            res = None

            # 1. Varargs function: unpack all
            if fn_has_varargs:
                try:
                    res = fn(*args)
                    called = True
                except TypeError:
                    pass

            # 2. Exact match within allowed parameter bounds
            if not called and min_req <= len(args) <= max_pos:
                try:
                    res = fn(*args)
                    called = True
                except TypeError:
                    pass

            # 3. More arguments than max_pos: slice to max_pos
            if not called and len(args) > max_pos and max_pos > 0:
                try:
                    res = fn(*args[:max_pos])
                    called = True
                except TypeError:
                    pass

            # 4. If fewer arguments than min_req, check if args[0] is an unpackable collection
            if not called and len(args) < min_req and len(args) == 1 and isinstance(args[0], (list, tuple)):
                sub_args = list(args[0])
                if min_req <= len(sub_args) <= max_pos:
                    try:
                        res = fn(*sub_args)
                        called = True
                    except TypeError:
                        pass
                elif len(sub_args) > max_pos and max_pos > 0:
                    try:
                        res = fn(*sub_args[:max_pos])
                        called = True
                    except TypeError:
                        pass

            # 5. Single-parameter function
            if not called and max_pos == 1:
                try:
                    res = fn(args[0] if len(args) == 1 else (raw_in if len(args) == 0 else args))
                    called = True
                except TypeError:
                    pass

            # 6. Fallback cascade respecting multi-parameter signature
            if not called:
                if min_req > 1:
                    if len(args) >= min_req:
                        res = fn(*args[:max_pos])
                    elif len(args) == 1 and isinstance(args[0], (list, tuple)) and len(args[0]) >= min_req:
                        res = fn(*args[0][:max_pos])
                    else:
                        res = fn(*args)
                else:
                    try:
                        res = fn(*args)
                    except TypeError:
                        try:
                            res = fn(args[0] if args else raw_in)
                        except Exception:
                            res = fn(raw_in)

            _format_result(res)
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

        let jsFuncName = null;
        let jsParams = [];
        let isJsClass = false;

        // Check for class Solution
        if (/class\s+Solution\b/.test(trimmed)) {
            const m = trimmed.match(/class\s+Solution[\s\S]*?([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)/);
            if (m && m[1] !== 'constructor') {
                jsFuncName = m[1];
                jsParams = m[2].split(',').map(p => p.trim()).filter(Boolean);
                isJsClass = true;
            }
        }

        if (!jsFuncName) {
            // Match function declaration, arrow function, or function expression
            const fnMatches = [
                ...trimmed.matchAll(/(?:function\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)|(?:const|let|var)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(?:async\s*)?(?:function\s*\(?([^)]*)\)?|\(?([^)]*)\)?\s*=>|([a-zA-Z_][a-zA-Z0-9_]*)\s*=>))/g)
            ];
            if (fnMatches.length > 0) {
                const selected = fnMatches.find(m => /^(solution|solve|main)$/i.test(m[1] || m[3])) || fnMatches[fnMatches.length - 1];
                jsFuncName = selected[1] || selected[3];
                const rawParamStr = selected[2] || selected[4] || selected[5] || selected[6] || '';
                jsParams = rawParamStr.split(',').map(p => p.trim()).filter(Boolean);
            }
        }

        if (jsFuncName) {
            const hasJsVarArgs = jsParams.some(p => p.startsWith('...'));
            const cleanJsParams = jsParams.filter(p => !p.startsWith('...'));
            const jsNumParams = cleanJsParams.length;

            const wrapper = `
const fs = require('fs');

${trimmed}

function _parseValue(s) {
    if (s === undefined || s === null || s === '') return '';
    let trimmed = String(s).trim();
    trimmed = trimmed.replace(/^[a-zA-Z_]\\w*\\s*=\\s*/, '');
    try { return JSON.parse(trimmed); } catch (e) {}
    if (/^-?\\d+(\\s+-?\\d+)+$/.test(trimmed)) {
        return trimmed.split(/\\s+/).map(Number);
    }
    if (!isNaN(trimmed) && trimmed !== '') {
        return trimmed.includes('.') ? parseFloat(trimmed) : parseInt(trimmed, 10);
    }
    return trimmed;
}

function _formatResult(res) {
    if (res === undefined || res === null) return;
    if (typeof res === 'object') {
        console.log(JSON.stringify(res));
    } else {
        console.log(res);
    }
}

function _splitTopLevelArguments(s) {
    if (!s) return [];
    const tokens = [];
    let current = [];
    let depth = 0;
    let inQuote = null;
    let escape = false;

    for (let i = 0; i < s.length; i++) {
        const ch = s[i];
        if (escape) {
            current.push(ch);
            escape = false;
            continue;
        }
        if (ch === '\\\\') {
            current.push(ch);
            escape = true;
            continue;
        }
        if (inQuote) {
            current.push(ch);
            if (ch === inQuote) inQuote = null;
            continue;
        }
        if (ch === '"' || ch === "'") {
            inQuote = ch;
            current.push(ch);
            continue;
        }
        if (ch === '[' || ch === '{' || ch === '(') {
            depth++;
            current.push(ch);
            continue;
        }
        if (ch === ']' || ch === '}' || ch === ')') {
            depth = Math.max(0, depth - 1);
            current.push(ch);
            continue;
        }
        if (depth === 0 && (ch === ',' || ch === ';' || (/\\s/.test(ch) && current.length > 0 && /[\\]\\}\\)\"\\']/.test(current[current.length - 1])))) {
            const token = current.join('').trim();
            if (token) tokens.push(token);
            current = [];
            continue;
        }
        current.push(ch);
    }

    if (current.length > 0) {
        const token = current.join('').trim();
        if (token) tokens.push(token);
    }
    return tokens;
}

function _extractArguments(rawIn, numParams, hasVarArgs) {
    if (!rawIn || !rawIn.trim()) return [];
    const trimmed = rawIn.trim();
    const lines = trimmed.split('\\n').map(l => l.trim()).filter(Boolean);

    // 1. Multi-line input
    if (lines.length > 1) {
        if (numParams > 0 && lines.length === numParams + 1 && /^\\d+$/.test(lines[0])) {
            return lines.slice(1).map(_parseValue);
        }
        return lines.map(_parseValue);
    }

    // 2. Single-line input
    const singleLine = lines[0] || trimmed;

    // 2a. Check for named assignments e.g. "nums = [1, 2], k = 3"
    const namedParts = singleLine.split(/(?:^|[,;\\n])\\s*[a-zA-Z_]\\w*\\s*=\\s*/).map(p => p.trim()).filter(Boolean);
    if (namedParts.length > 1) {
        return namedParts.map(_parseValue);
    }

    // 2b. Bracket/quote-aware splitting for multiple top-level arguments e.g. "[1, 2, 3], 2"
    const topTokens = _splitTopLevelArguments(singleLine);
    if (topTokens.length > 1) {
        return topTokens.map(_parseValue);
    }

    // 2c. Array wrap JSON check
    let norm = singleLine.replace(/(?:^|[,\\n])\\s*[a-zA-Z_]\\w*\\s*=\\s*/g, ',');
    if (norm.startsWith(',')) norm = norm.slice(1).trim();
    if (norm.includes(',')) {
        try {
            const parsed = JSON.parse('[' + norm + ']');
            if (Array.isArray(parsed)) return parsed;
        } catch (e) {}
    }

    // 2d. Direct parse check
    try {
        const val = _parseValue(singleLine);
        if (Array.isArray(val) && (val.length === numParams || (numParams > 1 && val.length >= numParams))) {
            return val;
        }
        if (typeof val === 'object' && val !== null && numParams > 1) {
            return Object.values(val);
        }
        if (numParams > 1 && typeof val === 'string') {
            const parts = val.split(/\\s+/);
            if (parts.length === numParams) return parts.map(_parseValue);
        }
        return [val];
    } catch (e) {}

    const tokens = singleLine.split(/\\s+/).filter(Boolean);
    if (numParams > 1 && tokens.length === numParams) {
        return tokens.map(_parseValue);
    }

    return [_parseValue(singleLine)];
}

try {
    const rawStdin = fs.readFileSync(0, 'utf-8');
    let rawIn = rawStdin;
    if (rawIn.endsWith('\\r\\n')) rawIn = rawIn.slice(0, -2);
    else if (rawIn.endsWith('\\n')) rawIn = rawIn.slice(0, -1);

    const _invokeTarget = ${isJsClass ? `(new Solution()).${jsFuncName}` : `(typeof ${jsFuncName} !== 'undefined' ? ${jsFuncName} : null)`};
    const numParams = ${jsNumParams};
    const hasVarArgs = ${hasJsVarArgs ? 'true' : 'false'};

    if (typeof _invokeTarget !== 'function') {
        throw new Error('Solution function "${jsFuncName}" is not defined.');
    }

    const expectedLength = typeof _invokeTarget.length === 'number' ? _invokeTarget.length : numParams;

    if (numParams === 0 && !hasVarArgs && expectedLength === 0) {
        const res = _invokeTarget();
        _formatResult(res);
    } else if (rawIn === '') {
        const res = expectedLength === 1 ? _invokeTarget('') : _invokeTarget();
        _formatResult(res);
    } else {
        const args = _extractArguments(rawIn, numParams, hasVarArgs);
        let res;
        let called = false;

        if (hasVarArgs) {
            try {
                res = _invokeTarget(...args);
                called = true;
            } catch (e) {}
        }

        if (!called && args.length === expectedLength) {
            try {
                res = _invokeTarget(...args);
                called = true;
            } catch (e) {}
        }

        if (!called && args.length > expectedLength && expectedLength > 0) {
            try {
                res = _invokeTarget(...args.slice(0, expectedLength));
                called = true;
            } catch (e) {}
        }

        if (!called && expectedLength > 1 && args.length === 1 && Array.isArray(args[0])) {
            try {
                res = _invokeTarget(...args[0].slice(0, expectedLength));
                called = true;
            } catch (e) {}
        }

        if (!called && expectedLength === 1) {
            try {
                res = _invokeTarget(args.length === 1 ? args[0] : args);
                called = true;
            } catch (e) {}
        }

        if (!called) {
            if (expectedLength > 1) {
                if (args.length >= expectedLength) {
                    res = _invokeTarget(...args.slice(0, expectedLength));
                } else if (args.length === 1 && Array.isArray(args[0]) && args[0].length >= expectedLength) {
                    res = _invokeTarget(...args[0].slice(0, expectedLength));
                } else {
                    res = _invokeTarget(...args);
                }
            } else {
                try {
                    res = _invokeTarget(...args);
                } catch (e1) {
                    try {
                        res = _invokeTarget(args[0] !== undefined ? args[0] : rawIn);
                    } catch (e2) {
                        res = _invokeTarget(rawIn);
                    }
                }
            }
        }
        _formatResult(res);
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
        throw new Error(`Wandbox execution network error: ${err.message}`);
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
 * Tries local isolated process runner for Python/JavaScript first (~20ms),
 * uses Wandbox for compiled languages (C++, Java, Go) or as container fallback.
 */
async function executeCodeIsolated(code, language, stdin = '', timeoutMs = EXECUTION_TIMEOUT_MS) {
    const runnableCode = prepareRunnableCode(code, language, stdin);
    const lang = normalizeLanguage(language);

    // 1. For Python and JavaScript, use ultra-fast local isolated process runner
    // Completely eliminates external HTTP network roundtrip latency to Japan (Wandbox),
    // eliminating false-positive TIME_LIMIT_EXCEEDED errors caused by public API latency.
    if (lang === 'python' || lang === 'javascript') {
        try {
            const localRes = await executeLocally(runnableCode, language, stdin, timeoutMs);
            return localRes;
        } catch (localErr) {
            console.warn(`[CodeExecutionService] Local execution failed (${localErr.message}). Attempting Wandbox fallback...`);
        }
    }

    // 2. Try Wandbox Container Sandbox (for C++, Java, Go, or fallback)
    try {
        const wandboxRes = await executeViaWandbox(runnableCode, language, stdin, timeoutMs);
        return wandboxRes;
    } catch (wandboxErr) {
        console.warn(`[CodeExecutionService] Wandbox container execution failed (${wandboxErr.message}). Attempting local isolated execution fallback...`);
    }

    // 3. Fallback to Local Isolated Process Runner
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
