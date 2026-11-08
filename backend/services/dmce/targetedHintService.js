/**
 * Hire1Percent — Targeted Constraint Adaptation Hint Service
 * 
 * Generates surgical, line-level hints for candidates facing active mutation constraints.
 * 
 * Rules:
 * 1. NEVER reveals the full solution or replacement logic.
 * 2. Identifies the specific line number or data structure causing the constraint violation
 *    (e.g., 2D matrix allocation, full array buffering, un-streamed recursion).
 * 3. Provides concise architectural direction (e.g. rolling variables, iterator, in-place update).
 * 4. Combines deterministic AST/regex analysis with Gemini 2.5 Flash refinement.
 */

const { callGemini, safeParseAIJson } = require('../../utils/aiClients');

/**
 * Deterministic bottleneck detector across common algorithmic patterns.
 */
function detectBottleneckLine(code = '', language = 'python', constraintType = 'MEMORY_LIMIT') {
    if (!code || typeof code !== 'string') {
        return null;
    }

    const lines = code.split('\n');

    // 1. Python 2D Matrix / Table allocation (dp = [[0]*n for _ in range(n)])
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (/\[\s*\[\s*0\s*\]\s*\*\s*\w+\s+for\s+\w+\s+in\s+range\(/i.test(line) ||
            /\[\s*\[.*?\]\s*\*\s*\w+/i.test(line) ||
            /\b(dp|table|matrix|memo)\s*=\s*\[\s*\[/i.test(line)) {
            return {
                targetLineNumber: i + 1,
                targetCodeSnippet: line.trim(),
                hintTitle: '2D Auxiliary Matrix Memory Breach',
                hintText: `Line ${i + 1} allocates an O(N^2) 2D table which exceeds the clamped runtime heap under scale. Adapt this allocation to use rolling variables, a 1D array, or an in-place iterator.`
            };
        }
    }

    // 2. Full Array Replication / list(...) buffering
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (/list\(map\(|\.copy\(\)|\[\:\].*copy|new Array\(/i.test(line) && !line.includes('input().split()')) {
            return {
                targetLineNumber: i + 1,
                targetCodeSnippet: line.trim(),
                hintTitle: 'Full Dataset Memory Buffering',
                hintText: `Line ${i + 1} duplicates data into auxiliary RAM. Adapt this line to stream or iterate through items in-place without buffering full arrays.`
            };
        }
    }

    // 3. Fallback: Identify the primary state or DP table initialization
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (/\b(dp|memo|cache|seen|visited)\s*=\s*(\[|\{)/i.test(line)) {
            return {
                targetLineNumber: i + 1,
                targetCodeSnippet: line.trim(),
                hintTitle: 'State Collection Allocation',
                hintText: `Line ${i + 1} stores auxiliary state in memory. Adapt this collection to operate in-place with O(1) auxiliary space to comply with the clamped heap limit.`
            };
        }
    }

    // Default to the first function body statement
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('def ') || line.startsWith('function ')) {
            const nextIdx = i + 1 < lines.length ? i + 1 : i;
            return {
                targetLineNumber: nextIdx + 1,
                targetCodeSnippet: lines[nextIdx].trim(),
                hintTitle: 'Constraint Optimization Target',
                hintText: `Examine the auxiliary data structures initialized at line ${nextIdx + 1}. Adapt memory usage to process inputs iteratively in-place.`
            };
        }
    }

    return {
        targetLineNumber: 1,
        targetCodeSnippet: lines[0] ? lines[0].trim() : '',
        hintTitle: 'Resource Constraint Adaptation',
        hintText: 'Avoid allocating auxiliary collections sized proportional to N. Process data using in-place pointers or generators.'
    };
}

/**
 * Generates an intelligent, targeted line hint using Gemini with deterministic fallback.
 */
async function generateTargetedHint({
    code = '',
    language = 'python',
    activeConstraint = null,
    questionTitle = '',
    questionDescription = ''
}) {
    // 1. Generate deterministic fallback hint first
    const deterministicHint = detectBottleneckLine(code, language, activeConstraint?.type || 'MEMORY_LIMIT');

    if (!code || !code.trim()) {
        return deterministicHint;
    }

    const memoryLimitMb = activeConstraint?.resourceConstraints?.memoryLimitMb || 14;
    const systemPrompt = `You are a surgical technical interview assistant.
The candidate passed Stage 1, but their code now fails under a newly mutated runtime constraint (e.g. Memory clamped to ${memoryLimitMb} MB, O(1) in-place requirement).

CRITICAL CONSTRAINTS:
1. NEVER output the solved code, replacement syntax, or full logic.
2. Identify the single line number in candidate code where memory or computational scaling breaks the active constraint.
3. Provide ONLY a concise architectural hint explaining WHICH line needs to change and WHAT adaptation strategy to consider (e.g., rolling variables, streaming iterator, in-place swap).
4. Output STRICT, VALID JSON ONLY conforming to the schema.`;

    const userPrompt = `QUESTION:
Title: ${questionTitle || 'Coding Challenge'}
Constraint Imposed: Memory clamped to ${memoryLimitMb} MB, Auxiliary Space O(1) In-Place / Streaming.

CANDIDATE STAGE-1 CODE (with line numbers):
${code.split('\n').map((l, i) => `${i + 1}: ${l}`).join('\n')}

Identify the single line that creates the memory bottleneck under this constraint, and formulate a targeted hint without giving away the full answer.

JSON SCHEMA:
{
  "targetLineNumber": <number>,
  "targetCodeSnippet": "<string>",
  "hintTitle": "<short title>",
  "hintText": "<concise hint explaining what to adapt at this line without giving solution code>"
}`;

    try {
        const raw = await callGemini(userPrompt, 800, true, systemPrompt, 0.2);
        const parsed = safeParseAIJson(raw);
        if (parsed && typeof parsed.targetLineNumber === 'number' && parsed.hintText) {
            return {
                targetLineNumber: Math.max(1, Math.min(code.split('\n').length, parsed.targetLineNumber)),
                targetCodeSnippet: String(parsed.targetCodeSnippet || deterministicHint.targetCodeSnippet),
                hintTitle: String(parsed.hintTitle || deterministicHint.hintTitle),
                hintText: String(parsed.hintText)
            };
        }
    } catch (err) {
        // Fall back gracefully to deterministic analysis
    }

    return deterministicHint;
}

module.exports = {
    detectBottleneckLine,
    generateTargetedHint
};
