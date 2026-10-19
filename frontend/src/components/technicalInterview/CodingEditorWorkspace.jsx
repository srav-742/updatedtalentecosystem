import React, { useState, useEffect, useRef } from 'react';
import { Play, RotateCcw, CheckCircle, XCircle, Terminal, Loader2, Send, Code2, AlertTriangle, Clock } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../../firebase';

const STARTER_BOILERPLATES = {
    python: `import json, sys

def solution(input_data):
    # TODO: Write your algorithm here
    pass

if __name__ == '__main__':
    raw = sys.stdin.read().strip()
    if raw:
        # Parse inputs and print result
        print(raw)
`,
    javascript: `const fs = require('fs');

function solution(inputData) {
    // TODO: Write your algorithm here
}

const input = fs.readFileSync(0, 'utf-8').trim();
if (input) {
    console.log(solution(input));
}
`,
    cpp: `#include <iostream>
#include <string>

using namespace std;

int main() {
    // TODO: Write your solution here
    string input;
    while (getline(cin, input)) {
        cout << input << endl;
    }
    return 0;
}
`,
    java: `import java.util.*;

public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        // TODO: Write your solution here
    }
}
`,
    go: `package main

import (
    "fmt"
    "io"
    "os"
)

func main() {
    input, _ := io.ReadAll(os.Stdin)
    // TODO: Write your solution here
    fmt.Println(string(input))
}
`
};

const sanitizeStarterCode = (rawCode, lang = 'python') => {
    if (!rawCode || typeof rawCode !== 'string') return '';

    // If it contains Two Sum pre-solved lookup code:
    if (rawCode.includes('lookup =') || (rawCode.includes('def two_sum') && rawCode.includes('complement ='))) {
        if (lang === 'python') {
            return `import json, sys

def two_sum(nums, target):
    # TODO: Write your algorithm here
    # Return [index1, index2] such that nums[index1] + nums[index2] == target
    pass

if __name__ == '__main__':
    raw = sys.stdin.read().splitlines()
    if raw:
        nums = json.loads(raw[0].strip())
        target = int(raw[1].strip())
        res = two_sum(nums, target)
        print(json.dumps(res if res is not None else []))
`;
        }
        if (lang === 'javascript') {
            return `const fs = require('fs');

function twoSum(nums, target) {
    // TODO: Write your algorithm here
    // Return [index1, index2]
    return [];
}

const lines = fs.readFileSync(0, 'utf-8').trim().split('\\n');
if (lines.length >= 2) {
    const nums = JSON.parse(lines[0].trim());
    const target = parseInt(lines[1].trim(), 10);
    console.log(JSON.stringify(twoSum(nums, target) || []));
}
`;
        }
    }

    // If it contains Palindrome solution
    if (rawCode.includes('filtered == filtered[::-1]') || rawCode.includes('clean.split')) {
        if (lang === 'python') {
            return `import sys

def is_palindrome(s):
    # TODO: Write your algorithm here
    # Return True if s is a palindrome, False otherwise
    pass

if __name__ == '__main__':
    raw = sys.stdin.read().strip()
    result = is_palindrome(raw)
    print("true" if result else "false")
`;
        }
        if (lang === 'javascript') {
            return `const fs = require('fs');

function isPalindrome(s) {
    // TODO: Write your algorithm here
    return false;
}

const input = fs.readFileSync(0, 'utf-8').trim();
console.log(isPalindrome(input) ? "true" : "false");
`;
        }
    }

    // If it contains Deduplication bug-free solution
    if (rawCode.includes('seen = set()') || rawCode.includes('new Set()')) {
        if (lang === 'python') {
            return `import json, sys

def remove_duplicates(nums):
    # BUGGY CODE TO FIX:
    # Candidate: modify this function so it returns unique elements preserving first-seen order.
    unique = []
    for i in range(len(nums)):
        if i == len(nums) - 1 or nums[i] != nums[i + 1]:
            unique.append(nums[i])
    return unique

if __name__ == '__main__':
    raw = sys.stdin.read().strip()
    if raw:
        arr = json.loads(raw)
        print(json.dumps(remove_duplicates(arr)))
`;
        }
        if (lang === 'javascript') {
            return `const fs = require('fs');

function removeDuplicates(nums) {
    // BUGGY CODE TO FIX:
    // Candidate: modify this function so it returns unique elements preserving first-seen order.
    const unique = [];
    for (let i = 0; i < nums.length; i++) {
        if (nums[i] !== nums[i + 1]) {
            unique.push(nums[i]);
        }
    }
    return unique;
}

const line = fs.readFileSync(0, 'utf-8').trim();
if (line) {
    const arr = JSON.parse(line);
    console.log(JSON.stringify(removeDuplicates(arr)));
}
`;
        }
    }

    // Generic solution-stripper for Python:
    if (lang === 'python' && rawCode.includes('def ') && rawCode.includes("if __name__ == '__main__':")) {
        const parts = rawCode.split("if __name__ == '__main__':");
        const funcPart = parts[0];
        const mainPart = parts[1];
        if ((funcPart.includes('for ') || funcPart.includes('while ')) && !funcPart.includes('BUGGY CODE TO FIX')) {
            const lines = funcPart.split('\n');
            const defLineIdx = lines.findIndex(l => l.trim().startsWith('def '));
            if (defLineIdx !== -1) {
                const header = lines.slice(0, defLineIdx + 1).join('\n');
                return `${header}\n    # TODO: Write your algorithm here\n    pass\n\nif __name__ == '__main__':${mainPart}`;
            }
        }
    }

    return rawCode;
};

