/**
 * ─── Technical Problem Generator ─────────────────────────────────────────────
 *
 * Generates dynamic, realistic technical problems tailored to candidate's job
 * description, skills, and experience level.
 *
 * Features:
 *  - Supports: Coding & Algorithms, Debugging, Data Structures, Practical Scenarios.
 *  - Primary: Gemini 2.5 Flash via callGemini / callInterviewAI with structured JSON.
 *  - Resilient Fallbacks: Verified, complete problem catalog for every major category
 *    so candidates are never blocked by AI latency or upstream API outages.
 *  - Full test cases (visible + hidden) compatible with codeExecutionService.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { callInterviewAI, safeParseAIJson } = require('../utils/aiClients');
const crypto = require('crypto');

// ─── High-Quality Curated Fallback Catalog ─────────────────────────────────────
const CURATED_PROBLEMS = [
    {
        id: 'tech_two_sum',
        title: 'Two Sum Target Lookup',
        category: 'Coding and algorithms',
        difficulty: 'Easy',
        primaryLanguage: 'python',
        statement: 'Given an array of integers `nums` and an integer `target`, return the 0-based indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice. You can return the answer with indices sorted in ascending order.',
        inputOutput: 'Input: First line contains JSON array `nums`. Second line contains integer `target`.\nOutput: JSON array `[i, j]` representing indices.',
        examples: [
            {
                input: '[2, 7, 11, 15]\n9',
                output: '[0, 1]',
                explanation: 'nums[0] + nums[1] == 2 + 7 == 9, so return [0, 1].'
            },
            {
                input: '[3, 2, 4]\n6',
                output: '[1, 2]',
                explanation: 'nums[1] + nums[2] == 2 + 4 == 6, so return [1, 2].'
            }
        ],
        constraints: [
            '2 <= nums.length <= 10^4',
            '-10^9 <= nums[i] <= 10^9',
            '-10^9 <= target <= 10^9',
            'Exactly one valid answer exists.'
        ],
        starterCode: {
            python: `import json, sys

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
`,
            javascript: `const fs = require('fs');

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
`,
            cpp: `#include <iostream>
#include <vector>
#include <string>

using namespace std;

// TODO: Candidate must implement solution here
int main() {
    return 0;
}
`,
            java: `import java.util.*;

public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        // TODO: Candidate must implement solution here
    }
}
`
        },
        testCases: [
            {
                id: 'tc_1',
                input: '[2, 7, 11, 15]\n9',
                expectedOutput: '[0, 1]',
                isHidden: false,
                category: 'NORMAL'
            },
            {
                id: 'tc_2',
                input: '[3, 2, 4]\n6',
                expectedOutput: '[1, 2]',
                isHidden: false,
                category: 'NORMAL'
            },
            {
                id: 'tc_3',
                input: '[3, 3]\n6',
                expectedOutput: '[0, 1]',
                isHidden: true,
                category: 'HIDDEN'
            },
            {
                id: 'tc_4',
                input: '[-1, -2, -3, -4, -5]\n-8',
                expectedOutput: '[2, 4]',
                isHidden: true,
                category: 'EDGE_CASE'
            }
        ],
        rubric: {
            expectedApproach: 'Use a hash map to look up the required complement in O(N) time and O(N) space, avoiding a brute force O(N^2) nested loop.',
            timeComplexity: 'O(N)',
            spaceComplexity: 'O(N)'
        },
        followUpPrompts: [
            'What is the time and space complexity of your solution, and how would you optimize it if memory was extremely constrained?',
            'If the array was already sorted in ascending order, how could you solve this in O(1) auxiliary space?'
        ]
    },
    {
        id: 'tech_valid_palindrome',
        title: 'Valid Palindrome with Alphanumeric Filtering',
        category: 'Practical programming scenarios',
        difficulty: 'Easy',
        primaryLanguage: 'python',
        statement: 'A phrase is a palindrome if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward.\n\nGiven a string `s`, return `true` if it is a palindrome, or `false` otherwise.',
        inputOutput: 'Input: Single line containing the string `s`.\nOutput: `true` or `false`.',
        examples: [
            {
                input: 'A man, a plan, a canal: Panama',
                output: 'true',
                explanation: '"amanaplanacanalpanama" is a palindrome.'
            },
            {
                input: 'race a car',
                output: 'false',
                explanation: '"raceacar" is not a palindrome.'
            }
        ],
        constraints: [
            '1 <= s.length <= 2 * 10^5',
            '`s` consists only of printable ASCII characters.'
        ],
        starterCode: {
            python: `import sys

def is_palindrome(s):
    # TODO: Write your algorithm here
    # Return True if s is a palindrome, False otherwise
    pass

if __name__ == '__main__':
    raw = sys.stdin.read().strip()
    result = is_palindrome(raw)
    print("true" if result else "false")
`,
            javascript: `const fs = require('fs');

function isPalindrome(s) {
    // TODO: Write your algorithm here
    // Return true if s is a palindrome, false otherwise
    return false;
}

const input = fs.readFileSync(0, 'utf-8').trim();
console.log(isPalindrome(input) ? "true" : "false");
`
        },
        testCases: [
            {
                id: 'tc_1',
                input: 'A man, a plan, a canal: Panama',
                expectedOutput: 'true',
                isHidden: false,
                category: 'NORMAL'
            },
            {
                id: 'tc_2',
                input: 'race a car',
                expectedOutput: 'false',
                isHidden: false,
                category: 'NORMAL'
            },
            {
                id: 'tc_3',
                input: ' ',
                expectedOutput: 'true',
                isHidden: true,
                category: 'EDGE_CASE'
            },
            {
                id: 'tc_4',
                input: '0P',
                expectedOutput: 'false',
                isHidden: true,
                category: 'EDGE_CASE'
            }
        ],
        rubric: {
            expectedApproach: 'Filter non-alphanumeric characters or use a two-pointer approach comparing left and right pointers in-place.',
            timeComplexity: 'O(N)',
            spaceComplexity: 'O(1) with pointers or O(N) with filtered string'
        },
        followUpPrompts: [
            'Can this be solved using two pointers without creating any new filtered string, minimizing garbage collection in high-throughput services?',
            'How would your logic behave with Unicode characters outside basic ASCII?'
        ]
    },
    {
        id: 'tech_debug_array_dedup',
        title: 'Debugging: Fix In-Place Array Deduplication',
        category: 'Debugging and code correction',
        difficulty: 'Medium',
        primaryLanguage: 'javascript',
        statement: 'A junior engineer implemented an algorithm to remove duplicate elements from an array in-place, but it contains a subtle bug that fails on multiple consecutive duplicates or alters relative order.\n\nGiven an array of integers `nums`, return the unique elements array with duplicates removed while preserving original first-occurrence order.',
        inputOutput: 'Input: JSON array `nums`.\nOutput: JSON array of unique elements.',
        examples: [
            {
                input: '[1, 2, 2, 3, 4, 4, 4, 5]',
                output: '[1, 2, 3, 4, 5]',
                explanation: 'Duplicates 2 and 4 are removed.'
            },
            {
                input: '[4, 5, 4, 1, 2, 1]',
                output: '[4, 5, 1, 2]',
                explanation: 'First occurrences preserved in order.'
            }
        ],
        constraints: [
            '1 <= nums.length <= 10^5',
            '-10^9 <= nums[i] <= 10^9'
        ],
        starterCode: {
            javascript: `const fs = require('fs');

function removeDuplicates(nums) {
    // BUGGY CODE TO FIX:
    // This faulty implementation fails on unsorted arrays or duplicates spread out.
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
`,
            python: `import json, sys

def remove_duplicates(nums):
    # BUGGY CODE TO FIX:
    # This faulty implementation fails on unsorted arrays or duplicates spread out.
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
`
        },
        testCases: [
            {
                id: 'tc_1',
                input: '[1, 2, 2, 3, 4, 4, 4, 5]',
                expectedOutput: '[1, 2, 3, 4, 5]',
                isHidden: false,
                category: 'NORMAL'
            },
            {
                id: 'tc_2',
                input: '[4, 5, 4, 1, 2, 1]',
                expectedOutput: '[4, 5, 1, 2]',
                isHidden: false,
                category: 'NORMAL'
            },
            {
                id: 'tc_3',
                input: '[7, 7, 7, 7, 7]',
                expectedOutput: '[7]',
                isHidden: true,
                category: 'EDGE_CASE'
            }
        ],
        rubric: {
            expectedApproach: 'Identify that adjacent comparison fails for unsorted arrays. Use a Set/Hash table to track visited items in O(N) time.',
            timeComplexity: 'O(N)',
            spaceComplexity: 'O(N)'
        },
        followUpPrompts: [
            'Why did the initial adjacent-element comparison fail on unsorted inputs?',
            'How would you handle deduplication if the input stream was infinite and could not fit into memory?'
        ]
    }
];

/**
 * Normalizes and validates a technical problem object.
 */