const CodingEditorWorkspace = ({
    sessionId,
    problem,
    onSolutionSubmitted,
    initialLanguage = 'python'
}) => {
    const [language, setLanguage] = useState(initialLanguage);
    const [code, setCode] = useState('');
    const [running, setRunning] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [testResults, setTestResults] = useState(null);
    const [activeTab, setActiveTab] = useState(0);
    const [consoleOpen, setConsoleOpen] = useState(true);
    const [errorNotice, setErrorNotice] = useState(null);
    const textareaRef = useRef(null);

    const initializedProblemIdRef = useRef(null);

    // Initialize starter code ONLY when problem first loads or changes
    useEffect(() => {
        const problemKey = problem?.id || problem?.title;
        if (!problemKey) return;

        if (initializedProblemIdRef.current !== problemKey) {
            initializedProblemIdRef.current = problemKey;
            let rawStarter = '';
            if (problem?.starterCode?.[language]) {
                rawStarter = problem.starterCode[language];
            } else if (problem?.starterCode?.python && language === 'python') {
                rawStarter = problem.starterCode.python;
            } else {
                rawStarter = STARTER_BOILERPLATES[language] || STARTER_BOILERPLATES.python;
            }
            setCode(sanitizeStarterCode(rawStarter, language));
        }
    }, [problem?.id, problem?.title, language]);

    const handleLanguageChange = (newLang) => {
        setLanguage(newLang);
        let rawStarter = '';
        if (problem?.starterCode?.[newLang]) {
            rawStarter = problem.starterCode[newLang];
        } else {
            rawStarter = STARTER_BOILERPLATES[newLang] || STARTER_BOILERPLATES.python;
        }
        setCode(sanitizeStarterCode(rawStarter, newLang));
    };

    const handleReset = () => {
        if (window.confirm('Reset code editor to starter template? Any unsaved edits will be cleared.')) {
            let rawStarter = '';
            if (problem?.starterCode?.[language]) {
                rawStarter = problem.starterCode[language];
            } else {
                rawStarter = STARTER_BOILERPLATES[language] || STARTER_BOILERPLATES.python;
            }
            setCode(sanitizeStarterCode(rawStarter, language));
        }
    };

    // Support Tab key indentation in textarea
    const handleKeyDown = (e) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            const start = e.target.selectionStart;
            const end = e.target.selectionEnd;
            const val = e.target.value;
            const updated = val.substring(0, start) + '    ' + val.substring(end);
            setCode(updated);
            setTimeout(() => {
                if (textareaRef.current) {
                    textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 4;
                }
            }, 0);
        }
    };

    const handleRunCode = async () => {
        if (running || submitting) return;
        setRunning(true);
        setErrorNotice(null);
        setConsoleOpen(true);

        try {
            const res = await axios.post(`${API_URL}/interview/technical/run-code`, {
                sessionId,
                code,
                language
            });
            if (res.data?.success && res.data?.results) {
                setTestResults(res.data.results);
                setActiveTab(0);
            } else {
                setErrorNotice(res.data?.message || 'Execution failed to return valid results.');
            }
        } catch (err) {
            console.error('[TECH-WORKSPACE] Run code error:', err);
            setErrorNotice(err.response?.data?.message || err.message || 'Execution server error.');
        } finally {
            setRunning(false);
        }
    };

    const handleSubmitSolution = async () => {
        if (running || submitting) return;
        if (!code || code.trim().length < 15) {
            setErrorNotice('Please write an implementation before submitting.');
            return;
        }

        setSubmitting(true);
        setErrorNotice(null);

        try {
            const res = await axios.post(`${API_URL}/interview/technical/submit-solution`, {
                sessionId,
                code,
                language
            });

            if (res.data?.success) {
                onSolutionSubmitted?.({
                    code,
                    language,
                    testResults: res.data.testResults,
                    followUpQuestion: res.data.followUpQuestion
                });
            } else {
                setErrorNotice(res.data?.message || 'Submission failed.');
            }
        } catch (err) {
            console.error('[TECH-WORKSPACE] Submit solution error:', err);
            setErrorNotice(err.response?.data?.message || err.message || 'Submission failed.');
        } finally {
            setSubmitting(false);
        }
    };

    // Calculate line numbers
    const lines = (code || '').split('\n');

    return (
        <div className="h-full flex flex-col bg-[#05080f] overflow-hidden">
            {/* Editor Top Bar */}
            <div className="px-5 py-2.5 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <Code2 size={16} className="text-teal-400" />
                        <span className="font-mono text-xs text-gray-300">
                            solution.{language === 'python' ? 'py' : language === 'javascript' ? 'js' : language === 'cpp' ? 'cpp' : language === 'java' ? 'java' : 'go'}
                        </span>
                    </div>

                    <div className="flex items-center gap-1.5 ml-2">
                        <label className="text-[11px] text-gray-400 font-medium">Language:</label>
                        <select
                            value={language}
                            onChange={(e) => handleLanguageChange(e.target.value)}
                            disabled={running || submitting}
                            className="bg-[#0d1117] text-white border border-[#30363d] rounded-lg px-2.5 py-1 text-xs outline-none focus:border-teal-500 transition-colors cursor-pointer"
                        >
                            <option value="python">Python 3</option>
                            <option value="javascript">JavaScript (Node.js)</option>
                            <option value="cpp">C++ (GCC 13)</option>
                            <option value="java">Java (JDK 22)</option>
                            <option value="go">Go</option>
                        </select>
                    </div>
                </div>

                <div className="flex items-center gap-2.5">
                    <button
                        onClick={handleReset}
                        title="Reset code to starter template"
                        disabled={running || submitting}
                        className="px-2.5 py-1 text-xs text-gray-400 hover:text-white bg-[#0d1117] border border-[#30363d] rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                    >
                        <RotateCcw size={12} />
                        <span>Reset</span>
                    </button>

                    <button
                        onClick={handleRunCode}
                        disabled={running || submitting}
                        className="px-4 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
                    >
                        {running ? (
                            <>
                                <Loader2 size={13} className="animate-spin" />
                                <span>Running...</span>
                            </>
                        ) : (
                            <>
                                <Play size={13} fill="currentColor" />
                                <span>Run Code</span>
                            </>
                        )}
                    </button>

                    <button
                        onClick={handleSubmitSolution}
                        disabled={running || submitting}
                        className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
                    >
                        {submitting ? (
                            <>
                                <Loader2 size={13} className="animate-spin" />
                                <span>Submitting...</span>
                            </>
                        ) : (
                            <>
                                <Send size={13} />
                                <span>Submit Solution</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Error Notice */}
            {errorNotice && (
                <div className="px-5 py-2 bg-red-950/70 border-b border-red-800 text-red-300 text-xs flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                        <AlertTriangle size={14} className="text-red-400 shrink-0" />
                        {errorNotice}
                    </span>
                    <button onClick={() => setErrorNotice(null)} className="text-red-400 hover:text-white font-bold ml-4">✕</button>
                </div>
            )}

            {/* Code Editor Body with Line Numbers */}
            <div className="flex-1 flex overflow-hidden bg-[#05080f] relative font-mono text-sm leading-6">
                {/* Line Numbers Gutter */}
                <div className="w-12 bg-[#090d16] border-r border-[#1b2230] text-gray-600 select-none py-4 text-right pr-3 shrink-0 font-mono text-xs">
                    {lines.map((_, i) => (
                        <div key={i}>{i + 1}</div>
                    ))}
                </div>

                {/* Textarea */}
                <textarea
                    ref={textareaRef}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Write your code solution here..."
                    spellCheck={false}
                    className="flex-1 w-full h-full bg-[#05080f] text-emerald-300 p-4 font-mono text-sm leading-6 outline-none resize-none border-none overflow-y-auto custom-scrollbar focus:ring-0 selection:bg-teal-500/30 selection:text-white"
                />
            </div>

            {/* Test Results Console Panel */}
            {consoleOpen && (
                <div className="h-64 border-t border-[#30363d] bg-[#0d1117] flex flex-col shrink-0 overflow-hidden shadow-2xl">
                    {/* Console Header Bar */}
                    <div className="px-4 py-2 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
                                <Terminal size={14} className="text-teal-400" />
                                Execution Console
                            </span>

                            {running ? (
                                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-[11px] font-semibold">
                                    <Loader2 size={12} className="animate-spin" />
                                    <span>Running in sandbox...</span>
                                </div>
                            ) : testResults ? (() => {
                                const passed = testResults.passed || 0;
                                const total = testResults.total || 0;
                                const isAllPassed = total > 0 && passed === total;
                                return (
                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase border ${
                                        isAllPassed
                                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                            : passed > 0
                                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                                            : 'bg-red-500/10 border-red-500/30 text-red-400'
                                    }`}>
                                        {isAllPassed ? 'All Passed' : `${passed}/${total} Passed`}
                                    </span>
                                );
                            })() : (
                                <span className="text-[11px] text-gray-500">Ready to run code</span>
                            )}
                        </div>

                        <button
                            onClick={() => setConsoleOpen(!consoleOpen)}
                            className="text-xs text-gray-400 hover:text-white transition-colors"
                        >
                            {consoleOpen ? 'Collapse ▼' : 'Expand ▲'}
                        </button>
                    </div>

                    {/* Console Content */}
                    <div className="flex-1 flex overflow-hidden">
                        {testResults && testResults.results && testResults.results.length > 0 ? (
                            <>
                                {/* Test Case Selectors */}
                                <div className="w-40 border-r border-[#30363d] bg-[#090d16] overflow-y-auto p-2 space-y-1 shrink-0">
                                    {testResults.results.map((res, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setActiveTab(idx)}
                                            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-mono flex items-center justify-between transition-colors ${
                                                activeTab === idx
                                                    ? 'bg-[#1f2937] text-white border border-teal-500/40 shadow-xs'
                                                    : 'text-gray-400 hover:bg-[#161b22] hover:text-gray-200'
                                            }`}
                                        >
                                            <span>Test Case {idx + 1}</span>
                                            {res.passed ? (
                                                <CheckCircle size={13} className="text-emerald-400 shrink-0" />
                                            ) : (
                                                <XCircle size={13} className="text-red-400 shrink-0" />
                                            )}
                                        </button>
                                    ))}
                                </div>

                                {/* Active Test Detail */}
                                <div className="flex-1 p-4 overflow-y-auto font-mono text-xs space-y-3 custom-scrollbar">
                                    {(() => {
                                        const currentTc = testResults.results[activeTab] || testResults.results[0];
                                        return (
                                            <>
                                                <div className="flex items-center justify-between pb-2 border-b border-[#30363d]/50">
                                                    <span className="font-bold text-gray-300">Test Case {activeTab + 1} Result</span>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-[11px] text-gray-400 flex items-center gap-1 font-sans">
                                                            <Clock size={11} /> {currentTc.executionTime || 0}ms
                                                        </span>
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                                            currentTc.passed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                                                        }`}>
                                                            {currentTc.status || (currentTc.passed ? 'PASSED' : 'WRONG_ANSWER')}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div>
                                                    <span className="text-gray-500 text-[10px] uppercase font-bold tracking-wider font-sans block mb-1">Standard Input:</span>
                                                    <pre className="p-2 rounded bg-[#05080f] text-gray-300 border border-[#21262d] whitespace-pre-wrap">{currentTc.input || '(empty)'}</pre>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    <div>
                                                        <span className="text-gray-500 text-[10px] uppercase font-bold tracking-wider font-sans block mb-1">Expected Output:</span>
                                                        <pre className="p-2 rounded bg-[#05080f] text-teal-300 border border-[#21262d] whitespace-pre-wrap">{currentTc.expectedOutput || '(empty)'}</pre>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-500 text-[10px] uppercase font-bold tracking-wider font-sans block mb-1">Your Program Output:</span>
                                                        <pre className={`p-2 rounded bg-[#05080f] border whitespace-pre-wrap ${
                                                            currentTc.passed ? 'border-emerald-900/60 text-emerald-300' : 'border-red-900/60 text-red-300'
                                                        }`}>{currentTc.actualOutput || '(no output produced)'}</pre>
                                                    </div>
                                                </div>

                                                {currentTc.errorMessage && (
                                                    <div className="p-2.5 rounded bg-red-950/40 border border-red-800 text-red-400 text-xs">
                                                        <strong>Error:</strong> {currentTc.errorMessage}
                                                    </div>
                                                )}
                                            </>
                                        );
                                    })()}
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-gray-500 text-xs gap-2">
                                <Terminal size={24} className="opacity-40" />
                                <span>Click "Run Code" to compile and execute against sample test cases.</span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CodingEditorWorkspace;