function sanitizeProblem(problem) {
    if (!problem || typeof problem !== 'object') return null;
    if (!problem.title || !problem.statement) return null;

    const id = problem.id || `tech_${crypto.randomBytes(4).toString('hex')}`;
    const category = problem.category || 'Coding and algorithms';
    const difficulty = problem.difficulty || 'Medium';
    const primaryLanguage = (problem.primaryLanguage || 'python').toLowerCase();

    // Ensure starter code exists
    const starterCode = problem.starterCode && typeof problem.starterCode === 'object'
        ? problem.starterCode
        : {
            python: '# Write your code here\\n',
            javascript: '// Write your code here\\n'
        };

    // Ensure test cases exist
    let testCases = Array.isArray(problem.testCases) ? problem.testCases : [];
    if (testCases.length === 0 && Array.isArray(problem.examples)) {
        testCases = problem.examples.map((ex, idx) => ({
            id: `tc_${idx + 1}`,
            input: String(ex.input || ''),
            expectedOutput: String(ex.output || ''),
            isHidden: idx > 1,
            category: idx > 1 ? 'HIDDEN' : 'NORMAL'
        }));
    }

    return {
        id,
        title: String(problem.title).trim(),
        category,
        difficulty,
        primaryLanguage,
        statement: String(problem.statement).trim(),
        inputOutput: String(problem.inputOutput || '').trim(),
        examples: Array.isArray(problem.examples) ? problem.examples : [],
        constraints: Array.isArray(problem.constraints) ? problem.constraints : [],
        starterCode,
        testCases,
        rubric: problem.rubric || {
            expectedApproach: 'Structured problem-solving with clean complexity analysis.',
            timeComplexity: 'O(N)',
            spaceComplexity: 'O(N)'
        },
        followUpPrompts: Array.isArray(problem.followUpPrompts) && problem.followUpPrompts.length > 0
            ? problem.followUpPrompts
            : [
                'What is the time and space complexity of your implementation?',
                'How would your solution behave on edge cases like empty inputs or extreme values?'
            ]
    };
}

/**
 * Generates an AI-tailored technical problem or selects the best curated fallback.
 */
async function generateTechnicalProblem({ jobTitle = '', jobDescription = '', jobSkills = [], experienceLevel = 'Mid-Level', preferredCategory = null }) {
    console.log(`[TECH-PROBLEM-GEN] Generating technical challenge for: "${jobTitle}", Skills: [${jobSkills.join(', ')}]`);

    // 1. Prompt Gemini for dynamic problem generation
    const prompt = `
You are a Staff Technical Interviewer designing a live technical challenge for a Google Meet style technical interview.

=== CANDIDATE & ROLE CONTEXT ===
Target Job Title: ${jobTitle || 'Software Engineer'}
Job Skills: ${jobSkills.join(', ') || 'Software Engineering, Algorithms, Problem Solving'}
Experience Level: ${experienceLevel || 'Mid-Level'}
Job Description Summary: ${String(jobDescription).slice(0, 500) || 'General software development role'}
${preferredCategory ? `Requested Category: ${preferredCategory}` : ''}

=== TASK ===
Create ONE realistic, high-quality technical coding or problem-solving challenge.
Choose an appropriate category among:
- "Coding and algorithms"
- "Debugging and code correction"
- "Data structures"
- "Practical programming scenarios"

=== REQUIREMENTS ===
1. The problem must have clear, unambiguous input and output formats.
2. The problem MUST be solvable within 10-15 minutes.
3. Provide starter code / boilerplate template for BOTH Python and JavaScript with standard input/output parsing.
CRITICAL INSTRUCTION FOR STARTER CODE:
- DO NOT WRITE THE ALGORITHM OR SOLUTION INSIDE THE STARTER CODE!
- The candidate MUST write the algorithm themselves.
- The main function body MUST ONLY contain a comment "# TODO: Write your algorithm here" followed by "pass" in Python, or "// TODO: Write your algorithm here" followed by a default empty return (e.g. "return null;" or "return [];") in JavaScript.
- NEVER supply the solved logic, loop, or algorithm inside starterCode.
4. Include 3-4 concrete test cases (both visible and hidden).
5. Include 2 insightful follow-up questions (e.g., complexity analysis, scaling, failure modes).

=== OUTPUT FORMAT (STRICT JSON ONLY) ===
{
  "title": "<Concise Problem Title>",
  "category": "<One of the categories above>",
  "difficulty": "Easy" | "Medium" | "Hard",
  "primaryLanguage": "python",
  "statement": "<Detailed markdown problem statement with rules and goals>",
  "inputOutput": "<Explanation of input format and expected output format>",
  "examples": [
    {
      "input": "<raw input string>",
      "output": "<raw expected output string>",
      "explanation": "<brief rationale>"
    }
  ],
  "constraints": [
    "<constraint 1>",
    "<constraint 2>"
  ],
  "starterCode": {
    "python": "<python starter template with standard input parsing and empty function body containing pass>",
    "javascript": "<javascript starter template with standard input parsing and empty function body returning empty/null>"
  },
  "testCases": [
    {
      "input": "<stdin text>",
      "expectedOutput": "<expected stdout text>",
      "isHidden": false
    },
    {
      "input": "<stdin text>",
      "expectedOutput": "<expected stdout text>",
      "isHidden": true
    }
  ],
  "rubric": {
    "expectedApproach": "<Summary of ideal solution approach>",
    "timeComplexity": "<e.g. O(N)>",
    "spaceComplexity": "<e.g. O(1) or O(N)>"
  },
  "followUpPrompts": [
    "<Follow-up question 1 exploring complexity or trade-offs>",
    "<Follow-up question 2 exploring edge cases or scale>"
  ]
}
`;

    try {
        const rawJson = await callInterviewAI(prompt, 1800, true, "You are a senior technical interviewer returning strictly structured JSON.", 0.6);
        if (rawJson) {
            const parsed = safeParseAIJson(rawJson);
            const sanitized = sanitizeProblem(parsed);
            if (sanitized && sanitized.testCases.length >= 2) {
                console.log(`[TECH-PROBLEM-GEN] Gemini generated problem: "${sanitized.title}" (${sanitized.difficulty})`);
                return sanitized;
            }
        }
    } catch (err) {
        console.warn(`[TECH-PROBLEM-GEN] AI generation error: ${err.message}. Using curated fallback.`);
    }

    // 2. Select curated fallback tailored to role
    console.log('[TECH-PROBLEM-GEN] Falling back to curated technical catalog');
    const skillsLower = jobSkills.map(s => String(s).toLowerCase());
    let selected = CURATED_PROBLEMS[0];

    if (skillsLower.some(s => s.includes('debug') || s.includes('qa') || s.includes('test'))) {
        selected = CURATED_PROBLEMS.find(p => p.id === 'tech_debug_array_dedup') || selected;
    } else if (skillsLower.some(s => s.includes('string') || s.includes('web') || s.includes('frontend'))) {
        selected = CURATED_PROBLEMS.find(p => p.id === 'tech_valid_palindrome') || selected;
    } else {
        selected = CURATED_PROBLEMS.find(p => p.id === 'tech_two_sum') || selected;
    }

    return JSON.parse(JSON.stringify(selected));
}

module.exports = {
    generateTechnicalProblem,
    CURATED_PROBLEMS,
    sanitizeProblem
};
