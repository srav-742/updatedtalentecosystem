/**
 * Hire1Percent Coding Question Bank — Seed Script
 * 
 * Idempotent: uses slug-based deduplication so re-running never overwrites
 * existing edited questions. Only inserts new questions that don't exist.
 * 
 * Usage: node scripts/seedQuestionBank.js
 * 
 * Distribution: 35 LOW, 45 MEDIUM, 20 HIGH = 100 total
 * Topics: Arrays, Strings, Hashing, Searching, Sorting, Two Pointers,
 *         Stacks, Queues, Linked Lists, Trees, Graphs, Recursion,
 *         Dynamic Programming, Greedy, Heaps, Intervals, Math, Bit Manipulation
 */

require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');

// Connect to MongoDB using the same connection string as the backend
const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/talentecosystem';

// Import model
const QuestionBank = require(path.join(__dirname, '..', 'models', 'QuestionBank'));

// ═══════════════════════════════════════════════════════════════════
// QUESTION DEFINITIONS
// ═══════════════════════════════════════════════════════════════════

function buildQuestions() {
    const questions = [];

    // ─── LOW DIFFICULTY (35 questions) ─────────────────────────────

    questions.push({
        slug: 'sum-of-array',
        title: 'Sum of Array Elements',
        description: 'Given an array of integers, return the sum of all elements.\n\nWrite a program that reads an integer N (the size of the array) followed by N integers, and prints the sum of all elements.',
        difficulty: 'LOW',
        topics: ['Arrays', 'Math'],
        tags: ['basics', 'iteration'],
        skills: ['Problem Solving', 'Arrays'],
        inputFormat: 'First line: integer N\nSecond line: N space-separated integers',
        outputFormat: 'A single integer — the sum of all array elements',
        constraints: '1 ≤ N ≤ 10^5\n-10^6 ≤ arr[i] ≤ 10^6',
        executionMode: 'STDIN',
        examples: [
            { input: '5\n1 2 3 4 5', output: '15', explanation: '1+2+3+4+5 = 15' },
            { input: '3\n-1 0 1', output: '0', explanation: '-1+0+1 = 0' }
        ],
        referenceSolution: { python: 'n = int(input())\narr = list(map(int, input().split()))\nprint(sum(arr))' },
        testCases: [
            { input: '5\n1 2 3 4 5', expectedOutput: '15', isHidden: false, category: 'NORMAL' },
            { input: '3\n-1 0 1', expectedOutput: '0', isHidden: false, category: 'NORMAL' },
            { input: '1\n42', expectedOutput: '42', isHidden: false, category: 'BOUNDARY' },
            { input: '4\n0 0 0 0', expectedOutput: '0', isHidden: true, category: 'EDGE_CASE' },
            { input: '3\n-5 -3 -2', expectedOutput: '-10', isHidden: true, category: 'NORMAL' },
            { input: '2\n1000000 -1000000', expectedOutput: '0', isHidden: true, category: 'BOUNDARY' }
        ]
    });

    questions.push({
        slug: 'find-maximum-element',
        title: 'Find Maximum Element',
        description: 'Given an array of integers, find and return the maximum element.\n\nWrite a program that reads an integer N followed by N integers and prints the largest integer.',
        difficulty: 'LOW',
        topics: ['Arrays'],
        tags: ['basics', 'linear-scan'],
        skills: ['Problem Solving', 'Arrays'],
        inputFormat: 'First line: integer N\nSecond line: N space-separated integers',
        outputFormat: 'A single integer — the maximum element',
        constraints: '1 ≤ N ≤ 10^5\n-10^9 ≤ arr[i] ≤ 10^9',
        executionMode: 'STDIN',
        examples: [
            { input: '5\n3 1 4 1 5', output: '5', explanation: 'The largest element is 5' },
            { input: '3\n-2 -5 -1', output: '-1', explanation: 'Among negative numbers, -1 is the largest' }
        ],
        referenceSolution: { python: 'n = int(input())\narr = list(map(int, input().split()))\nprint(max(arr))' },
        testCases: [
            { input: '5\n3 1 4 1 5', expectedOutput: '5', isHidden: false, category: 'NORMAL' },
            { input: '3\n-2 -5 -1', expectedOutput: '-1', isHidden: false, category: 'NORMAL' },
            { input: '1\n7', expectedOutput: '7', isHidden: false, category: 'BOUNDARY' },
            { input: '4\n5 5 5 5', expectedOutput: '5', isHidden: true, category: 'EDGE_CASE' },
            { input: '3\n1000000000 -1000000000 0', expectedOutput: '1000000000', isHidden: true, category: 'BOUNDARY' }
        ]
    });

    questions.push({
        slug: 'reverse-array',
        title: 'Reverse an Array',
        description: 'Given an array of integers, reverse it and print the reversed array.\n\nWrite a program that reads N integers and outputs them in reverse order.',
        difficulty: 'LOW',
        topics: ['Arrays'],
        tags: ['basics', 'reversal'],
        skills: ['Arrays'],
        inputFormat: 'First line: integer N\nSecond line: N space-separated integers',
        outputFormat: 'N space-separated integers in reverse order',
        constraints: '1 ≤ N ≤ 10^5',
        executionMode: 'STDIN',
        examples: [
            { input: '5\n1 2 3 4 5', output: '5 4 3 2 1', explanation: 'Array reversed' },
            { input: '3\n10 20 30', output: '30 20 10', explanation: 'Array reversed' }
        ],
        referenceSolution: { python: 'n = int(input())\narr = list(map(int, input().split()))\nprint(*arr[::-1])' },
        testCases: [
            { input: '5\n1 2 3 4 5', expectedOutput: '5 4 3 2 1', isHidden: false, category: 'NORMAL' },
            { input: '3\n10 20 30', expectedOutput: '30 20 10', isHidden: false, category: 'NORMAL' },
            { input: '1\n42', expectedOutput: '42', isHidden: false, category: 'BOUNDARY' },
            { input: '2\n1 2', expectedOutput: '2 1', isHidden: true, category: 'BOUNDARY' },
            { input: '4\n-1 -2 -3 -4', expectedOutput: '-4 -3 -2 -1', isHidden: true, category: 'NORMAL' }
        ]
    });

    questions.push({
        slug: 'count-occurrences',
        title: 'Count Occurrences of Target',
        description: 'Given an array of integers and a target value, count how many times the target appears in the array.',
        difficulty: 'LOW',
        topics: ['Arrays', 'Searching'],
        tags: ['basics', 'counting'],
        skills: ['Arrays'],
        inputFormat: 'First line: integers N and T (array size and target)\nSecond line: N space-separated integers',
        outputFormat: 'A single integer — the count of target in the array',
        constraints: '1 ≤ N ≤ 10^5\n-10^9 ≤ arr[i], T ≤ 10^9',
        executionMode: 'STDIN',
        examples: [
            { input: '5 3\n1 3 3 4 3', output: '3', explanation: '3 appears 3 times' },
            { input: '4 7\n1 2 3 4', output: '0', explanation: '7 does not appear' }
        ],
        referenceSolution: { python: 'n, t = map(int, input().split())\narr = list(map(int, input().split()))\nprint(arr.count(t))' },
        testCases: [
            { input: '5 3\n1 3 3 4 3', expectedOutput: '3', isHidden: false, category: 'NORMAL' },
            { input: '4 7\n1 2 3 4', expectedOutput: '0', isHidden: false, category: 'NORMAL' },
            { input: '1 1\n1', expectedOutput: '1', isHidden: true, category: 'BOUNDARY' },
            { input: '5 0\n0 0 0 0 0', expectedOutput: '5', isHidden: true, category: 'EDGE_CASE' },
            { input: '3 -1\n-1 -1 1', expectedOutput: '2', isHidden: true, category: 'NORMAL' }
        ]
    });

    questions.push({
        slug: 'merge-sorted-arrays',
        title: 'Merge Two Sorted Arrays',
        description: 'Given two sorted arrays of integers, merge them into a single sorted array and print the result.',
        difficulty: 'LOW',
        topics: ['Arrays', 'Sorting'],
        tags: ['merge', 'two-pointer'],
        skills: ['Arrays', 'Sorting'],
        inputFormat: 'First line: integer N\nSecond line: N sorted integers\nThird line: integer M\nFourth line: M sorted integers',
        outputFormat: 'Space-separated integers of the merged sorted array',
        constraints: '1 ≤ N, M ≤ 10^5',
        executionMode: 'STDIN',
        examples: [
            { input: '3\n1 3 5\n3\n2 4 6', output: '1 2 3 4 5 6', explanation: 'Merged and sorted' },
            { input: '2\n1 2\n2\n3 4', output: '1 2 3 4', explanation: 'Already in order' }
        ],
        referenceSolution: { python: 'n = int(input())\na = list(map(int, input().split()))\nm = int(input())\nb = list(map(int, input().split()))\nresult = sorted(a + b)\nprint(*result)' },
        testCases: [
            { input: '3\n1 3 5\n3\n2 4 6', expectedOutput: '1 2 3 4 5 6', isHidden: false, category: 'NORMAL' },
            { input: '2\n1 2\n2\n3 4', expectedOutput: '1 2 3 4', isHidden: false, category: 'NORMAL' },
            { input: '1\n5\n1\n3', expectedOutput: '3 5', isHidden: true, category: 'BOUNDARY' },
            { input: '3\n1 1 1\n3\n1 1 1', expectedOutput: '1 1 1 1 1 1', isHidden: true, category: 'EDGE_CASE' },
            { input: '2\n-3 -1\n2\n-2 0', expectedOutput: '-3 -2 -1 0', isHidden: true, category: 'NORMAL' }
        ]
    });

    questions.push({
        slug: 'check-palindrome-string',
        title: 'Check Palindrome String',
        description: 'Given a string, determine if it is a palindrome. A palindrome reads the same forwards and backwards. Consider only alphanumeric characters and ignore case.',
        difficulty: 'LOW',
        topics: ['Strings'],
        tags: ['palindrome', 'basics'],
        skills: ['Strings'],
        inputFormat: 'A single string',
        outputFormat: 'true if palindrome, false otherwise',
        constraints: '1 ≤ length ≤ 10^5',
        executionMode: 'STDIN',
        examples: [
            { input: 'racecar', output: 'true', explanation: '"racecar" reads the same backwards' },
            { input: 'hello', output: 'false', explanation: '"hello" reversed is "olleh"' }
        ],
        referenceSolution: { python: 's = input().strip()\nclean = "".join(c.lower() for c in s if c.isalnum())\nprint("true" if clean == clean[::-1] else "false")' },
        testCases: [
            { input: 'racecar', expectedOutput: 'true', isHidden: false, category: 'NORMAL' },
            { input: 'hello', expectedOutput: 'false', isHidden: false, category: 'NORMAL' },
            { input: 'a', expectedOutput: 'true', isHidden: false, category: 'BOUNDARY' },
            { input: 'A man a plan a canal Panama', expectedOutput: 'true', isHidden: true, category: 'EDGE_CASE' },
            { input: 'ab', expectedOutput: 'false', isHidden: true, category: 'BOUNDARY' },
            { input: 'abba', expectedOutput: 'true', isHidden: true, category: 'NORMAL' }
        ]
    });

    questions.push({
        slug: 'reverse-string',
        title: 'Reverse a String',
        description: 'Given a string, reverse it and print the result.',
        difficulty: 'LOW',
        topics: ['Strings'],
        tags: ['reversal', 'basics'],
        skills: ['Strings'],
        inputFormat: 'A single string',
        outputFormat: 'The reversed string',
        constraints: '1 ≤ length ≤ 10^5',
        executionMode: 'STDIN',
        examples: [
            { input: 'hello', output: 'olleh', explanation: 'Reversed "hello"' },
            { input: 'world', output: 'dlrow', explanation: 'Reversed "world"' }
        ],
        referenceSolution: { python: 'print(input().strip()[::-1])' },
        testCases: [
            { input: 'hello', expectedOutput: 'olleh', isHidden: false, category: 'NORMAL' },
            { input: 'world', expectedOutput: 'dlrow', isHidden: false, category: 'NORMAL' },
            { input: 'a', expectedOutput: 'a', isHidden: true, category: 'BOUNDARY' },
            { input: 'abcdef', expectedOutput: 'fedcba', isHidden: true, category: 'NORMAL' },
            { input: '12345', expectedOutput: '54321', isHidden: true, category: 'NORMAL' }
        ]
    });

    questions.push({
        slug: 'count-vowels',
        title: 'Count Vowels in String',
        description: 'Given a string, count the number of vowels (a, e, i, o, u) in it. The comparison should be case-insensitive.',
        difficulty: 'LOW',
        topics: ['Strings'],
        tags: ['counting', 'basics'],
        skills: ['Strings'],
        inputFormat: 'A single string',
        outputFormat: 'An integer — the count of vowels',
        constraints: '1 ≤ length ≤ 10^5',
        executionMode: 'STDIN',
        examples: [
            { input: 'hello', output: '2', explanation: 'e and o are vowels' },
            { input: 'AEIOU', output: '5', explanation: 'All characters are vowels' }
        ],
        referenceSolution: { python: 's = input().strip().lower()\nprint(sum(1 for c in s if c in "aeiou"))' },
        testCases: [
            { input: 'hello', expectedOutput: '2', isHidden: false, category: 'NORMAL' },
            { input: 'AEIOU', expectedOutput: '5', isHidden: false, category: 'NORMAL' },
            { input: 'xyz', expectedOutput: '0', isHidden: true, category: 'EDGE_CASE' },
            { input: 'a', expectedOutput: '1', isHidden: true, category: 'BOUNDARY' },
            { input: 'Programming', expectedOutput: '3', isHidden: true, category: 'NORMAL' }
        ]
    });

    questions.push({
        slug: 'check-anagram',
        title: 'Check if Two Strings are Anagrams',
        description: 'Given two strings, determine if they are anagrams of each other. Two strings are anagrams if they contain the same characters with the same frequencies. The comparison is case-insensitive.',
        difficulty: 'LOW',
        topics: ['Strings', 'Hashing'],
        tags: ['anagram', 'sorting'],
        skills: ['Strings', 'Hash Map'],
        inputFormat: 'Two lines, each containing a string',
        outputFormat: 'true if anagram, false otherwise',
        constraints: '1 ≤ length ≤ 10^5',
        executionMode: 'STDIN',
        examples: [
            { input: 'listen\nsilent', output: 'true', explanation: 'Same characters rearranged' },
            { input: 'hello\nworld', output: 'false', explanation: 'Different characters' }
        ],
        referenceSolution: { python: 'a = input().strip().lower()\nb = input().strip().lower()\nprint("true" if sorted(a) == sorted(b) else "false")' },
        testCases: [
            { input: 'listen\nsilent', expectedOutput: 'true', isHidden: false, category: 'NORMAL' },
            { input: 'hello\nworld', expectedOutput: 'false', isHidden: false, category: 'NORMAL' },
            { input: 'a\na', expectedOutput: 'true', isHidden: true, category: 'BOUNDARY' },
            { input: 'Astronomer\nMoon starer', expectedOutput: 'false', isHidden: true, category: 'EDGE_CASE' },
            { input: 'abc\ncba', expectedOutput: 'true', isHidden: true, category: 'NORMAL' }
        ]
    });

    questions.push({
        slug: 'capitalize-words',
        title: 'Capitalize First Letter of Each Word',
        description: 'Given a string of words separated by spaces, capitalize the first letter of each word and print the result.',
        difficulty: 'LOW',
        topics: ['Strings'],
        tags: ['string-manipulation', 'basics'],
        skills: ['Strings'],
        inputFormat: 'A single line string',
        outputFormat: 'The string with each word capitalized',
        constraints: '1 ≤ length ≤ 10^5',
        executionMode: 'STDIN',
        examples: [
            { input: 'hello world', output: 'Hello World', explanation: 'Each word capitalized' },
            { input: 'the quick brown fox', output: 'The Quick Brown Fox', explanation: 'Each word capitalized' }
        ],
        referenceSolution: { python: 'print(input().strip().title())' },
        testCases: [
            { input: 'hello world', expectedOutput: 'Hello World', isHidden: false, category: 'NORMAL' },
            { input: 'the quick brown fox', expectedOutput: 'The Quick Brown Fox', isHidden: false, category: 'NORMAL' },
            { input: 'a', expectedOutput: 'A', isHidden: true, category: 'BOUNDARY' },
            { input: 'ALREADY CAPS', expectedOutput: 'Already Caps', isHidden: true, category: 'EDGE_CASE' },
            { input: 'python programming', expectedOutput: 'Python Programming', isHidden: true, category: 'NORMAL' }
        ]
    });

    questions.push({
        slug: 'factorial-number',
        title: 'Factorial of a Number',
        description: 'Given a non-negative integer N, compute its factorial (N!). Remember that 0! = 1.',
        difficulty: 'LOW',
        topics: ['Math', 'Recursion'],
        tags: ['factorial', 'basics'],
        skills: ['Math', 'Recursion'],
        inputFormat: 'A single integer N',
        outputFormat: 'N! (the factorial of N)',
        constraints: '0 ≤ N ≤ 20',
        executionMode: 'STDIN',
        examples: [
            { input: '5', output: '120', explanation: '5! = 5×4×3×2×1 = 120' },
            { input: '0', output: '1', explanation: '0! = 1 by definition' }
        ],
        referenceSolution: { python: 'import math\nprint(math.factorial(int(input())))' },
        testCases: [
            { input: '5', expectedOutput: '120', isHidden: false, category: 'NORMAL' },
            { input: '0', expectedOutput: '1', isHidden: false, category: 'BOUNDARY' },
            { input: '1', expectedOutput: '1', isHidden: false, category: 'BOUNDARY' },
            { input: '10', expectedOutput: '3628800', isHidden: true, category: 'NORMAL' },
            { input: '20', expectedOutput: '2432902008176640000', isHidden: true, category: 'BOUNDARY' }
        ]
    });

    questions.push({
        slug: 'fibonacci-nth',
        title: 'Nth Fibonacci Number',
        description: 'Given an integer N, find the Nth Fibonacci number. The Fibonacci sequence is defined as: F(0)=0, F(1)=1, F(n)=F(n-1)+F(n-2) for n≥2.',
        difficulty: 'LOW',
        topics: ['Math', 'Dynamic Programming'],
        tags: ['fibonacci', 'basics'],
        skills: ['Math', 'DP'],
        inputFormat: 'A single integer N',
        outputFormat: 'The Nth Fibonacci number',
        constraints: '0 ≤ N ≤ 40',
        executionMode: 'STDIN',
        examples: [
            { input: '6', output: '8', explanation: 'F(6) = 8 (0,1,1,2,3,5,8)' },
            { input: '0', output: '0', explanation: 'F(0) = 0' }
        ],
        referenceSolution: { python: 'n = int(input())\na, b = 0, 1\nfor _ in range(n):\n    a, b = b, a + b\nprint(a)' },
        testCases: [
            { input: '6', expectedOutput: '8', isHidden: false, category: 'NORMAL' },
            { input: '0', expectedOutput: '0', isHidden: false, category: 'BOUNDARY' },
            { input: '1', expectedOutput: '1', isHidden: false, category: 'BOUNDARY' },
            { input: '10', expectedOutput: '55', isHidden: true, category: 'NORMAL' },
            { input: '20', expectedOutput: '6765', isHidden: true, category: 'NORMAL' },
            { input: '2', expectedOutput: '1', isHidden: true, category: 'BOUNDARY' }
        ]
    });

    questions.push({
        slug: 'check-prime',
        title: 'Check if Number is Prime',
        description: 'Given a positive integer N, determine if it is a prime number. A prime number is greater than 1 and has no divisors other than 1 and itself.',
        difficulty: 'LOW',
        topics: ['Math'],
        tags: ['prime', 'basics'],
        skills: ['Math'],
        inputFormat: 'A single integer N',
        outputFormat: 'true if prime, false otherwise',
        constraints: '1 ≤ N ≤ 10^6',
        executionMode: 'STDIN',
        examples: [
            { input: '7', output: 'true', explanation: '7 is prime' },
            { input: '4', output: 'false', explanation: '4 = 2×2, not prime' }
        ],
        referenceSolution: { python: 'n = int(input())\nif n < 2:\n    print("false")\nelse:\n    is_prime = True\n    i = 2\n    while i * i <= n:\n        if n % i == 0:\n            is_prime = False\n            break\n        i += 1\n    print("true" if is_prime else "false")' },
        testCases: [
            { input: '7', expectedOutput: 'true', isHidden: false, category: 'NORMAL' },
            { input: '4', expectedOutput: 'false', isHidden: false, category: 'NORMAL' },
            { input: '1', expectedOutput: 'false', isHidden: false, category: 'BOUNDARY' },
            { input: '2', expectedOutput: 'true', isHidden: true, category: 'BOUNDARY' },
            { input: '97', expectedOutput: 'true', isHidden: true, category: 'NORMAL' },
            { input: '100', expectedOutput: 'false', isHidden: true, category: 'NORMAL' }
        ]
    });

    questions.push({
        slug: 'gcd-two-numbers',
        title: 'GCD of Two Numbers',
        description: 'Given two positive integers A and B, find their Greatest Common Divisor (GCD) using the Euclidean algorithm.',
        difficulty: 'LOW',
        topics: ['Math'],
        tags: ['gcd', 'euclidean'],
        skills: ['Math'],
        inputFormat: 'Two integers A and B on a single line',
        outputFormat: 'The GCD of A and B',
        constraints: '1 ≤ A, B ≤ 10^9',
        executionMode: 'STDIN',
        examples: [
            { input: '12 8', output: '4', explanation: 'GCD(12,8) = 4' },
            { input: '7 13', output: '1', explanation: 'GCD of two coprime numbers is 1' }
        ],
        referenceSolution: { python: 'import math\na, b = map(int, input().split())\nprint(math.gcd(a, b))' },
        testCases: [
            { input: '12 8', expectedOutput: '4', isHidden: false, category: 'NORMAL' },
            { input: '7 13', expectedOutput: '1', isHidden: false, category: 'NORMAL' },
            { input: '5 5', expectedOutput: '5', isHidden: true, category: 'EDGE_CASE' },
            { input: '100 25', expectedOutput: '25', isHidden: true, category: 'NORMAL' },
            { input: '1 1000000000', expectedOutput: '1', isHidden: true, category: 'BOUNDARY' }
        ]
    });

    questions.push({
        slug: 'power-of-number',
        title: 'Power of a Number',
        description: 'Given two integers base and exponent, compute base^exponent. The exponent is non-negative.',
        difficulty: 'LOW',
        topics: ['Math'],
        tags: ['power', 'basics'],
        skills: ['Math'],
        inputFormat: 'Two integers: base and exponent',
        outputFormat: 'base raised to the power exponent',
        constraints: '-10 ≤ base ≤ 10\n0 ≤ exponent ≤ 15',
        executionMode: 'STDIN',
        examples: [
            { input: '2 10', output: '1024', explanation: '2^10 = 1024' },
            { input: '3 0', output: '1', explanation: 'Any number to power 0 is 1' }
        ],
        referenceSolution: { python: 'b, e = map(int, input().split())\nprint(b ** e)' },
        testCases: [
            { input: '2 10', expectedOutput: '1024', isHidden: false, category: 'NORMAL' },
            { input: '3 0', expectedOutput: '1', isHidden: false, category: 'BOUNDARY' },
            { input: '5 3', expectedOutput: '125', isHidden: true, category: 'NORMAL' },
            { input: '-2 3', expectedOutput: '-8', isHidden: true, category: 'NORMAL' },
            { input: '0 5', expectedOutput: '0', isHidden: true, category: 'EDGE_CASE' },
            { input: '1 15', expectedOutput: '1', isHidden: true, category: 'EDGE_CASE' }
        ]
    });

    questions.push({
        slug: 'linear-search',
        title: 'Linear Search',
        description: 'Given an array of integers and a target value, find the index (0-based) of the first occurrence of the target. If the target is not found, return -1.',
        difficulty: 'LOW',
        topics: ['Arrays', 'Searching'],
        tags: ['linear-search', 'basics'],
        skills: ['Searching'],
        inputFormat: 'First line: N and target\nSecond line: N integers',
        outputFormat: '0-based index of target, or -1 if not found',
        constraints: '1 ≤ N ≤ 10^5',
        executionMode: 'STDIN',
        examples: [
            { input: '5 3\n1 2 3 4 5', output: '2', explanation: '3 is at index 2' },
            { input: '3 7\n1 2 3', output: '-1', explanation: '7 not found' }
        ],
        referenceSolution: { python: 'n, t = map(int, input().split())\narr = list(map(int, input().split()))\nprint(arr.index(t) if t in arr else -1)' },
        testCases: [
            { input: '5 3\n1 2 3 4 5', expectedOutput: '2', isHidden: false, category: 'NORMAL' },
            { input: '3 7\n1 2 3', expectedOutput: '-1', isHidden: false, category: 'NORMAL' },
            { input: '1 1\n1', expectedOutput: '0', isHidden: true, category: 'BOUNDARY' },
            { input: '5 5\n1 2 3 4 5', expectedOutput: '4', isHidden: true, category: 'NORMAL' },
            { input: '4 3\n3 3 3 3', expectedOutput: '0', isHidden: true, category: 'EDGE_CASE' }
        ]
    });

    questions.push({
        slug: 'binary-search',
        title: 'Binary Search',
        description: 'Given a sorted array of integers and a target value, find the index (0-based) of the target using binary search. If the target is not found, return -1.',
        difficulty: 'LOW',
        topics: ['Arrays', 'Searching'],
        tags: ['binary-search'],
        skills: ['Binary Search'],
        inputFormat: 'First line: N and target\nSecond line: N sorted integers',
        outputFormat: '0-based index, or -1 if not found',
        constraints: '1 ≤ N ≤ 10^5',
        executionMode: 'STDIN',
        examples: [
            { input: '5 4\n1 2 3 4 5', output: '3', explanation: '4 is at index 3' },
            { input: '3 0\n1 2 3', output: '-1', explanation: '0 not found' }
        ],
        referenceSolution: { python: 'n, t = map(int, input().split())\narr = list(map(int, input().split()))\nlo, hi = 0, n - 1\nresult = -1\nwhile lo <= hi:\n    mid = (lo + hi) // 2\n    if arr[mid] == t:\n        result = mid\n        break\n    elif arr[mid] < t:\n        lo = mid + 1\n    else:\n        hi = mid - 1\nprint(result)' },
        testCases: [
            { input: '5 4\n1 2 3 4 5', expectedOutput: '3', isHidden: false, category: 'NORMAL' },
            { input: '3 0\n1 2 3', expectedOutput: '-1', isHidden: false, category: 'NORMAL' },
            { input: '1 1\n1', expectedOutput: '0', isHidden: true, category: 'BOUNDARY' },
            { input: '6 6\n1 2 3 4 5 6', expectedOutput: '5', isHidden: true, category: 'NORMAL' },
            { input: '5 1\n1 2 3 4 5', expectedOutput: '0', isHidden: true, category: 'BOUNDARY' }
        ]
    });

    questions.push({
        slug: 'bubble-sort',
        title: 'Bubble Sort',
        description: 'Given an array of integers, sort them in ascending order using any sorting technique and print the result.',
        difficulty: 'LOW',
        topics: ['Sorting'],
        tags: ['bubble-sort', 'basics'],
        skills: ['Sorting'],
        inputFormat: 'First line: N\nSecond line: N integers',
        outputFormat: 'Space-separated sorted integers',
        constraints: '1 ≤ N ≤ 1000',
        executionMode: 'STDIN',
        examples: [
            { input: '5\n5 3 1 4 2', output: '1 2 3 4 5', explanation: 'Sorted ascending' },
            { input: '3\n3 1 2', output: '1 2 3', explanation: 'Sorted ascending' }
        ],
        referenceSolution: { python: 'n = int(input())\narr = list(map(int, input().split()))\narr.sort()\nprint(*arr)' },
        testCases: [
            { input: '5\n5 3 1 4 2', expectedOutput: '1 2 3 4 5', isHidden: false, category: 'NORMAL' },
            { input: '3\n3 1 2', expectedOutput: '1 2 3', isHidden: false, category: 'NORMAL' },
            { input: '1\n42', expectedOutput: '42', isHidden: true, category: 'BOUNDARY' },
            { input: '4\n-3 -1 -4 -2', expectedOutput: '-4 -3 -2 -1', isHidden: true, category: 'NORMAL' },
            { input: '5\n1 2 3 4 5', expectedOutput: '1 2 3 4 5', isHidden: true, category: 'EDGE_CASE' }
        ]
    });

    questions.push({
        slug: 'valid-parentheses',
        title: 'Valid Parentheses',
        description: 'Given a string containing just the characters \'(\', \')\', \'{\', \'}\', \'[\' and \']\', determine if the input string is valid.\n\nAn input string is valid if:\n1. Open brackets must be closed by the same type of brackets.\n2. Open brackets must be closed in the correct order.\n3. Every close bracket has a corresponding open bracket of the same type.',
        difficulty: 'LOW',
        topics: ['Stacks'],
        tags: ['stack', 'parentheses'],
        skills: ['Stacks'],
        inputFormat: 'A single string of bracket characters',
        outputFormat: 'true or false',
        constraints: '1 ≤ length ≤ 10^4',
        executionMode: 'STDIN',
        examples: [
            { input: '()', output: 'true', explanation: 'Valid pair' },
            { input: '({[]})', output: 'true', explanation: 'Nested valid brackets' },
            { input: '(]', output: 'false', explanation: 'Mismatched brackets' }
        ],
        referenceSolution: { python: 'try:\n    s = input().strip()\nexcept Exception:\n    s = ""\nstack = []\nmapping = {")": "(", "]": "[", "}": "{"}\nfor c in s:\n    if c in mapping:\n        if not stack or stack[-1] != mapping[c]:\n            print("false")\n            exit()\n        stack.pop()\n    else:\n        stack.append(c)\nprint("true" if not stack else "false")' },
        testCases: [
            { input: '()', expectedOutput: 'true', isHidden: false, category: 'NORMAL' },
            { input: '({[]})', expectedOutput: 'true', isHidden: false, category: 'NORMAL' },
            { input: '(]', expectedOutput: 'false', isHidden: false, category: 'NORMAL' },
            { input: '', expectedOutput: 'true', isHidden: true, category: 'BOUNDARY' },
            { input: '((()))', expectedOutput: 'true', isHidden: true, category: 'NORMAL' },
            { input: '([)]', expectedOutput: 'false', isHidden: true, category: 'EDGE_CASE' }
        ]
    });

    questions.push({
        slug: 'two-sum',
        title: 'Two Sum',
        description: 'Given an array of integers and a target sum, find two numbers in the array that add up to the target. Return their 0-based indices.\n\nYou may assume that each input has exactly one solution, and you may not use the same element twice.',
        difficulty: 'LOW',
        topics: ['Arrays', 'Hashing'],
        tags: ['two-sum', 'hash-map'],
        skills: ['Hash Map', 'Arrays'],
        inputFormat: 'First line: N and target\nSecond line: N integers',
        outputFormat: 'Two space-separated indices (smaller index first)',
        constraints: '2 ≤ N ≤ 10^4\n-10^9 ≤ values ≤ 10^9',
        executionMode: 'STDIN',
        examples: [
            { input: '4 9\n2 7 11 15', output: '0 1', explanation: 'arr[0]+arr[1] = 2+7 = 9' },
            { input: '3 6\n3 2 4', output: '1 2', explanation: 'arr[1]+arr[2] = 2+4 = 6' }
        ],
        referenceSolution: { python: 'n, t = map(int, input().split())\narr = list(map(int, input().split()))\nseen = {}\nfor i, v in enumerate(arr):\n    comp = t - v\n    if comp in seen:\n        print(seen[comp], i)\n        break\n    seen[v] = i' },
        testCases: [
            { input: '4 9\n2 7 11 15', expectedOutput: '0 1', isHidden: false, category: 'NORMAL' },
            { input: '3 6\n3 2 4', expectedOutput: '1 2', isHidden: false, category: 'NORMAL' },
            { input: '2 3\n1 2', expectedOutput: '0 1', isHidden: true, category: 'BOUNDARY' },
            { input: '4 0\n-1 1 -2 2', expectedOutput: '0 1', isHidden: true, category: 'EDGE_CASE' },
            { input: '5 8\n1 4 9 7 2', expectedOutput: '0 3', isHidden: true, category: 'NORMAL' }
        ]
    });

    questions.push({
        slug: 'frequency-count',
        title: 'Element Frequency Count',
        description: 'Given an array of integers, count the frequency of each element and print each element with its count, sorted by element value.',
        difficulty: 'LOW',
        topics: ['Hashing'],
        tags: ['frequency', 'hash-map'],
        skills: ['Hash Map'],
        inputFormat: 'First line: N\nSecond line: N integers',
        outputFormat: 'Each line: element count (sorted by element)',
        constraints: '1 ≤ N ≤ 10^5',
        executionMode: 'STDIN',
        examples: [
            { input: '6\n1 2 2 3 3 3', output: '1 1\n2 2\n3 3', explanation: '1 appears 1 time, 2 appears 2 times, 3 appears 3 times' }
        ],
        referenceSolution: { python: 'n = int(input())\narr = list(map(int, input().split()))\nfrom collections import Counter\nc = Counter(arr)\nfor k in sorted(c.keys()):\n    print(k, c[k])' },
        testCases: [
            { input: '6\n1 2 2 3 3 3', expectedOutput: '1 1\n2 2\n3 3', isHidden: false, category: 'NORMAL' },
            { input: '1\n5', expectedOutput: '5 1', isHidden: false, category: 'BOUNDARY' },
            { input: '4\n4 4 4 4', expectedOutput: '4 4', isHidden: true, category: 'EDGE_CASE' },
            { input: '5\n3 1 2 1 3', expectedOutput: '1 2\n2 1\n3 2', isHidden: true, category: 'NORMAL' }
        ]
    });

    questions.push({
        slug: 'first-unique-character',
        title: 'First Unique Character',
        description: 'Given a string, find the first non-repeating character and return its 0-based index. If no unique character exists, return -1.',
        difficulty: 'LOW',
        topics: ['Strings', 'Hashing'],
        tags: ['hash-map', 'string'],
        skills: ['Hash Map', 'Strings'],
        inputFormat: 'A single string (lowercase letters only)',
        outputFormat: 'Index of first unique character, or -1',
        constraints: '1 ≤ length ≤ 10^5',
        executionMode: 'STDIN',
        examples: [
            { input: 'leetcode', output: '0', explanation: '"l" is the first non-repeating character' },
            { input: 'aabb', output: '-1', explanation: 'No unique character exists' }
        ],
        referenceSolution: { python: 's = input().strip()\nfrom collections import Counter\nc = Counter(s)\nfor i, ch in enumerate(s):\n    if c[ch] == 1:\n        print(i)\n        exit()\nprint(-1)' },
        testCases: [
            { input: 'leetcode', expectedOutput: '0', isHidden: false, category: 'NORMAL' },
            { input: 'aabb', expectedOutput: '-1', isHidden: false, category: 'NORMAL' },
            { input: 'a', expectedOutput: '0', isHidden: true, category: 'BOUNDARY' },
            { input: 'aabbc', expectedOutput: '4', isHidden: true, category: 'NORMAL' },
            { input: 'abcabc', expectedOutput: '-1', isHidden: true, category: 'EDGE_CASE' }
        ]
    });

    questions.push({
        slug: 'array-intersection',
        title: 'Intersection of Two Arrays',
        description: 'Given two integer arrays, find their intersection (common elements). Each element in the result should appear as many times as it shows in both arrays. Output the result in sorted order.',
        difficulty: 'LOW',
        topics: ['Arrays', 'Hashing'],
        tags: ['intersection', 'hash-map'],
        skills: ['Hash Map', 'Arrays'],
        inputFormat: 'First line: N\nSecond line: N integers\nThird line: M\nFourth line: M integers',
        outputFormat: 'Space-separated intersection elements (sorted), or EMPTY if no intersection',
        constraints: '1 ≤ N, M ≤ 10^4',
        executionMode: 'STDIN',
        examples: [
            { input: '4\n1 2 2 1\n2\n2 2', output: '2 2', explanation: '2 appears in both arrays' },
            { input: '3\n4 9 5\n3\n9 4 9', output: '4 9', explanation: '4 and 9 are common' }
        ],
        referenceSolution: { python: 'from collections import Counter\nn = int(input())\na = list(map(int, input().split()))\nm = int(input())\nb = list(map(int, input().split()))\nca, cb = Counter(a), Counter(b)\nresult = []\nfor k in sorted(ca.keys()):\n    cnt = min(ca[k], cb.get(k, 0))\n    result.extend([k] * cnt)\nprint(*result if result else ["EMPTY"])' },
        testCases: [
            { input: '4\n1 2 2 1\n2\n2 2', expectedOutput: '2 2', isHidden: false, category: 'NORMAL' },
            { input: '3\n4 9 5\n3\n9 4 9', expectedOutput: '4 9', isHidden: false, category: 'NORMAL' },
            { input: '2\n1 2\n2\n3 4', expectedOutput: 'EMPTY', isHidden: true, category: 'EDGE_CASE' },
            { input: '1\n5\n1\n5', expectedOutput: '5', isHidden: true, category: 'BOUNDARY' }
        ]
    });

    questions.push({
        slug: 'count-set-bits',
        title: 'Count Set Bits',
        description: 'Given a non-negative integer N, count the number of 1-bits (set bits) in its binary representation.',
        difficulty: 'LOW',
        topics: ['Bit Manipulation'],
        tags: ['bits', 'popcount'],
        skills: ['Bit Manipulation'],
        inputFormat: 'A single integer N',
        outputFormat: 'Number of set bits',
        constraints: '0 ≤ N ≤ 10^9',
        executionMode: 'STDIN',
        examples: [
            { input: '7', output: '3', explanation: '7 = 111 in binary, 3 set bits' },
            { input: '0', output: '0', explanation: '0 has no set bits' }
        ],
        referenceSolution: { python: 'print(bin(int(input())).count("1"))' },
        testCases: [
            { input: '7', expectedOutput: '3', isHidden: false, category: 'NORMAL' },
            { input: '0', expectedOutput: '0', isHidden: false, category: 'BOUNDARY' },
            { input: '1', expectedOutput: '1', isHidden: true, category: 'BOUNDARY' },
            { input: '255', expectedOutput: '8', isHidden: true, category: 'NORMAL' },
            { input: '1024', expectedOutput: '1', isHidden: true, category: 'NORMAL' }
        ]
    });

    questions.push({
        slug: 'is-power-of-two',
        title: 'Power of Two Check',
        description: 'Given a positive integer N, determine if it is a power of 2.',
        difficulty: 'LOW',
        topics: ['Bit Manipulation', 'Math'],
        tags: ['bits', 'power-of-two'],
        skills: ['Bit Manipulation'],
        inputFormat: 'A single integer N',
        outputFormat: 'true or false',
        constraints: '1 ≤ N ≤ 10^9',
        executionMode: 'STDIN',
        examples: [
            { input: '16', output: 'true', explanation: '16 = 2^4' },
            { input: '6', output: 'false', explanation: '6 is not a power of 2' }
        ],
        referenceSolution: { python: 'n = int(input())\nprint("true" if n > 0 and (n & (n - 1)) == 0 else "false")' },
        testCases: [
            { input: '16', expectedOutput: 'true', isHidden: false, category: 'NORMAL' },
            { input: '6', expectedOutput: 'false', isHidden: false, category: 'NORMAL' },
            { input: '1', expectedOutput: 'true', isHidden: true, category: 'BOUNDARY' },
            { input: '1024', expectedOutput: 'true', isHidden: true, category: 'NORMAL' },
            { input: '3', expectedOutput: 'false', isHidden: true, category: 'NORMAL' }
        ]
    });

    questions.push({
        slug: 'single-number',
        title: 'Single Number (XOR)',
        description: 'Given a non-empty array of integers, every element appears twice except for one. Find that single one.\n\nYour solution should use linear runtime complexity without extra memory.',
        difficulty: 'LOW',
        topics: ['Bit Manipulation', 'Arrays'],
        tags: ['xor', 'single-number'],
        skills: ['Bit Manipulation'],
        inputFormat: 'First line: N\nSecond line: N integers',
        outputFormat: 'The single element',
        constraints: '1 ≤ N ≤ 10^5 (N is odd)',
        executionMode: 'STDIN',
        examples: [
            { input: '5\n2 2 1 3 3', output: '1', explanation: '1 appears only once' },
            { input: '3\n4 1 4', output: '1', explanation: '1 appears only once' }
        ],
        referenceSolution: { python: 'n = int(input())\narr = list(map(int, input().split()))\nresult = 0\nfor x in arr:\n    result ^= x\nprint(result)' },
        testCases: [
            { input: '5\n2 2 1 3 3', expectedOutput: '1', isHidden: false, category: 'NORMAL' },
            { input: '3\n4 1 4', expectedOutput: '1', isHidden: false, category: 'NORMAL' },
            { input: '1\n99', expectedOutput: '99', isHidden: true, category: 'BOUNDARY' },
            { input: '7\n1 2 3 1 2 3 5', expectedOutput: '5', isHidden: true, category: 'NORMAL' }
        ]
    });

    questions.push({
        slug: 'hamming-distance',
        title: 'Hamming Distance',
        description: 'Given two integers x and y, calculate the Hamming distance between them. The Hamming distance is the number of positions at which the corresponding bits differ.',
        difficulty: 'LOW',
        topics: ['Bit Manipulation'],
        tags: ['hamming', 'xor'],
        skills: ['Bit Manipulation'],
        inputFormat: 'Two integers x and y on one line',
        outputFormat: 'Hamming distance',
        constraints: '0 ≤ x, y ≤ 10^9',
        executionMode: 'STDIN',
        examples: [
            { input: '1 4', output: '2', explanation: '1=001, 4=100, differ in 2 positions' }
        ],
        referenceSolution: { python: 'x, y = map(int, input().split())\nprint(bin(x ^ y).count("1"))' },
        testCases: [
            { input: '1 4', expectedOutput: '2', isHidden: false, category: 'NORMAL' },
            { input: '3 1', expectedOutput: '1', isHidden: false, category: 'NORMAL' },
            { input: '0 0', expectedOutput: '0', isHidden: true, category: 'BOUNDARY' },
            { input: '15 0', expectedOutput: '4', isHidden: true, category: 'NORMAL' }
        ]
    });

    questions.push({
        slug: 'second-largest-element',
        title: 'Second Largest Element',
        description: 'Given an array of integers with at least 2 distinct values, find the second largest element.',
        difficulty: 'LOW',
        topics: ['Arrays'],
        tags: ['basics', 'min-max'],
        skills: ['Arrays'],
        inputFormat: 'First line: N\nSecond line: N integers',
        outputFormat: 'The second largest element',
        constraints: '2 ≤ N ≤ 10^5',
        executionMode: 'STDIN',
        examples: [
            { input: '5\n3 1 4 1 5', output: '4', explanation: 'Largest=5, second=4' }
        ],
        referenceSolution: { python: 'n = int(input())\narr = list(map(int, input().split()))\nunique = sorted(set(arr), reverse=True)\nprint(unique[1])' },
        testCases: [
            { input: '5\n3 1 4 1 5', expectedOutput: '4', isHidden: false, category: 'NORMAL' },
            { input: '3\n10 20 30', expectedOutput: '20', isHidden: false, category: 'NORMAL' },
            { input: '4\n1 2 2 1', expectedOutput: '1', isHidden: true, category: 'EDGE_CASE' },
            { input: '2\n1 2', expectedOutput: '1', isHidden: true, category: 'BOUNDARY' }
        ]
    });

    questions.push({
        slug: 'remove-duplicates-sorted',
        title: 'Remove Duplicates from Sorted Array',
        description: 'Given a sorted array of integers, remove the duplicates in-place and print the unique elements.',
        difficulty: 'LOW',
        topics: ['Arrays', 'Two Pointers'],
        tags: ['duplicates', 'in-place'],
        skills: ['Arrays'],
        inputFormat: 'First line: N\nSecond line: N sorted integers',
        outputFormat: 'Space-separated unique elements',
        constraints: '1 ≤ N ≤ 10^5',
        executionMode: 'STDIN',
        examples: [
            { input: '7\n1 1 2 2 3 4 4', output: '1 2 3 4', explanation: 'Duplicates removed' }
        ],
        referenceSolution: { python: 'n = int(input())\narr = list(map(int, input().split()))\nseen = []\nfor x in arr:\n    if not seen or seen[-1] != x:\n        seen.append(x)\nprint(*seen)' },
        testCases: [
            { input: '7\n1 1 2 2 3 4 4', expectedOutput: '1 2 3 4', isHidden: false, category: 'NORMAL' },
            { input: '1\n5', expectedOutput: '5', isHidden: false, category: 'BOUNDARY' },
            { input: '5\n1 1 1 1 1', expectedOutput: '1', isHidden: true, category: 'EDGE_CASE' },
            { input: '5\n1 2 3 4 5', expectedOutput: '1 2 3 4 5', isHidden: true, category: 'EDGE_CASE' }
        ]
    });

    questions.push({
        slug: 'move-zeroes-end',
        title: 'Move Zeroes to End',
        description: 'Given an array of integers, move all zeroes to the end while maintaining the relative order of non-zero elements.',
        difficulty: 'LOW',
        topics: ['Arrays', 'Two Pointers'],
        tags: ['in-place', 'zeroes'],
        skills: ['Arrays'],
        inputFormat: 'First line: N\nSecond line: N integers',
        outputFormat: 'Space-separated result array',
        constraints: '1 ≤ N ≤ 10^5',
        executionMode: 'STDIN',
        examples: [
            { input: '5\n0 1 0 3 12', output: '1 3 12 0 0', explanation: 'Zeroes moved to end' }
        ],
        referenceSolution: { python: 'n = int(input())\narr = list(map(int, input().split()))\nnon_zero = [x for x in arr if x != 0]\nnon_zero.extend([0] * (n - len(non_zero)))\nprint(*non_zero)' },
        testCases: [
            { input: '5\n0 1 0 3 12', expectedOutput: '1 3 12 0 0', isHidden: false, category: 'NORMAL' },
            { input: '1\n0', expectedOutput: '0', isHidden: false, category: 'BOUNDARY' },
            { input: '3\n1 2 3', expectedOutput: '1 2 3', isHidden: true, category: 'EDGE_CASE' },
            { input: '4\n0 0 0 1', expectedOutput: '1 0 0 0', isHidden: true, category: 'NORMAL' }
        ]
    });

    questions.push({
        slug: 'missing-number-range',
        title: 'Find Missing Number',
        description: 'Given an array containing N distinct numbers from the range [0, N], find the one number that is missing from the array.',
        difficulty: 'LOW',
        topics: ['Arrays', 'Math', 'Bit Manipulation'],
        tags: ['missing-number', 'math'],
        skills: ['Math', 'Arrays'],
        inputFormat: 'First line: N\nSecond line: N integers from range [0, N]',
        outputFormat: 'The missing number',
        constraints: '1 ≤ N ≤ 10^5',
        executionMode: 'STDIN',
        examples: [
            { input: '3\n3 0 1', output: '2', explanation: 'Missing number from [0,3] is 2' },
            { input: '2\n0 1', output: '2', explanation: 'Missing number from [0,2] is 2' }
        ],
        referenceSolution: { python: 'n = int(input())\narr = list(map(int, input().split()))\nexpected = n * (n + 1) // 2\nprint(expected - sum(arr))' },
        testCases: [
            { input: '3\n3 0 1', expectedOutput: '2', isHidden: false, category: 'NORMAL' },
            { input: '2\n0 1', expectedOutput: '2', isHidden: false, category: 'NORMAL' },
            { input: '1\n0', expectedOutput: '1', isHidden: true, category: 'BOUNDARY' },
            { input: '4\n0 1 3 4', expectedOutput: '2', isHidden: true, category: 'NORMAL' },
            { input: '1\n1', expectedOutput: '0', isHidden: true, category: 'EDGE_CASE' }
        ]
    });

    questions.push({
        slug: 'string-compression',
        title: 'String Compression',
        description: 'Given a string of lowercase letters, compress it by replacing consecutive duplicate characters with the character followed by its count. If the count is 1, just write the character. Print the compressed string.',
        difficulty: 'LOW',
        topics: ['Strings'],
        tags: ['compression', 'run-length'],
        skills: ['Strings'],
        inputFormat: 'A single string',
        outputFormat: 'Compressed string',
        constraints: '1 ≤ length ≤ 10^5',
        executionMode: 'STDIN',
        examples: [
            { input: 'aaabbc', output: 'a3b2c', explanation: 'a appears 3 times, b 2 times, c 1 time' },
            { input: 'abc', output: 'abc', explanation: 'No consecutive duplicates' }
        ],
        referenceSolution: { python: 's = input().strip()\nif not s:\n    print("")\n    exit()\nresult = []\ncount = 1\nfor i in range(1, len(s)):\n    if s[i] == s[i-1]:\n        count += 1\n    else:\n        result.append(s[i-1] + (str(count) if count > 1 else ""))\n        count = 1\nresult.append(s[-1] + (str(count) if count > 1 else ""))\nprint("".join(result))' },
        testCases: [
            { input: 'aaabbc', expectedOutput: 'a3b2c', isHidden: false, category: 'NORMAL' },
            { input: 'abc', expectedOutput: 'abc', isHidden: false, category: 'NORMAL' },
            { input: 'a', expectedOutput: 'a', isHidden: true, category: 'BOUNDARY' },
            { input: 'aaaa', expectedOutput: 'a4', isHidden: true, category: 'EDGE_CASE' },
            { input: 'aabbbcccc', expectedOutput: 'a2b3c4', isHidden: true, category: 'NORMAL' }
        ]
    });

    questions.push({
        slug: 'matrix-diagonal-sum',
        title: 'Matrix Diagonal Sum',
        description: 'Given an N×N matrix, return the sum of both diagonals. If an element is on both diagonals (center for odd N), count it only once.',
        difficulty: 'LOW',
        topics: ['Arrays', 'Math'],
        tags: ['matrix', 'diagonal'],
        skills: ['Arrays'],
        inputFormat: 'First line: N\nNext N lines: N integers each',
        outputFormat: 'Sum of both diagonals',
        constraints: '1 ≤ N ≤ 100',
        executionMode: 'STDIN',
        examples: [
            { input: '3\n1 2 3\n4 5 6\n7 8 9', output: '25', explanation: 'Primary: 1+5+9=15, Secondary: 3+5+7=15, shared 5, total=25' }
        ],
        referenceSolution: { python: 'n = int(input())\nmatrix = []\nfor _ in range(n):\n    matrix.append(list(map(int, input().split())))\ntotal = 0\nfor i in range(n):\n    total += matrix[i][i]\n    total += matrix[i][n-1-i]\nif n % 2 == 1:\n    total -= matrix[n//2][n//2]\nprint(total)' },
        testCases: [
            { input: '3\n1 2 3\n4 5 6\n7 8 9', expectedOutput: '25', isHidden: false, category: 'NORMAL' },
            { input: '1\n5', expectedOutput: '5', isHidden: false, category: 'BOUNDARY' },
            { input: '2\n1 2\n3 4', expectedOutput: '10', isHidden: true, category: 'BOUNDARY' },
            { input: '4\n1 0 0 1\n0 1 1 0\n0 1 1 0\n1 0 0 1', expectedOutput: '8', isHidden: true, category: 'NORMAL' }
        ]
    });

    
    questions.push({
        slug: 'check-leap-year',
        title: 'Check Leap Year',
        description: 'Given a year Y, determine if it is a leap year. A year is a leap year if it is divisible by 4, except end-of-century years, which must be divisible by 400. Print YES if it is a leap year, otherwise NO.',
        difficulty: 'LOW',
        topics: ['Math'],
        tags: ['math', 'conditionals'],
        skills: ['Basic Programming', 'Math'],
        inputFormat: 'A single integer Y representing the year.',
        outputFormat: 'YES if leap year, else NO',
        constraints: '1 <= Y <= 10^5',
        executionMode: 'STDIN',
        examples: [
            { input: '2000', output: 'YES', explanation: '2000 is divisible by 400, so it is a leap year.' },
            { input: '1900', output: 'NO', explanation: '1900 is divisible by 100 but not 400, so it is not a leap year.' }
        ],
        referenceSolution: { python: 'y = int(input())\nif (y % 400 == 0) or (y % 4 == 0 and y % 100 != 0):\n    print("YES")\nelse:\n    print("NO")' },
        testCases: [
            { input: '2000', expectedOutput: 'YES', isHidden: false, category: 'NORMAL' },
            { input: '1900', expectedOutput: 'NO', isHidden: false, category: 'BOUNDARY' },
            { input: '2024', expectedOutput: 'YES', isHidden: false, category: 'NORMAL' },
            { input: '2023', expectedOutput: 'NO', isHidden: true, category: 'NORMAL' },
            { input: '1600', expectedOutput: 'YES', isHidden: true, category: 'BOUNDARY' },
            { input: '1700', expectedOutput: 'NO', isHidden: true, category: 'BOUNDARY' },
            { input: '4', expectedOutput: 'YES', isHidden: true, category: 'EDGE_CASE' }
        ]
    });

    questions.push({
        slug: 'perfect-number-check',
        title: 'Check Perfect Number',
        description: 'A perfect number is a positive integer that is equal to the sum of its positive proper divisors, excluding the number itself. Given a number N, print YES if it is a perfect number, otherwise NO.',
        difficulty: 'LOW',
        topics: ['Math'],
        tags: ['math', 'divisors'],
        skills: ['Basic Programming', 'Math'],
        inputFormat: 'A single integer N.',
        outputFormat: 'YES if perfect, else NO',
        constraints: '1 <= N <= 10^7',
        executionMode: 'STDIN',
        examples: [
            { input: '6', output: 'YES', explanation: 'Proper divisors of 6 are 1, 2, 3. Sum = 1+2+3 = 6.' },
            { input: '28', output: 'YES', explanation: 'Proper divisors of 28 are 1, 2, 4, 7, 14. Sum = 28.' },
            { input: '10', output: 'NO', explanation: 'Proper divisors of 10 are 1, 2, 5. Sum = 8 != 10.' }
        ],
        referenceSolution: { python: 'n = int(input())\nif n <= 1:\n    print("NO")\nelse:\n    s = 1\n    i = 2\n    while i * i <= n:\n        if n % i == 0:\n            s += i\n            if i * i != n:\n                s += n // i\n        i += 1\n    print("YES" if s == n else "NO")' },
        testCases: [
            { input: '6', expectedOutput: 'YES', isHidden: false, category: 'NORMAL' },
            { input: '28', expectedOutput: 'YES', isHidden: false, category: 'NORMAL' },
            { input: '10', expectedOutput: 'NO', isHidden: false, category: 'NORMAL' },
            { input: '1', expectedOutput: 'NO', isHidden: true, category: 'EDGE_CASE' },
            { input: '496', expectedOutput: 'YES', isHidden: true, category: 'BOUNDARY' },
            { input: '8128', expectedOutput: 'YES', isHidden: true, category: 'BOUNDARY' },
            { input: '100', expectedOutput: 'NO', isHidden: true, category: 'NORMAL' }
        ]
    });

    // ─── MEDIUM DIFFICULTY (45 questions) ──────────────────────────

    questions.push({
        slug: 'container-with-most-water',
        title: 'Container With Most Water',
        description: 'Given N non-negative integers representing heights of vertical lines drawn on x-axis, find two lines which together with the x-axis form a container that holds the most water. Return the maximum area.',
        difficulty: 'MEDIUM',
        topics: ['Arrays', 'Two Pointers'],
        tags: ['two-pointer', 'greedy'],
        skills: ['Two Pointers'],
        inputFormat: 'First line: N\nSecond line: N integers (heights)',
        outputFormat: 'Maximum water area',
        constraints: '2 ≤ N ≤ 10^5\n0 ≤ height[i] ≤ 10^4',
        executionMode: 'STDIN',
        examples: [
            { input: '9\n1 8 6 2 5 4 8 3 7', output: '49', explanation: 'Lines at index 1 (h=8) and 8 (h=7): area = 7*7=49' }
        ],
        referenceSolution: { python: 'n = int(input())\nh = list(map(int, input().split()))\nl, r = 0, n - 1\nmax_area = 0\nwhile l < r:\n    area = min(h[l], h[r]) * (r - l)\n    max_area = max(max_area, area)\n    if h[l] < h[r]:\n        l += 1\n    else:\n        r -= 1\nprint(max_area)' },
        testCases: [
            { input: '9\n1 8 6 2 5 4 8 3 7', expectedOutput: '49', isHidden: false, category: 'NORMAL' },
            { input: '2\n1 1', expectedOutput: '1', isHidden: false, category: 'BOUNDARY' },
            { input: '3\n1 2 1', expectedOutput: '2', isHidden: true, category: 'NORMAL' },
            { input: '5\n5 5 5 5 5', expectedOutput: '20', isHidden: true, category: 'EDGE_CASE' },
            { input: '4\n1 2 4 3', expectedOutput: '4', isHidden: true, category: 'NORMAL' }
        ]
    });

    questions.push({
        slug: 'three-sum-zero',
        title: 'Three Sum (Find Triplets Summing to Zero)',
        description: 'Given an array of integers, find all unique triplets that sum to zero. Return the triplets in sorted order, with each triplet sorted internally.',
        difficulty: 'MEDIUM',
        topics: ['Arrays', 'Two Pointers', 'Sorting'],
        tags: ['three-sum', 'two-pointer'],
        skills: ['Two Pointers', 'Sorting'],
        inputFormat: 'First line: N\nSecond line: N integers',
        outputFormat: 'Each line: a triplet (space-separated), sorted. If none, print NONE.',
        constraints: '3 ≤ N ≤ 3000',
        executionMode: 'STDIN',
        examples: [
            { input: '6\n-1 0 1 2 -1 -4', output: '-1 -1 2\n-1 0 1', explanation: 'Two unique triplets sum to 0' }
        ],
        referenceSolution: { python: 'n = int(input())\nnums = list(map(int, input().split()))\nnums.sort()\nresult = []\nfor i in range(n - 2):\n    if i > 0 and nums[i] == nums[i-1]:\n        continue\n    l, r = i + 1, n - 1\n    while l < r:\n        s = nums[i] + nums[l] + nums[r]\n        if s == 0:\n            result.append((nums[i], nums[l], nums[r]))\n            while l < r and nums[l] == nums[l+1]: l += 1\n            while l < r and nums[r] == nums[r-1]: r -= 1\n            l += 1\n            r -= 1\n        elif s < 0:\n            l += 1\n        else:\n            r -= 1\nif not result:\n    print("NONE")\nelse:\n    for t in result:\n        print(*t)' },
        testCases: [
            { input: '6\n-1 0 1 2 -1 -4', expectedOutput: '-1 -1 2\n-1 0 1', isHidden: false, category: 'NORMAL' },
            { input: '3\n0 0 0', expectedOutput: '0 0 0', isHidden: false, category: 'EDGE_CASE' },
            { input: '3\n1 2 3', expectedOutput: 'NONE', isHidden: true, category: 'NORMAL' },
            { input: '4\n-1 -1 2 0', expectedOutput: '-1 -1 2', isHidden: true, category: 'NORMAL' }
        ]
    });

    questions.push({
        slug: 'product-except-self',
        title: 'Product of Array Except Self',
        description: 'Given an integer array nums, return an array where each element is the product of all elements except itself, without using division.',
        difficulty: 'MEDIUM',
        topics: ['Arrays'],
        tags: ['prefix-product'],
        skills: ['Arrays'],
        inputFormat: 'First line: N\nSecond line: N integers',
        outputFormat: 'Space-separated product array',
        constraints: '2 ≤ N ≤ 10^5',
        executionMode: 'STDIN',
        examples: [
            { input: '4\n1 2 3 4', output: '24 12 8 6', explanation: '[2*3*4, 1*3*4, 1*2*4, 1*2*3]' }
        ],
        referenceSolution: { python: 'n = int(input())\nnums = list(map(int, input().split()))\nresult = [1] * n\nleft = 1\nfor i in range(n):\n    result[i] = left\n    left *= nums[i]\nright = 1\nfor i in range(n-1, -1, -1):\n    result[i] *= right\n    right *= nums[i]\nprint(*result)' },
        testCases: [
            { input: '4\n1 2 3 4', expectedOutput: '24 12 8 6', isHidden: false, category: 'NORMAL' },
            { input: '2\n3 5', expectedOutput: '5 3', isHidden: false, category: 'BOUNDARY' },
            { input: '5\n-1 1 0 -3 3', expectedOutput: '0 0 9 0 0', isHidden: true, category: 'EDGE_CASE' },
            { input: '3\n2 2 2', expectedOutput: '4 4 4', isHidden: true, category: 'NORMAL' }
        ]
    });

    questions.push({
        slug: 'rotate-array-k',
        title: 'Rotate Array by K Positions',
        description: 'Given an array of N integers and an integer K, rotate the array to the right by K steps.',
        difficulty: 'MEDIUM',
        topics: ['Arrays'],
        tags: ['rotation', 'in-place'],
        skills: ['Arrays'],
        inputFormat: 'First line: N and K\nSecond line: N integers',
        outputFormat: 'Space-separated rotated array',
        constraints: '1 ≤ N ≤ 10^5\n0 ≤ K ≤ 10^5',
        executionMode: 'STDIN',
        examples: [
            { input: '7 3\n1 2 3 4 5 6 7', output: '5 6 7 1 2 3 4', explanation: 'Rotated right by 3' }
        ],
        referenceSolution: { python: 'n, k = map(int, input().split())\narr = list(map(int, input().split()))\nk = k % n if n > 0 else 0\nresult = arr[-k:] + arr[:-k] if k else arr\nprint(*result)' },
        testCases: [
            { input: '7 3\n1 2 3 4 5 6 7', expectedOutput: '5 6 7 1 2 3 4', isHidden: false, category: 'NORMAL' },
            { input: '3 0\n1 2 3', expectedOutput: '1 2 3', isHidden: false, category: 'BOUNDARY' },
            { input: '3 3\n1 2 3', expectedOutput: '1 2 3', isHidden: true, category: 'EDGE_CASE' },
            { input: '5 2\n-1 -2 -3 -4 -5', expectedOutput: '-4 -5 -1 -2 -3', isHidden: true, category: 'NORMAL' },
            { input: '4 6\n1 2 3 4', expectedOutput: '3 4 1 2', isHidden: true, category: 'NORMAL' }
        ]
    });

    questions.push({
        slug: 'longest-consecutive-sequence',
        title: 'Longest Consecutive Sequence',
        description: 'Given an unsorted array of integers, find the length of the longest consecutive elements sequence. Your algorithm should run in O(n) time.',
        difficulty: 'MEDIUM',
        topics: ['Arrays', 'Hashing'],
        tags: ['consecutive', 'hash-set'],
        skills: ['Hash Map'],
        inputFormat: 'First line: N\nSecond line: N integers',
        outputFormat: 'Length of longest consecutive sequence',
        constraints: '0 ≤ N ≤ 10^5',
        executionMode: 'STDIN',
        examples: [
            { input: '6\n100 4 200 1 3 2', output: '4', explanation: 'Longest consecutive: [1,2,3,4]' }
        ],
        referenceSolution: { python: 'n = int(input())\nif n == 0:\n    print(0)\nelse:\n    nums = list(map(int, input().split()))\n    s = set(nums)\n    best = 0\n    for x in s:\n        if x - 1 not in s:\n            length = 1\n            while x + length in s:\n                length += 1\n            best = max(best, length)\n    print(best)' },
        testCases: [
            { input: '6\n100 4 200 1 3 2', expectedOutput: '4', isHidden: false, category: 'NORMAL' },
            { input: '1\n5', expectedOutput: '1', isHidden: false, category: 'BOUNDARY' },
            { input: '9\n0 3 7 2 5 8 4 6 1', expectedOutput: '9', isHidden: true, category: 'NORMAL' },
            { input: '4\n1 1 1 1', expectedOutput: '1', isHidden: true, category: 'EDGE_CASE' }
        ]
    });

    questions.push({
        slug: 'subarray-sum-equals-k',
        title: 'Subarray Sum Equals K',
        description: 'Given an array of integers and a target K, find the total number of contiguous subarrays whose sum equals K.',
        difficulty: 'MEDIUM',
        topics: ['Arrays', 'Hashing'],
        tags: ['prefix-sum', 'hash-map'],
        skills: ['Hash Map', 'Prefix Sum'],
        inputFormat: 'First line: N and K\nSecond line: N integers',
        outputFormat: 'Count of subarrays',
        constraints: '1 ≤ N ≤ 10^5',
        executionMode: 'STDIN',
        examples: [
            { input: '4 2\n1 1 1 1', output: '3', explanation: 'Subarrays [1,1] at indices (0,1), (1,2), (2,3)' }
        ],
        referenceSolution: { python: 'from collections import defaultdict\nn, k = map(int, input().split())\nnums = list(map(int, input().split()))\nprefix_count = defaultdict(int)\nprefix_count[0] = 1\nrunning = 0\ncount = 0\nfor x in nums:\n    running += x\n    count += prefix_count[running - k]\n    prefix_count[running] += 1\nprint(count)' },
        testCases: [
            { input: '4 2\n1 1 1 1', expectedOutput: '3', isHidden: false, category: 'NORMAL' },
            { input: '3 3\n1 2 3', expectedOutput: '2', isHidden: false, category: 'NORMAL' },
            { input: '1 0\n0', expectedOutput: '1', isHidden: true, category: 'BOUNDARY' },
            { input: '5 0\n1 -1 1 -1 0', expectedOutput: '7', isHidden: true, category: 'EDGE_CASE' }
        ]
    });

    questions.push({
        slug: 'merge-overlapping-intervals',
        title: 'Merge Overlapping Intervals',
        description: 'Given a collection of intervals, merge all overlapping intervals and return the merged result.',
        difficulty: 'MEDIUM',
        topics: ['Arrays', 'Sorting', 'Intervals'],
        tags: ['intervals', 'merge'],
        skills: ['Sorting', 'Intervals'],
        inputFormat: 'First line: N\nNext N lines: two integers (start end) per interval',
        outputFormat: 'Each merged interval on a line: start end',
        constraints: '1 ≤ N ≤ 10^4',
        executionMode: 'STDIN',
        examples: [
            { input: '4\n1 3\n2 6\n8 10\n15 18', output: '1 6\n8 10\n15 18', explanation: '[1,3] and [2,6] overlap → [1,6]' }
        ],
        referenceSolution: { python: 'n = int(input())\nintervals = []\nfor _ in range(n):\n    a, b = map(int, input().split())\n    intervals.append([a, b])\nintervals.sort()\nmerged = [intervals[0]]\nfor s, e in intervals[1:]:\n    if s <= merged[-1][1]:\n        merged[-1][1] = max(merged[-1][1], e)\n    else:\n        merged.append([s, e])\nfor m in merged:\n    print(*m)' },
        testCases: [
            { input: '4\n1 3\n2 6\n8 10\n15 18', expectedOutput: '1 6\n8 10\n15 18', isHidden: false, category: 'NORMAL' },
            { input: '2\n1 4\n4 5', expectedOutput: '1 5', isHidden: false, category: 'BOUNDARY' },
            { input: '1\n1 1', expectedOutput: '1 1', isHidden: true, category: 'BOUNDARY' },
            { input: '3\n1 10\n2 3\n4 5', expectedOutput: '1 10', isHidden: true, category: 'EDGE_CASE' }
        ]
    });

    questions.push({
        slug: 'jump-game',
        title: 'Jump Game',
        description: 'Given an array of non-negative integers where each element represents the maximum jump length from that position, determine if you can reach the last index starting from index 0.',
        difficulty: 'MEDIUM',
        topics: ['Arrays', 'Greedy'],
        tags: ['greedy', 'jump'],
        skills: ['Greedy'],
        inputFormat: 'First line: N\nSecond line: N integers',
        outputFormat: 'true or false',
        constraints: '1 ≤ N ≤ 10^5',
        executionMode: 'STDIN',
        examples: [
            { input: '5\n2 3 1 1 4', output: 'true', explanation: 'Jump 1→2→4 or 1→3→4' },
            { input: '5\n3 2 1 0 4', output: 'false', explanation: 'Stuck at index 3' }
        ],
        referenceSolution: { python: 'n = int(input())\nnums = list(map(int, input().split()))\nreach = 0\nfor i in range(n):\n    if i > reach:\n        print("false")\n        exit()\n    reach = max(reach, i + nums[i])\nprint("true")' },
        testCases: [
            { input: '5\n2 3 1 1 4', expectedOutput: 'true', isHidden: false, category: 'NORMAL' },
            { input: '5\n3 2 1 0 4', expectedOutput: 'false', isHidden: false, category: 'NORMAL' },
            { input: '1\n0', expectedOutput: 'true', isHidden: true, category: 'BOUNDARY' },
            { input: '2\n0 1', expectedOutput: 'false', isHidden: true, category: 'EDGE_CASE' }
        ]
    });

    questions.push({
        slug: 'majority-element',
        title: 'Majority Element',
        description: 'Given an array of N integers, find the majority element (the element that appears more than N/2 times). The majority element always exists.',
        difficulty: 'MEDIUM',
        topics: ['Arrays'],
        tags: ['boyer-moore', 'majority'],
        skills: ['Arrays'],
        inputFormat: 'First line: N\nSecond line: N integers',
        outputFormat: 'The majority element',
        constraints: '1 ≤ N ≤ 10^5',
        executionMode: 'STDIN',
        examples: [
            { input: '7\n2 2 1 1 1 2 2', output: '2', explanation: '2 appears 4 times out of 7' }
        ],
        referenceSolution: { python: 'n = int(input())\nnums = list(map(int, input().split()))\ncandidate = nums[0]\ncount = 1\nfor i in range(1, n):\n    if count == 0:\n        candidate = nums[i]\n        count = 1\n    elif nums[i] == candidate:\n        count += 1\n    else:\n        count -= 1\nprint(candidate)' },
        testCases: [
            { input: '7\n2 2 1 1 1 2 2', expectedOutput: '2', isHidden: false, category: 'NORMAL' },
            { input: '3\n3 2 3', expectedOutput: '3', isHidden: false, category: 'NORMAL' },
            { input: '1\n1', expectedOutput: '1', isHidden: true, category: 'BOUNDARY' },
            { input: '5\n5 5 5 1 2', expectedOutput: '5', isHidden: true, category: 'NORMAL' }
        ]
    });

    questions.push({
        slug: 'spiral-matrix',
        title: 'Spiral Matrix Traversal',
        description: 'Given an M×N matrix, return all elements in spiral order (right, down, left, up, repeat).',
        difficulty: 'MEDIUM',
        topics: ['Arrays'],
        tags: ['matrix', 'spiral'],
        skills: ['Arrays'],
        inputFormat: 'First line: M and N\nNext M lines: N integers each',
        outputFormat: 'Space-separated elements in spiral order',
        constraints: '1 ≤ M, N ≤ 100',
        executionMode: 'STDIN',
        examples: [
            { input: '3 3\n1 2 3\n4 5 6\n7 8 9', output: '1 2 3 6 9 8 7 4 5', explanation: 'Spiral from outside inward' }
        ],
        referenceSolution: { python: 'm, n = map(int, input().split())\nmatrix = []\nfor _ in range(m):\n    matrix.append(list(map(int, input().split())))\nresult = []\ntop, bottom, left, right = 0, m-1, 0, n-1\nwhile top <= bottom and left <= right:\n    for j in range(left, right+1): result.append(matrix[top][j])\n    top += 1\n    for i in range(top, bottom+1): result.append(matrix[i][right])\n    right -= 1\n    if top <= bottom:\n        for j in range(right, left-1, -1): result.append(matrix[bottom][j])\n        bottom -= 1\n    if left <= right:\n        for i in range(bottom, top-1, -1): result.append(matrix[i][left])\n        left += 1\nprint(*result)' },
        testCases: [
            { input: '3 3\n1 2 3\n4 5 6\n7 8 9', expectedOutput: '1 2 3 6 9 8 7 4 5', isHidden: false, category: 'NORMAL' },
            { input: '1 4\n1 2 3 4', expectedOutput: '1 2 3 4', isHidden: false, category: 'BOUNDARY' },
            { input: '2 2\n1 2\n3 4', expectedOutput: '1 2 4 3', isHidden: true, category: 'BOUNDARY' },
            { input: '3 1\n1\n2\n3', expectedOutput: '1 2 3', isHidden: true, category: 'BOUNDARY' }
        ]
    });

    questions.push({
        slug: 'longest-substring-no-repeat',
        title: 'Longest Substring Without Repeating Characters',
        description: 'Given a string, find the length of the longest substring without repeating characters.',
        difficulty: 'MEDIUM',
        topics: ['Strings', 'Hashing'],
        tags: ['sliding-window', 'hash-map'],
        skills: ['Sliding Window', 'Hash Map'],
        inputFormat: 'A single string',
        outputFormat: 'Length of longest substring',
        constraints: '0 ≤ length ≤ 5×10^4',
        executionMode: 'STDIN',
        examples: [
            { input: 'abcabcbb', output: '3', explanation: 'Longest is "abc" with length 3' },
            { input: 'bbbbb', output: '1', explanation: 'Single character "b"' }
        ],
        referenceSolution: { python: 's = input().strip()\nif not s:\n    print(0)\n    exit()\nseen = {}\nstart = 0\nmax_len = 0\nfor i, c in enumerate(s):\n    if c in seen and seen[c] >= start:\n        start = seen[c] + 1\n    seen[c] = i\n    max_len = max(max_len, i - start + 1)\nprint(max_len)' },
        testCases: [
            { input: 'abcabcbb', expectedOutput: '3', isHidden: false, category: 'NORMAL' },
            { input: 'bbbbb', expectedOutput: '1', isHidden: false, category: 'NORMAL' },
            { input: 'pwwkew', expectedOutput: '3', isHidden: true, category: 'NORMAL' },
            { input: 'a', expectedOutput: '1', isHidden: true, category: 'BOUNDARY' },
            { input: 'abcdef', expectedOutput: '6', isHidden: true, category: 'EDGE_CASE' }
        ]
    });

    questions.push({
        slug: 'longest-palindromic-substring',
        title: 'Longest Palindromic Substring',
        description: 'Given a string, find the longest palindromic substring and return its length.',
        difficulty: 'MEDIUM',
        topics: ['Strings', 'Dynamic Programming'],
        tags: ['palindrome', 'expand-around-center'],
        skills: ['Strings', 'DP'],
        inputFormat: 'A single string',
        outputFormat: 'Length of longest palindromic substring',
        constraints: '1 ≤ length ≤ 1000',
        executionMode: 'STDIN',
        examples: [
            { input: 'babad', output: '3', explanation: '"bab" or "aba" — length 3' },
            { input: 'cbbd', output: '2', explanation: '"bb" — length 2' }
        ],
        referenceSolution: { python: 's = input().strip()\ndef expand(l, r):\n    while l >= 0 and r < len(s) and s[l] == s[r]:\n        l -= 1\n        r += 1\n    return r - l - 1\nbest = 1\nfor i in range(len(s)):\n    best = max(best, expand(i, i), expand(i, i+1))\nprint(best)' },
        testCases: [
            { input: 'babad', expectedOutput: '3', isHidden: false, category: 'NORMAL' },
            { input: 'cbbd', expectedOutput: '2', isHidden: false, category: 'NORMAL' },
            { input: 'a', expectedOutput: '1', isHidden: true, category: 'BOUNDARY' },
            { input: 'racecar', expectedOutput: '7', isHidden: true, category: 'NORMAL' },
            { input: 'abcd', expectedOutput: '1', isHidden: true, category: 'EDGE_CASE' }
        ]
    });

    questions.push({
        slug: 'group-anagrams',
        title: 'Group Anagrams',
        description: 'Given an array of strings, group the anagrams together. Output each group on a separate line with words sorted alphabetically, and groups sorted by their first word.',
        difficulty: 'MEDIUM',
        topics: ['Strings', 'Hashing', 'Sorting'],
        tags: ['anagram', 'hash-map'],
        skills: ['Hash Map', 'Strings'],
        inputFormat: 'First line: N\nSecond line: N space-separated strings',
        outputFormat: 'Each group on a line, words space-separated',
        constraints: '1 ≤ N ≤ 10^4',
        executionMode: 'STDIN',
        examples: [
            { input: '6\neat tea tan ate nat bat', output: 'ate eat tea\nbat\nant nat tan', explanation: 'Anagram groups identified' }
        ],
        referenceSolution: { python: 'from collections import defaultdict\nn = int(input())\nwords = input().split()\ngroups = defaultdict(list)\nfor w in words:\n    key = "".join(sorted(w))\n    groups[key].append(w)\nresult = []\nfor key in groups:\n    group = sorted(groups[key])\n    result.append(group)\nresult.sort(key=lambda g: g[0])\nfor g in result:\n    print(*g)' },
        testCases: [
            { input: '6\neat tea tan ate nat bat', expectedOutput: 'ate eat tea\nbat\nnat tan', isHidden: false, category: 'NORMAL' },
            { input: '1\na', expectedOutput: 'a', isHidden: false, category: 'BOUNDARY' },
            { input: '3\nabc bca cab', expectedOutput: 'abc bca cab', isHidden: true, category: 'NORMAL' }
        ]
    });

    questions.push({
        slug: 'string-to-integer-atoi',
        title: 'String to Integer (Custom atoi)',
        description: 'Implement a custom string-to-integer conversion function that handles leading whitespace, optional sign, digits, and clamps to 32-bit signed integer range [-2^31, 2^31 - 1].',
        difficulty: 'MEDIUM',
        topics: ['Strings', 'Math'],
        tags: ['parsing', 'string'],
        skills: ['Strings'],
        inputFormat: 'A single string',
        outputFormat: 'The parsed integer',
        constraints: '0 ≤ length ≤ 200',
        executionMode: 'STDIN',
        examples: [
            { input: '   -42', output: '-42', explanation: 'Trim whitespace, parse sign and digits' },
            { input: '4193 with words', output: '4193', explanation: 'Parse digits until non-digit' }
        ],
        referenceSolution: { python: 's = input().strip()\nif not s:\n    print(0)\n    exit()\ni = 0\nwhile i < len(s) and s[i] == " ":\n    i += 1\nsign = 1\nif i < len(s) and s[i] in "+-":\n    sign = -1 if s[i] == "-" else 1\n    i += 1\nresult = 0\nwhile i < len(s) and s[i].isdigit():\n    result = result * 10 + int(s[i])\n    i += 1\nresult *= sign\nresult = max(-2**31, min(2**31 - 1, result))\nprint(result)' },
        testCases: [
            { input: '   -42', expectedOutput: '-42', isHidden: false, category: 'NORMAL' },
            { input: '4193 with words', expectedOutput: '4193', isHidden: false, category: 'NORMAL' },
            { input: 'words and 987', expectedOutput: '0', isHidden: true, category: 'EDGE_CASE' },
            { input: '-91283472332', expectedOutput: '-2147483648', isHidden: true, category: 'BOUNDARY' },
            { input: '+1', expectedOutput: '1', isHidden: true, category: 'NORMAL' }
        ]
    });

    questions.push({
        slug: 'decode-ways',
        title: 'Decode Ways',
        description: 'A message encoded with digits (A=1, B=2, ..., Z=26). Given a string of digits, count the total number of ways to decode it.',
        difficulty: 'MEDIUM',
        topics: ['Strings', 'Dynamic Programming'],
        tags: ['dp', 'decode'],
        skills: ['Dynamic Programming'],
        inputFormat: 'A string of digits',
        outputFormat: 'Number of decode ways',
        constraints: '1 ≤ length ≤ 100',
        executionMode: 'STDIN',
        examples: [
            { input: '12', output: '2', explanation: '"AB" (1,2) or "L" (12)' },
            { input: '226', output: '3', explanation: '"BZ" (2,26), "VF" (22,6), "BBF" (2,2,6)' }
        ],
        referenceSolution: { python: 's = input().strip()\nn = len(s)\nif n == 0 or s[0] == "0":\n    print(0)\n    exit()\ndp = [0] * (n + 1)\ndp[0] = 1\ndp[1] = 1\nfor i in range(2, n + 1):\n    one = int(s[i-1:i])\n    two = int(s[i-2:i])\n    if 1 <= one <= 9:\n        dp[i] += dp[i-1]\n    if 10 <= two <= 26:\n        dp[i] += dp[i-2]\nprint(dp[n])' },
        testCases: [
            { input: '12', expectedOutput: '2', isHidden: false, category: 'NORMAL' },
            { input: '226', expectedOutput: '3', isHidden: false, category: 'NORMAL' },
            { input: '0', expectedOutput: '0', isHidden: true, category: 'BOUNDARY' },
            { input: '10', expectedOutput: '1', isHidden: true, category: 'EDGE_CASE' },
            { input: '1111', expectedOutput: '5', isHidden: true, category: 'NORMAL' }
        ]
    });

    questions.push({
        slug: 'word-break-check',
        title: 'Word Break',
        description: 'Given a string s and a dictionary of words, determine if s can be segmented into a space-separated sequence of one or more dictionary words.',
        difficulty: 'MEDIUM',
        topics: ['Strings', 'Dynamic Programming'],
        tags: ['dp', 'word-break'],
        skills: ['Dynamic Programming'],
        inputFormat: 'First line: the string s\nSecond line: N (number of dictionary words)\nThird line: N space-separated words',
        outputFormat: 'true or false',
        constraints: '1 ≤ |s| ≤ 300\n1 ≤ N ≤ 1000',
        executionMode: 'STDIN',
        examples: [
            { input: 'leetcode\n2\nleet code', output: 'true', explanation: '"leet" + "code"' },
            { input: 'catsandog\n5\ncats dog sand and cat', output: 'false', explanation: 'Cannot segment fully' }
        ],
        referenceSolution: { python: 's = input().strip()\nn = int(input())\nwords = set(input().split())\ndp = [False] * (len(s) + 1)\ndp[0] = True\nfor i in range(1, len(s) + 1):\n    for j in range(i):\n        if dp[j] and s[j:i] in words:\n            dp[i] = True\n            break\nprint("true" if dp[len(s)] else "false")' },
        testCases: [
            { input: 'leetcode\n2\nleet code', expectedOutput: 'true', isHidden: false, category: 'NORMAL' },
            { input: 'catsandog\n5\ncats dog sand and cat', expectedOutput: 'false', isHidden: false, category: 'NORMAL' },
            { input: 'a\n1\na', expectedOutput: 'true', isHidden: true, category: 'BOUNDARY' },
            { input: 'applepenapple\n2\napple pen', expectedOutput: 'true', isHidden: true, category: 'NORMAL' }
        ]
    });

    questions.push({
        slug: 'validate-bst',
        title: 'Validate Binary Search Tree',
        description: 'Given a binary tree represented as a level-order array (with -1 for null nodes), determine if it is a valid Binary Search Tree (BST). In a BST, left subtree values are strictly less and right subtree values are strictly greater.',
        difficulty: 'MEDIUM',
        topics: ['Trees'],
        tags: ['bst', 'validation', 'recursion'],
        skills: ['Trees', 'Recursion'],
        inputFormat: 'Space-separated level-order values (-1 for null)',
        outputFormat: 'true or false',
        constraints: '1 ≤ nodes ≤ 10^4',
        executionMode: 'STDIN',
        examples: [
            { input: '2 1 3', output: 'true', explanation: 'Valid BST: 1 < 2 < 3' },
            { input: '5 1 4 -1 -1 3 6', output: 'false', explanation: 'Node 4 in right subtree is less than 5' }
        ],
        referenceSolution: { python: 'import sys\ndata = list(map(int, input().split()))\nif not data or data[0] == -1:\n    print("true")\n    exit()\n\ndef is_valid(idx, lo, hi):\n    if idx >= len(data) or data[idx] == -1:\n        return True\n    val = data[idx]\n    if val <= lo or val >= hi:\n        return False\n    return is_valid(2*idx+1, lo, val) and is_valid(2*idx+2, val, hi)\n\nsys.setrecursionlimit(100000)\nprint("true" if is_valid(0, float("-inf"), float("inf")) else "false")' },
        testCases: [
            { input: '2 1 3', expectedOutput: 'true', isHidden: false, category: 'NORMAL' },
            { input: '5 1 4 -1 -1 3 6', expectedOutput: 'false', isHidden: false, category: 'NORMAL' },
            { input: '1', expectedOutput: 'true', isHidden: true, category: 'BOUNDARY' },
            { input: '10 5 15 -1 -1 6 20', expectedOutput: 'false', isHidden: true, category: 'EDGE_CASE' }
        ]
    });

    questions.push({
        slug: 'level-order-traversal',
        title: 'Binary Tree Level Order Traversal',
        description: 'Given a binary tree as level-order input (-1 for null), return the level order traversal as space-separated values per level, each level on a new line.',
        difficulty: 'MEDIUM',
        topics: ['Trees', 'Queues'],
        tags: ['bfs', 'level-order'],
        skills: ['Trees', 'BFS'],
        inputFormat: 'Space-separated level-order values (-1 for null)',
        outputFormat: 'Each level on a new line',
        constraints: '1 ≤ nodes ≤ 10^4',
        executionMode: 'STDIN',
        examples: [
            { input: '3 9 20 -1 -1 15 7', output: '3\n9 20\n15 7', explanation: 'Level 0: [3], Level 1: [9,20], Level 2: [15,7]' }
        ],
        referenceSolution: { python: 'from collections import deque\ndata = list(map(int, input().split()))\nif not data or data[0] == -1:\n    exit()\nq = deque([0])\nwhile q:\n    level = []\n    for _ in range(len(q)):\n        idx = q.popleft()\n        if idx < len(data) and data[idx] != -1:\n            level.append(data[idx])\n            q.append(2*idx+1)\n            q.append(2*idx+2)\n    if level:\n        print(*level)' },
        testCases: [
            { input: '3 9 20 -1 -1 15 7', expectedOutput: '3\n9 20\n15 7', isHidden: false, category: 'NORMAL' },
            { input: '1', expectedOutput: '1', isHidden: false, category: 'BOUNDARY' },
            { input: '1 2 3 4 5 6 7', expectedOutput: '1\n2 3\n4 5 6 7', isHidden: true, category: 'NORMAL' }
        ]
    });

    questions.push({
        slug: 'coin-change-min',
        title: 'Coin Change (Minimum Coins)',
        description: 'Given a set of coin denominations and a target amount, find the minimum number of coins needed to make that amount. If impossible, return -1.',
        difficulty: 'MEDIUM',
        topics: ['Dynamic Programming'],
        tags: ['dp', 'coin-change'],
        skills: ['Dynamic Programming'],
        inputFormat: 'First line: N (number of denominations) and amount\nSecond line: N coin values',
        outputFormat: 'Minimum coins, or -1',
        constraints: '1 ≤ N ≤ 12\n0 ≤ amount ≤ 10^4',
        executionMode: 'STDIN',
        examples: [
            { input: '3 11\n1 5 6', output: '3', explanation: '5+5+1=11, or 6+5=11 (min 2)... wait, 6+5=11 is 2 coins' }
        ],
        referenceSolution: { python: 'n, amount = map(int, input().split())\ncoins = list(map(int, input().split()))\ndp = [float("inf")] * (amount + 1)\ndp[0] = 0\nfor i in range(1, amount + 1):\n    for c in coins:\n        if c <= i and dp[i - c] + 1 < dp[i]:\n            dp[i] = dp[i - c] + 1\nprint(dp[amount] if dp[amount] != float("inf") else -1)' },
        testCases: [
            { input: '3 11\n1 5 6', expectedOutput: '2', isHidden: false, category: 'NORMAL' },
            { input: '3 11\n1 2 5', expectedOutput: '3', isHidden: false, category: 'NORMAL' },
            { input: '1 3\n2', expectedOutput: '-1', isHidden: true, category: 'EDGE_CASE' },
            { input: '1 0\n1', expectedOutput: '0', isHidden: true, category: 'BOUNDARY' },
            { input: '3 6\n1 3 4', expectedOutput: '2', isHidden: true, category: 'NORMAL' }
        ]
    });

    questions.push({
        slug: 'longest-increasing-subsequence',
        title: 'Longest Increasing Subsequence',
        description: 'Given an array of integers, find the length of the longest strictly increasing subsequence.',
        difficulty: 'MEDIUM',
        topics: ['Dynamic Programming', 'Arrays'],
        tags: ['lis', 'dp'],
        skills: ['Dynamic Programming'],
        inputFormat: 'First line: N\nSecond line: N integers',
        outputFormat: 'Length of LIS',
        constraints: '1 ≤ N ≤ 2500',
        executionMode: 'STDIN',
        examples: [
            { input: '8\n10 9 2 5 3 7 101 18', output: '4', explanation: '[2,3,7,101] or [2,5,7,101]' }
        ],
        referenceSolution: { python: 'import bisect\nn = int(input())\nnums = list(map(int, input().split()))\ntails = []\nfor x in nums:\n    pos = bisect.bisect_left(tails, x)\n    if pos == len(tails):\n        tails.append(x)\n    else:\n        tails[pos] = x\nprint(len(tails))' },
        testCases: [
            { input: '8\n10 9 2 5 3 7 101 18', expectedOutput: '4', isHidden: false, category: 'NORMAL' },
            { input: '1\n5', expectedOutput: '1', isHidden: false, category: 'BOUNDARY' },
            { input: '5\n5 4 3 2 1', expectedOutput: '1', isHidden: true, category: 'EDGE_CASE' },
            { input: '5\n1 2 3 4 5', expectedOutput: '5', isHidden: true, category: 'NORMAL' }
        ]
    });

    questions.push({
        slug: 'house-robber',
        title: 'House Robber',
        description: 'You are a robber planning to rob houses along a street. Each house has a certain amount of money. Adjacent houses have connected security, so you cannot rob two adjacent houses. Find the maximum money you can rob.',
        difficulty: 'MEDIUM',
        topics: ['Dynamic Programming'],
        tags: ['dp', 'house-robber'],
        skills: ['Dynamic Programming'],
        inputFormat: 'First line: N\nSecond line: N integers (money in each house)',
        outputFormat: 'Maximum money',
        constraints: '1 ≤ N ≤ 100',
        executionMode: 'STDIN',
        examples: [
            { input: '4\n1 2 3 1', output: '4', explanation: 'Rob houses 1 and 3: 1+3=4' },
            { input: '5\n2 7 9 3 1', output: '12', explanation: 'Rob houses 1,3,5: 2+9+1=12' }
        ],
        referenceSolution: { python: 'n = int(input())\nnums = list(map(int, input().split()))\nif n == 1:\n    print(nums[0])\n    exit()\nprev2, prev1 = 0, 0\nfor x in nums:\n    curr = max(prev1, prev2 + x)\n    prev2 = prev1\n    prev1 = curr\nprint(prev1)' },
        testCases: [
            { input: '4\n1 2 3 1', expectedOutput: '4', isHidden: false, category: 'NORMAL' },
            { input: '5\n2 7 9 3 1', expectedOutput: '12', isHidden: false, category: 'NORMAL' },
            { input: '1\n5', expectedOutput: '5', isHidden: true, category: 'BOUNDARY' },
            { input: '3\n100 1 100', expectedOutput: '200', isHidden: true, category: 'NORMAL' }
        ]
    });

    questions.push({
        slug: 'unique-paths-grid',
        title: 'Unique Paths in Grid',
        description: 'A robot is located at the top-left corner of an M×N grid. The robot can only move right or down. How many unique paths are there to reach the bottom-right corner?',
        difficulty: 'MEDIUM',
        topics: ['Dynamic Programming', 'Math'],
        tags: ['dp', 'grid'],
        skills: ['Dynamic Programming'],
        inputFormat: 'Two integers M and N',
        outputFormat: 'Number of unique paths',
        constraints: '1 ≤ M, N ≤ 100',
        executionMode: 'STDIN',
        examples: [
            { input: '3 7', output: '28', explanation: '28 unique paths from top-left to bottom-right' },
            { input: '3 2', output: '3', explanation: 'Right-Down-Down, Down-Right-Down, Down-Down-Right' }
        ],
        referenceSolution: { python: 'm, n = map(int, input().split())\ndp = [[1]*n for _ in range(m)]\nfor i in range(1, m):\n    for j in range(1, n):\n        dp[i][j] = dp[i-1][j] + dp[i][j-1]\nprint(dp[m-1][n-1])' },
        testCases: [
            { input: '3 7', expectedOutput: '28', isHidden: false, category: 'NORMAL' },
            { input: '3 2', expectedOutput: '3', isHidden: false, category: 'NORMAL' },
            { input: '1 1', expectedOutput: '1', isHidden: true, category: 'BOUNDARY' },
            { input: '7 3', expectedOutput: '28', isHidden: true, category: 'NORMAL' }
        ]
    });

    questions.push({
        slug: 'number-of-islands',
        title: 'Number of Islands',
        description: 'Given an M×N 2D grid map of \'1\'s (land) and \'0\'s (water), count the number of islands. An island is surrounded by water and connected horizontally/vertically.',
        difficulty: 'MEDIUM',
        topics: ['Graphs', 'Arrays'],
        tags: ['bfs', 'dfs', 'islands'],
        skills: ['Graph Traversal', 'BFS', 'DFS'],
        inputFormat: 'First line: M and N\nNext M lines: N space-separated 0s and 1s',
        outputFormat: 'Number of islands',
        constraints: '1 ≤ M, N ≤ 300',
        executionMode: 'STDIN',
        examples: [
            { input: '4 5\n1 1 1 1 0\n1 1 0 1 0\n1 1 0 0 0\n0 0 0 0 0', output: '1', explanation: 'One connected island' },
            { input: '4 5\n1 1 0 0 0\n1 1 0 0 0\n0 0 1 0 0\n0 0 0 1 1', output: '3', explanation: 'Three separate islands' }
        ],
        referenceSolution: { python: 'import sys\nsys.setrecursionlimit(100000)\nm, n = map(int, input().split())\ngrid = []\nfor _ in range(m):\n    grid.append(list(map(int, input().split())))\ndef dfs(i, j):\n    if i < 0 or i >= m or j < 0 or j >= n or grid[i][j] != 1:\n        return\n    grid[i][j] = 0\n    dfs(i+1,j); dfs(i-1,j); dfs(i,j+1); dfs(i,j-1)\ncount = 0\nfor i in range(m):\n    for j in range(n):\n        if grid[i][j] == 1:\n            dfs(i, j)\n            count += 1\nprint(count)' },
        testCases: [
            { input: '4 5\n1 1 1 1 0\n1 1 0 1 0\n1 1 0 0 0\n0 0 0 0 0', expectedOutput: '1', isHidden: false, category: 'NORMAL' },
            { input: '4 5\n1 1 0 0 0\n1 1 0 0 0\n0 0 1 0 0\n0 0 0 1 1', expectedOutput: '3', isHidden: false, category: 'NORMAL' },
            { input: '1 1\n1', expectedOutput: '1', isHidden: true, category: 'BOUNDARY' },
            { input: '3 3\n0 0 0\n0 0 0\n0 0 0', expectedOutput: '0', isHidden: true, category: 'EDGE_CASE' }
        ]
    });

    questions.push({
        slug: 'detect-cycle-graph',
        title: 'Detect Cycle in Undirected Graph',
        description: 'Given an undirected graph with V vertices and E edges, determine if the graph contains a cycle.',
        difficulty: 'MEDIUM',
        topics: ['Graphs'],
        tags: ['cycle-detection', 'dfs', 'union-find'],
        skills: ['Graph Traversal', 'DFS'],
        inputFormat: 'First line: V and E\nNext E lines: u v (0-indexed edge)',
        outputFormat: 'true if cycle exists, false otherwise',
        constraints: '1 ≤ V ≤ 10^4\n0 ≤ E ≤ 10^5',
        executionMode: 'STDIN',
        examples: [
            { input: '4 4\n0 1\n1 2\n2 3\n3 0', output: 'true', explanation: 'Cycle: 0→1→2→3→0' },
            { input: '3 2\n0 1\n1 2', output: 'false', explanation: 'No cycle in this tree' }
        ],
        referenceSolution: { python: 'import sys\nsys.setrecursionlimit(200000)\nv, e = map(int, input().split())\nadj = [[] for _ in range(v)]\nfor _ in range(e):\n    u, w = map(int, input().split())\n    adj[u].append(w)\n    adj[w].append(u)\nvisited = [False] * v\ndef dfs(node, parent):\n    visited[node] = True\n    for nb in adj[node]:\n        if not visited[nb]:\n            if dfs(nb, node):\n                return True\n        elif nb != parent:\n            return True\n    return False\nfound = False\nfor i in range(v):\n    if not visited[i]:\n        if dfs(i, -1):\n            found = True\n            break\nprint("true" if found else "false")' },
        testCases: [
            { input: '4 4\n0 1\n1 2\n2 3\n3 0', expectedOutput: 'true', isHidden: false, category: 'NORMAL' },
            { input: '3 2\n0 1\n1 2', expectedOutput: 'false', isHidden: false, category: 'NORMAL' },
            { input: '1 0', expectedOutput: 'false', isHidden: true, category: 'BOUNDARY' },
            { input: '5 4\n0 1\n1 2\n2 3\n3 4', expectedOutput: 'false', isHidden: true, category: 'NORMAL' }
        ]
    });

    questions.push({
        slug: 'topological-sort',
        title: 'Topological Sort',
        description: 'Given a Directed Acyclic Graph (DAG) with V vertices and E edges, print a valid topological ordering of vertices.',
        difficulty: 'MEDIUM',
        topics: ['Graphs', 'Sorting'],
        tags: ['topological-sort', 'bfs', 'kahn'],
        skills: ['Graph Traversal', 'BFS'],
        inputFormat: 'First line: V and E\nNext E lines: u v (directed edge u→v)',
        outputFormat: 'Space-separated topological ordering',
        constraints: '1 ≤ V ≤ 10^4',
        executionMode: 'STDIN',
        examples: [
            { input: '4 4\n0 1\n0 2\n1 3\n2 3', output: '0 1 2 3', explanation: 'Valid topological order' }
        ],
        referenceSolution: { python: 'from collections import deque\nv, e = map(int, input().split())\nadj = [[] for _ in range(v)]\nindeg = [0] * v\nfor _ in range(e):\n    u, w = map(int, input().split())\n    adj[u].append(w)\n    indeg[w] += 1\nq = deque([i for i in range(v) if indeg[i] == 0])\nresult = []\nwhile q:\n    node = q.popleft()\n    result.append(node)\n    for nb in adj[node]:\n        indeg[nb] -= 1\n        if indeg[nb] == 0:\n            q.append(nb)\nprint(*result)' },
        testCases: [
            { input: '4 4\n0 1\n0 2\n1 3\n2 3', expectedOutput: '0 1 2 3', isHidden: false, category: 'NORMAL' },
            { input: '2 1\n0 1', expectedOutput: '0 1', isHidden: false, category: 'BOUNDARY' },
            { input: '3 0', expectedOutput: '0 1 2', isHidden: true, category: 'EDGE_CASE' }
        ]
    });

    questions.push({
        slug: 'min-stack-operations',
        title: 'Min Stack',
        description: 'Design a stack that supports push, pop, and retrieving the minimum element in constant time. Given a sequence of operations, output the results.',
        difficulty: 'MEDIUM',
        topics: ['Stacks'],
        tags: ['min-stack', 'design'],
        skills: ['Stacks', 'Design'],
        inputFormat: 'First line: N operations\nNext N lines: operation (push X, pop, getMin)',
        outputFormat: 'Output for each getMin on a separate line',
        constraints: '1 ≤ N ≤ 10^4',
        executionMode: 'STDIN',
        examples: [
            { input: '6\npush 3\npush 5\ngetMin\npush 2\ngetMin\npop', output: '3\n2', explanation: 'After push 3,5: min=3. After push 2: min=2' }
        ],
        referenceSolution: { python: 'n = int(input())\nstack = []\nmin_stack = []\nfor _ in range(n):\n    op = input().strip().split()\n    if op[0] == "push":\n        val = int(op[1])\n        stack.append(val)\n        if not min_stack or val <= min_stack[-1]:\n            min_stack.append(val)\n    elif op[0] == "pop":\n        if stack:\n            val = stack.pop()\n            if val == min_stack[-1]:\n                min_stack.pop()\n    elif op[0] == "getMin":\n        print(min_stack[-1] if min_stack else "EMPTY")' },
        testCases: [
            { input: '6\npush 3\npush 5\ngetMin\npush 2\ngetMin\npop', expectedOutput: '3\n2', isHidden: false, category: 'NORMAL' },
            { input: '3\npush 1\npush 1\ngetMin', expectedOutput: '1', isHidden: true, category: 'EDGE_CASE' }
        ]
    });

    questions.push({
        slug: 'next-greater-element',
        title: 'Next Greater Element',
        description: 'Given an array of integers, for each element find the next greater element to its right. If none exists, output -1.',
        difficulty: 'MEDIUM',
        topics: ['Stacks', 'Arrays'],
        tags: ['monotonic-stack'],
        skills: ['Stacks'],
        inputFormat: 'First line: N\nSecond line: N integers',
        outputFormat: 'Space-separated next greater elements',
        constraints: '1 ≤ N ≤ 10^5',
        executionMode: 'STDIN',
        examples: [
            { input: '4\n4 5 2 10', output: '5 10 10 -1', explanation: 'Next greater: 4→5, 5→10, 2→10, 10→none' }
        ],
        referenceSolution: { python: 'n = int(input())\narr = list(map(int, input().split()))\nresult = [-1] * n\nstack = []\nfor i in range(n - 1, -1, -1):\n    while stack and stack[-1] <= arr[i]:\n        stack.pop()\n    result[i] = stack[-1] if stack else -1\n    stack.append(arr[i])\nprint(*result)' },
        testCases: [
            { input: '4\n4 5 2 10', expectedOutput: '5 10 10 -1', isHidden: false, category: 'NORMAL' },
            { input: '3\n3 2 1', expectedOutput: '-1 -1 -1', isHidden: false, category: 'EDGE_CASE' },
            { input: '1\n5', expectedOutput: '-1', isHidden: true, category: 'BOUNDARY' },
            { input: '5\n1 2 3 4 5', expectedOutput: '2 3 4 5 -1', isHidden: true, category: 'NORMAL' }
        ]
    });

    questions.push({
        slug: 'kth-largest-element',
        title: 'Kth Largest Element in Array',
        description: 'Given an unsorted array, find the Kth largest element. Note: it is the Kth largest in sorted order, not the Kth distinct element.',
        difficulty: 'MEDIUM',
        topics: ['Arrays', 'Heaps', 'Sorting'],
        tags: ['heap', 'kth-largest'],
        skills: ['Heaps', 'Sorting'],
        inputFormat: 'First line: N and K\nSecond line: N integers',
        outputFormat: 'Kth largest element',
        constraints: '1 ≤ K ≤ N ≤ 10^5',
        executionMode: 'STDIN',
        examples: [
            { input: '6 2\n3 2 1 5 6 4', output: '5', explanation: 'Sorted desc: [6,5,4,3,2,1], 2nd = 5' }
        ],
        referenceSolution: { python: 'n, k = map(int, input().split())\narr = list(map(int, input().split()))\narr.sort(reverse=True)\nprint(arr[k-1])' },
        testCases: [
            { input: '6 2\n3 2 1 5 6 4', expectedOutput: '5', isHidden: false, category: 'NORMAL' },
            { input: '4 1\n3 2 3 1', expectedOutput: '3', isHidden: false, category: 'BOUNDARY' },
            { input: '1 1\n42', expectedOutput: '42', isHidden: true, category: 'BOUNDARY' },
            { input: '5 5\n1 2 3 4 5', expectedOutput: '1', isHidden: true, category: 'NORMAL' }
        ]
    });

    questions.push({
        slug: 'maximum-subarray-sum',
        title: 'Maximum Subarray Sum (Kadane\'s)',
        description: 'Given an array of integers, find the contiguous subarray with the largest sum and return that sum.',
        difficulty: 'MEDIUM',
        topics: ['Arrays', 'Dynamic Programming'],
        tags: ['kadane', 'max-subarray'],
        skills: ['Dynamic Programming', 'Arrays'],
        inputFormat: 'First line: N\nSecond line: N integers',
        outputFormat: 'Maximum subarray sum',
        constraints: '1 ≤ N ≤ 10^5',
        executionMode: 'STDIN',
        examples: [
            { input: '9\n-2 1 -3 4 -1 2 1 -5 4', output: '6', explanation: 'Subarray [4,-1,2,1] has sum 6' }
        ],
        referenceSolution: { python: 'n = int(input())\narr = list(map(int, input().split()))\ncurr = arr[0]\nbest = arr[0]\nfor i in range(1, n):\n    curr = max(arr[i], curr + arr[i])\n    best = max(best, curr)\nprint(best)' },
        testCases: [
            { input: '9\n-2 1 -3 4 -1 2 1 -5 4', expectedOutput: '6', isHidden: false, category: 'NORMAL' },
            { input: '1\n-1', expectedOutput: '-1', isHidden: false, category: 'BOUNDARY' },
            { input: '5\n1 2 3 4 5', expectedOutput: '15', isHidden: true, category: 'NORMAL' },
            { input: '3\n-1 -2 -3', expectedOutput: '-1', isHidden: true, category: 'EDGE_CASE' }
        ]
    });

    questions.push({
        slug: 'set-matrix-zeroes',
        title: 'Set Matrix Zeroes',
        description: 'Given an M×N matrix, if an element is 0, set its entire row and column to 0. Do it in place.',
        difficulty: 'MEDIUM',
        topics: ['Arrays'],
        tags: ['matrix', 'in-place'],
        skills: ['Arrays'],
        inputFormat: 'First line: M and N\nNext M lines: N integers',
        outputFormat: 'Modified matrix, each row on a line',
        constraints: '1 ≤ M, N ≤ 200',
        executionMode: 'STDIN',
        examples: [
            { input: '3 3\n1 1 1\n1 0 1\n1 1 1', output: '1 0 1\n0 0 0\n1 0 1', explanation: 'Element at (1,1) is 0, so row 1 and col 1 become 0' }
        ],
        referenceSolution: { python: 'm, n = map(int, input().split())\nmatrix = []\nfor _ in range(m):\n    matrix.append(list(map(int, input().split())))\nzero_rows = set()\nzero_cols = set()\nfor i in range(m):\n    for j in range(n):\n        if matrix[i][j] == 0:\n            zero_rows.add(i)\n            zero_cols.add(j)\nfor i in range(m):\n    for j in range(n):\n        if i in zero_rows or j in zero_cols:\n            matrix[i][j] = 0\nfor row in matrix:\n    print(*row)' },
        testCases: [
            { input: '3 3\n1 1 1\n1 0 1\n1 1 1', expectedOutput: '1 0 1\n0 0 0\n1 0 1', isHidden: false, category: 'NORMAL' },
            { input: '2 2\n0 1\n1 1', expectedOutput: '0 0\n0 1', isHidden: true, category: 'NORMAL' },
            { input: '1 1\n0', expectedOutput: '0', isHidden: true, category: 'BOUNDARY' }
        ]
    });

    questions.push({
        slug: 'sort-colors',
        title: 'Sort Colors (Dutch National Flag)',
        description: 'Given an array with elements 0, 1, and 2 only, sort it in-place without using a sorting algorithm.',
        difficulty: 'MEDIUM',
        topics: ['Arrays', 'Sorting'],
        tags: ['dutch-flag', 'three-way-partition'],
        skills: ['Sorting', 'Arrays'],
        inputFormat: 'First line: N\nSecond line: N integers (each 0, 1, or 2)',
        outputFormat: 'Space-separated sorted array',
        constraints: '1 ≤ N ≤ 10^5',
        executionMode: 'STDIN',
        examples: [
            { input: '6\n2 0 2 1 1 0', output: '0 0 1 1 2 2', explanation: 'Sorted: all 0s, then 1s, then 2s' }
        ],
        referenceSolution: { python: 'n = int(input())\narr = list(map(int, input().split()))\nlo, mid, hi = 0, 0, n - 1\nwhile mid <= hi:\n    if arr[mid] == 0:\n        arr[lo], arr[mid] = arr[mid], arr[lo]\n        lo += 1\n        mid += 1\n    elif arr[mid] == 1:\n        mid += 1\n    else:\n        arr[mid], arr[hi] = arr[hi], arr[mid]\n        hi -= 1\nprint(*arr)' },
        testCases: [
            { input: '6\n2 0 2 1 1 0', expectedOutput: '0 0 1 1 2 2', isHidden: false, category: 'NORMAL' },
            { input: '3\n0 0 0', expectedOutput: '0 0 0', isHidden: true, category: 'EDGE_CASE' },
            { input: '1\n2', expectedOutput: '2', isHidden: true, category: 'BOUNDARY' },
            { input: '5\n2 2 2 1 0', expectedOutput: '0 1 2 2 2', isHidden: true, category: 'NORMAL' }
        ]
    });

    questions.push({
        slug: 'find-peak-element',
        title: 'Find Peak Element',
        description: 'A peak element is an element that is strictly greater than its neighbors. Given an array, find a peak element and return its index. The array may contain multiple peaks; return any one.',
        difficulty: 'MEDIUM',
        topics: ['Arrays', 'Searching'],
        tags: ['binary-search', 'peak'],
        skills: ['Binary Search'],
        inputFormat: 'First line: N\nSecond line: N integers',
        outputFormat: 'Index of a peak element',
        constraints: '1 ≤ N ≤ 10^5',
        executionMode: 'STDIN',
        examples: [
            { input: '4\n1 2 3 1', output: '2', explanation: 'arr[2]=3 is greater than neighbors 2 and 1' }
        ],
        referenceSolution: { python: 'n = int(input())\narr = list(map(int, input().split()))\nlo, hi = 0, n - 1\nwhile lo < hi:\n    mid = (lo + hi) // 2\n    if arr[mid] < arr[mid + 1]:\n        lo = mid + 1\n    else:\n        hi = mid\nprint(lo)' },
        testCases: [
            { input: '4\n1 2 3 1', expectedOutput: '2', isHidden: false, category: 'NORMAL' },
            { input: '1\n5', expectedOutput: '0', isHidden: false, category: 'BOUNDARY' },
            { input: '5\n1 2 4 3 1', expectedOutput: '2', isHidden: true, category: 'NORMAL' }
        ]
    });

    questions.push({
        slug: 'implement-queue-stacks',
        title: 'Implement Queue using Stacks',
        description: 'Implement a queue using two stacks. Given operations (enqueue X, dequeue, front), output the result of dequeue and front operations.',
        difficulty: 'MEDIUM',
        topics: ['Stacks', 'Queues'],
        tags: ['queue', 'stack', 'design'],
        skills: ['Stacks', 'Queues'],
        inputFormat: 'First line: N\nNext N lines: operation',
        outputFormat: 'Result of each dequeue or front operation',
        constraints: '1 ≤ N ≤ 10^4',
        executionMode: 'STDIN',
        examples: [
            { input: '5\nenqueue 1\nenqueue 2\nfront\ndequeue\nfront', output: '1\n1\n2', explanation: 'Queue: [1,2], front=1, dequeue=1, front=2' }
        ],
        referenceSolution: { python: 'from collections import deque\nn = int(input())\nq = deque()\nfor _ in range(n):\n    parts = input().strip().split()\n    if parts[0] == "enqueue":\n        q.append(int(parts[1]))\n    elif parts[0] == "dequeue":\n        print(q.popleft() if q else "EMPTY")\n    elif parts[0] == "front":\n        print(q[0] if q else "EMPTY")' },
        testCases: [
            { input: '5\nenqueue 1\nenqueue 2\nfront\ndequeue\nfront', expectedOutput: '1\n1\n2', isHidden: false, category: 'NORMAL' },
            { input: '3\nenqueue 5\ndequeue\ndequeue', expectedOutput: '5\nEMPTY', isHidden: true, category: 'EDGE_CASE' }
        ]
    });

    questions.push({
        slug: 'search-rotated-sorted',
        title: 'Search in Rotated Sorted Array',
        description: 'Given a rotated sorted array and a target, find the index of the target using O(log n) time. Return -1 if not found.',
        difficulty: 'MEDIUM',
        topics: ['Arrays', 'Searching'],
        tags: ['binary-search', 'rotated'],
        skills: ['Binary Search'],
        inputFormat: 'First line: N and target\nSecond line: N integers (rotated sorted)',
        outputFormat: 'Index of target or -1',
        constraints: '1 ≤ N ≤ 5000',
        executionMode: 'STDIN',
        examples: [
            { input: '7 0\n4 5 6 7 0 1 2', output: '4', explanation: '0 is at index 4' }
        ],
        referenceSolution: { python: 'n, t = map(int, input().split())\narr = list(map(int, input().split()))\nlo, hi = 0, n - 1\nwhile lo <= hi:\n    mid = (lo + hi) // 2\n    if arr[mid] == t:\n        print(mid)\n        exit()\n    if arr[lo] <= arr[mid]:\n        if arr[lo] <= t < arr[mid]:\n            hi = mid - 1\n        else:\n            lo = mid + 1\n    else:\n        if arr[mid] < t <= arr[hi]:\n            lo = mid + 1\n        else:\n            hi = mid - 1\nprint(-1)' },
        testCases: [
            { input: '7 0\n4 5 6 7 0 1 2', expectedOutput: '4', isHidden: false, category: 'NORMAL' },
            { input: '7 3\n4 5 6 7 0 1 2', expectedOutput: '-1', isHidden: false, category: 'NORMAL' },
            { input: '1 1\n1', expectedOutput: '0', isHidden: true, category: 'BOUNDARY' },
            { input: '5 5\n3 4 5 1 2', expectedOutput: '2', isHidden: true, category: 'NORMAL' }
        ]
    });

    questions.push({
        slug: 'generate-parentheses',
        title: 'Generate Parentheses',
        description: 'Given N pairs of parentheses, write a function to generate all valid combinations of well-formed parentheses.',
        difficulty: 'MEDIUM',
        topics: ['Recursion', 'Strings'],
        tags: ['backtracking', 'recursion'],
        skills: ['Recursion', 'Backtracking'],
        inputFormat: 'A single integer N',
        outputFormat: 'Each valid combination on a line, lexicographically sorted',
        constraints: '1 ≤ N ≤ 8',
        executionMode: 'STDIN',
        examples: [
            { input: '3', output: '((()))\n(()())\n(())()\n()(())\n()()()', explanation: 'All valid combinations of 3 pairs' }
        ],
        referenceSolution: { python: 'n = int(input())\nresult = []\ndef gen(s, o, c):\n    if len(s) == 2 * n:\n        result.append(s)\n        return\n    if o < n:\n        gen(s + "(", o + 1, c)\n    if c < o:\n        gen(s + ")", o, c + 1)\ngen("", 0, 0)\nfor r in sorted(result):\n    print(r)' },
        testCases: [
            { input: '3', expectedOutput: '((()))\n(()())\n(())()\n()(())\n()()()', isHidden: false, category: 'NORMAL' },
            { input: '1', expectedOutput: '()', isHidden: false, category: 'BOUNDARY' },
            { input: '2', expectedOutput: '(())\n()()', isHidden: true, category: 'NORMAL' }
        ]
    });

    questions.push({
        slug: 'edit-distance',
        title: 'Edit Distance',
        description: 'Given two strings word1 and word2, return the minimum number of operations required to convert word1 to word2. Allowed operations: insert, delete, replace a character.',
        difficulty: 'MEDIUM',
        topics: ['Dynamic Programming', 'Strings'],
        tags: ['dp', 'edit-distance'],
        skills: ['Dynamic Programming'],
        inputFormat: 'Two lines, each containing a string',
        outputFormat: 'Minimum edit distance',
        constraints: '0 ≤ |word| ≤ 500',
        executionMode: 'STDIN',
        examples: [
            { input: 'horse\nros', output: '3', explanation: 'horse→rorse→rose→ros (3 ops)' },
            { input: 'intention\nexecution', output: '5', explanation: '5 operations needed' }
        ],
        referenceSolution: { python: 'w1 = input().strip()\nw2 = input().strip()\nm, n = len(w1), len(w2)\ndp = [[0]*(n+1) for _ in range(m+1)]\nfor i in range(m+1): dp[i][0] = i\nfor j in range(n+1): dp[0][j] = j\nfor i in range(1, m+1):\n    for j in range(1, n+1):\n        if w1[i-1] == w2[j-1]:\n            dp[i][j] = dp[i-1][j-1]\n        else:\n            dp[i][j] = 1 + min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])\nprint(dp[m][n])' },
        testCases: [
            { input: 'horse\nros', expectedOutput: '3', isHidden: false, category: 'NORMAL' },
            { input: 'intention\nexecution', expectedOutput: '5', isHidden: false, category: 'NORMAL' },
            { input: '\nabc', expectedOutput: '3', isHidden: true, category: 'BOUNDARY' },
            { input: 'abc\nabc', expectedOutput: '0', isHidden: true, category: 'EDGE_CASE' }
        ]
    });

    questions.push({
        slug: 'partition-equal-subset',
        title: 'Partition Equal Subset Sum',
        description: 'Given a non-empty array of positive integers, determine if it can be partitioned into two subsets with equal sum.',
        difficulty: 'MEDIUM',
        topics: ['Dynamic Programming', 'Arrays'],
        tags: ['dp', 'subset-sum', 'knapsack'],
        skills: ['Dynamic Programming'],
        inputFormat: 'First line: N\nSecond line: N positive integers',
        outputFormat: 'true or false',
        constraints: '1 ≤ N ≤ 200\n1 ≤ nums[i] ≤ 100',
        executionMode: 'STDIN',
        examples: [
            { input: '4\n1 5 11 5', output: 'true', explanation: '[1,5,5] and [11] both sum to 11' },
            { input: '3\n1 2 3', output: 'true', explanation: '[1,2] and [3] both sum to 3' }
        ],
        referenceSolution: { python: 'n = int(input())\nnums = list(map(int, input().split()))\ntotal = sum(nums)\nif total % 2:\n    print("false")\n    exit()\ntarget = total // 2\ndp = [False] * (target + 1)\ndp[0] = True\nfor num in nums:\n    for j in range(target, num - 1, -1):\n        dp[j] = dp[j] or dp[j - num]\nprint("true" if dp[target] else "false")' },
        testCases: [
            { input: '4\n1 5 11 5', expectedOutput: 'true', isHidden: false, category: 'NORMAL' },
            { input: '3\n1 2 3', expectedOutput: 'true', isHidden: false, category: 'NORMAL' },
            { input: '3\n1 2 5', expectedOutput: 'false', isHidden: true, category: 'NORMAL' },
            { input: '1\n1', expectedOutput: 'false', isHidden: true, category: 'BOUNDARY' }
        ]
    });

    questions.push({
        slug: 'stock-buy-sell',
        title: 'Best Time to Buy and Sell Stock',
        description: 'Given an array of stock prices where prices[i] is the price on day i, find the maximum profit from one buy-sell transaction. You must buy before you sell. If no profit is possible, return 0.',
        difficulty: 'MEDIUM',
        topics: ['Arrays', 'Dynamic Programming'],
        tags: ['stock', 'greedy'],
        skills: ['Dynamic Programming', 'Greedy'],
        inputFormat: 'First line: N\nSecond line: N integers',
        outputFormat: 'Maximum profit',
        constraints: '1 ≤ N ≤ 10^5',
        executionMode: 'STDIN',
        examples: [
            { input: '6\n7 1 5 3 6 4', output: '5', explanation: 'Buy day 2 (price=1), sell day 5 (price=6), profit=5' }
        ],
        referenceSolution: { python: 'n = int(input())\nprices = list(map(int, input().split()))\nmin_price = prices[0]\nmax_profit = 0\nfor p in prices[1:]:\n    max_profit = max(max_profit, p - min_price)\n    min_price = min(min_price, p)\nprint(max_profit)' },
        testCases: [
            { input: '6\n7 1 5 3 6 4', expectedOutput: '5', isHidden: false, category: 'NORMAL' },
            { input: '5\n7 6 4 3 1', expectedOutput: '0', isHidden: false, category: 'EDGE_CASE' },
            { input: '2\n1 2', expectedOutput: '1', isHidden: true, category: 'BOUNDARY' },
            { input: '1\n5', expectedOutput: '0', isHidden: true, category: 'BOUNDARY' }
        ]
    });

    
    questions.push({
        slug: 'gas-station-circuit',
        title: 'Gas Station Circuit',
        description: 'There are N gas stations along a circular route, where the amount of gas at station i is gas[i]. You have a car with an unlimited gas tank and it costs cost[i] of gas to travel from station i to its next station (i + 1). Return the starting gas station index (0-indexed) if you can travel around the circuit once, otherwise return -1.',
        difficulty: 'MEDIUM',
        topics: ['Greedy', 'Arrays'],
        tags: ['greedy', 'circular-array'],
        skills: ['Greedy Algorithms', 'Arrays'],
        inputFormat: 'First line: N\nSecond line: N integers representing gas array\nThird line: N integers representing cost array',
        outputFormat: 'Starting station index or -1',
        constraints: '1 <= N <= 10^5\n0 <= gas[i], cost[i] <= 10^4',
        executionMode: 'STDIN',
        examples: [
            { input: '5\n1 2 3 4 5\n3 4 5 1 2', output: '3', explanation: 'Start at station 3 with 4 gas. Travel to station 4, then 0, 1, 2, 3.' }
        ],
        referenceSolution: { python: 'n = int(input())\ngas = list(map(int, input().split()))\ncost = list(map(int, input().split()))\nif sum(gas) < sum(cost):\n    print(-1)\nelse:\n    total = 0\n    start = 0\n    for i in range(n):\n        total += gas[i] - cost[i]\n        if total < 0:\n            total = 0\n            start = i + 1\n    print(start)' },
        testCases: [
            { input: '5\n1 2 3 4 5\n3 4 5 1 2', expectedOutput: '3', isHidden: false, category: 'NORMAL' },
            { input: '3\n2 3 4\n3 4 3', expectedOutput: '-1', isHidden: false, category: 'NORMAL' },
            { input: '1\n5\n4', expectedOutput: '0', isHidden: true, category: 'BOUNDARY' },
            { input: '2\n1 2\n2 1', expectedOutput: '1', isHidden: true, category: 'NORMAL' },
            { input: '4\n5 1 2 3\n4 4 1 5', expectedOutput: '-1', isHidden: true, category: 'EDGE_CASE' }
        ]
    });

    questions.push({
        slug: 'subsets-generation',
        title: 'Subsets Generation',
        description: 'Given an array of unique integers, return the count and each subset in lexicographical order. First print the total number of subsets (2^N). Then print each subset sorted, one per line (empty subset as empty line).',
        difficulty: 'MEDIUM',
        topics: ['Recursion', 'Bit Manipulation'],
        tags: ['backtracking', 'subsets'],
        skills: ['Recursion', 'Combinatorics'],
        inputFormat: 'First line: N\nSecond line: N space-separated integers',
        outputFormat: 'First line: total subsets count\nFollowing lines: each subset space-separated (empty line for empty subset)',
        constraints: '1 <= N <= 10',
        executionMode: 'STDIN',
        examples: [
            { input: '2\n1 2', output: '4\n\n1\n1 2\n2', explanation: '4 subsets: [], [1], [1, 2], [2]' }
        ],
        referenceSolution: { python: 'n = int(input())\narr = sorted(list(map(int, input().split())))\nsubsets = []\nfor i in range(1 << n):\n    s = []\n    for j in range(n):\n        if (i >> j) & 1:\n            s.append(arr[j])\n    subsets.append(s)\nsubsets.sort()\nprint(len(subsets))\nfor s in subsets:\n    print(" ".join(map(str, s)))' },
        testCases: [
            { input: '2\n1 2', expectedOutput: '4\n\n1\n1 2\n2', isHidden: false, category: 'NORMAL' },
            { input: '1\n5', expectedOutput: '2\n\n5', isHidden: false, category: 'BOUNDARY' },
            { input: '3\n3 1 2', expectedOutput: '8\n\n1\n1 2\n1 2 3\n1 3\n2\n2 3\n3', isHidden: true, category: 'NORMAL' }
        ]
    });

    questions.push({
        slug: 'daily-temperatures',
        title: 'Daily Temperatures',
        description: 'Given an array of integers temperatures representing daily temperatures, return an array answer such that answer[i] is the number of days you have to wait after the i-th day to get a warmer temperature. If there is no future day for which this is possible, keep answer[i] == 0.',
        difficulty: 'MEDIUM',
        topics: ['Stacks', 'Arrays'],
        tags: ['monotonic-stack'],
        skills: ['Stacks', 'Problem Solving'],
        inputFormat: 'First line: N\nSecond line: N space-separated integers',
        outputFormat: 'N space-separated integers representing days to wait',
        constraints: '1 <= N <= 10^5\n30 <= temperatures[i] <= 100',
        executionMode: 'STDIN',
        examples: [
            { input: '8\n73 74 75 71 69 72 76 73', output: '1 1 4 2 1 1 0 0', explanation: 'Days to wait for warmer temperatures.' }
        ],
        referenceSolution: { python: 'n = int(input())\nt = list(map(int, input().split()))\nans = [0] * n\nstack = []\nfor i in range(n):\n    while stack and t[i] > t[stack[-1]]:\n        prev = stack.pop()\n        ans[prev] = i - prev\n    stack.append(i)\nprint(" ".join(map(str, ans)))' },
        testCases: [
            { input: '8\n73 74 75 71 69 72 76 73', expectedOutput: '1 1 4 2 1 1 0 0', isHidden: false, category: 'NORMAL' },
            { input: '4\n30 40 50 60', expectedOutput: '1 1 1 0', isHidden: false, category: 'NORMAL' },
            { input: '3\n30 60 90', expectedOutput: '1 1 0', isHidden: true, category: 'NORMAL' },
            { input: '3\n90 60 30', expectedOutput: '0 0 0', isHidden: true, category: 'BOUNDARY' },
            { input: '1\n50', expectedOutput: '0', isHidden: true, category: 'EDGE_CASE' }
        ]
    });

    questions.push({
        slug: 'insert-interval',
        title: 'Insert Interval',
        description: 'You are given an array of non-overlapping intervals intervals where intervals[i] = [starti, endi] sorted in ascending order. You are also given an interval newInterval = [start, end]. Insert newInterval into intervals such that intervals is still sorted and non-overlapping (merge overlapping intervals if necessary).',
        difficulty: 'MEDIUM',
        topics: ['Intervals', 'Arrays'],
        tags: ['intervals', 'sorting'],
        skills: ['Intervals', 'Algorithms'],
        inputFormat: 'First line: N (number of existing intervals)\nNext N lines: start and end of each interval\nLast line: start and end of newInterval',
        outputFormat: 'Each merged interval on a new line (start end)',
        constraints: '0 <= N <= 10^4',
        executionMode: 'STDIN',
        examples: [
            { input: '2\n1 3\n6 9\n2 5', output: '1 5\n6 9', explanation: 'New interval [2,5] overlaps with [1,3], merging to [1,5].' }
        ],
        referenceSolution: { python: 'import sys\nlines = sys.stdin.read().strip().split()\nif not lines: sys.exit(0)\nn = int(lines[0])\nidx = 1\nintervals = []\nfor _ in range(n):\n    intervals.append([int(lines[idx]), int(lines[idx+1])])\n    idx += 2\nnew_start = int(lines[idx])\nnew_end = int(lines[idx+1])\nintervals.append([new_start, new_end])\nintervals.sort(key=lambda x: x[0])\nmerged = []\nfor it in intervals:\n    if not merged or merged[-1][1] < it[0]:\n        merged.append(it)\n    else:\n        merged[-1][1] = max(merged[-1][1], it[1])\nfor it in merged:\n    print(f"{it[0]} {it[1]}")' },
        testCases: [
            { input: '2\n1 3\n6 9\n2 5', expectedOutput: '1 5\n6 9', isHidden: false, category: 'NORMAL' },
            { input: '5\n1 2\n3 5\n6 7\n8 10\n12 16\n4 8', expectedOutput: '1 2\n3 10\n12 16', isHidden: false, category: 'NORMAL' },
            { input: '0\n5 7', expectedOutput: '5 7', isHidden: true, category: 'EDGE_CASE' },
            { input: '1\n1 5\n2 3', expectedOutput: '1 5', isHidden: true, category: 'BOUNDARY' }
        ]
    });

    questions.push({
        slug: 'rotting-oranges',
        title: 'Rotting Oranges',
        description: 'You are given an m x n grid where 0 represents empty, 1 represents fresh orange, and 2 represents rotten orange. Every minute, any fresh orange 4-directionally adjacent to a rotten orange becomes rotten. Return the minimum minutes until no cell has a fresh orange, or -1 if impossible.',
        difficulty: 'MEDIUM',
        topics: ['Graphs', 'Queues'],
        tags: ['bfs', 'matrix'],
        skills: ['Breadth-First Search', 'Matrix'],
        inputFormat: 'First line: R C (rows and columns)\nNext R lines: C space-separated integers (0, 1, or 2)',
        outputFormat: 'Minimum minutes or -1',
        constraints: '1 <= R, C <= 10',
        executionMode: 'STDIN',
        examples: [
            { input: '3 3\n2 1 1\n1 1 0\n0 1 1', output: '4', explanation: 'Oranges rot in 4 minutes.' }
        ],
        referenceSolution: { python: 'from collections import deque\nr, c = map(int, input().split())\ngrid = [list(map(int, input().split())) for _ in range(r)]\nqueue = deque()\nfresh = 0\nfor i in range(r):\n    for j in range(c):\n        if grid[i][j] == 2:\n            queue.append((i, j, 0))\n        elif grid[i][j] == 1:\n            fresh += 1\nminutes = 0\nwhile queue:\n    cr, cc, d = queue.popleft()\n    minutes = max(minutes, d)\n    for dr, dc in [(-1,0),(1,0),(0,-1),(0,1)]:\n        nr, nc = cr + dr, cc + dc\n        if 0 <= nr < r and 0 <= nc < c and grid[nr][nc] == 1:\n            grid[nr][nc] = 2\n            fresh -= 1\n            queue.append((nr, nc, d + 1))\nprint(minutes if fresh == 0 else -1)' },
        testCases: [
            { input: '3 3\n2 1 1\n1 1 0\n0 1 1', expectedOutput: '4', isHidden: false, category: 'NORMAL' },
            { input: '3 3\n2 1 1\n0 1 1\n1 0 1', expectedOutput: '-1', isHidden: false, category: 'NORMAL' },
            { input: '1 2\n0 2', expectedOutput: '0', isHidden: true, category: 'EDGE_CASE' },
            { input: '2 2\n2 2\n2 2', expectedOutput: '0', isHidden: true, category: 'BOUNDARY' }
        ]
    });

    questions.push({
        slug: 'course-schedule-cycle',
        title: 'Course Schedule Dependency Check',
        description: 'There are a total of numCourses courses labeled 0 to numCourses - 1. You are given an array prerequisites where prerequisites[i] = [ai, bi] indicates course bi must be taken before ai. Return YES if all courses can be finished, otherwise NO.',
        difficulty: 'MEDIUM',
        topics: ['Graphs', 'Topological Sort'],
        tags: ['graph', 'cycle-detection', 'dfs'],
        skills: ['Graph Theory', 'Topological Sort'],
        inputFormat: 'First line: N M (numCourses and prerequisites count)\nNext M lines: a b (course a requires course b)',
        outputFormat: 'YES or NO',
        constraints: '1 <= N <= 10^4\n0 <= M <= 10^4',
        executionMode: 'STDIN',
        examples: [
            { input: '2 1\n1 0', output: 'YES', explanation: 'Course 1 requires course 0. Valid order: 0, 1.' },
            { input: '2 2\n1 0\n0 1', output: 'NO', explanation: 'Cycle between 0 and 1.' }
        ],
        referenceSolution: { python: 'from collections import deque, defaultdict\nimport sys\nlines = sys.stdin.read().strip().split()\nif not lines: sys.exit(0)\nn = int(lines[0])\nm = int(lines[1])\nadj = defaultdict(list)\nindeg = [0] * n\nidx = 2\nfor _ in range(m):\n    a = int(lines[idx])\n    b = int(lines[idx+1])\n    adj[b].append(a)\n    indeg[a] += 1\n    idx += 2\nq = deque([i for i in range(n) if indeg[i] == 0])\ncount = 0\nwhile q:\n    curr = q.popleft()\n    count += 1\n    for nxt in adj[curr]:\n        indeg[nxt] -= 1\n        if indeg[nxt] == 0:\n            q.append(nxt)\nprint("YES" if count == n else "NO")' },
        testCases: [
            { input: '2 1\n1 0', expectedOutput: 'YES', isHidden: false, category: 'NORMAL' },
            { input: '2 2\n1 0\n0 1', expectedOutput: 'NO', isHidden: false, category: 'NORMAL' },
            { input: '3 2\n1 0\n2 1', expectedOutput: 'YES', isHidden: true, category: 'NORMAL' },
            { input: '1 0', expectedOutput: 'YES', isHidden: true, category: 'BOUNDARY' },
            { input: '3 3\n0 1\n1 2\n2 0', expectedOutput: 'NO', isHidden: true, category: 'EDGE_CASE' }
        ]
    });

    questions.push({
        slug: 'combination-sum',
        title: 'Combination Sum',
        description: 'Given an array of distinct integers candidates and a target integer target, return the number of unique combinations of candidates where the chosen numbers sum to target. The same number may be chosen unlimited times.',
        difficulty: 'MEDIUM',
        topics: ['Dynamic Programming', 'Recursion'],
        tags: ['backtracking', 'coin-change'],
        skills: ['Combinatorics', 'DP'],
        inputFormat: 'First line: N Target\nSecond line: N space-separated integers',
        outputFormat: 'A single integer — the number of unique combinations',
        constraints: '1 <= N <= 30\n1 <= Target <= 500',
        executionMode: 'STDIN',
        examples: [
            { input: '4 7\n2 3 6 7', output: '2', explanation: '2 combinations: [2, 2, 3] and [7].' }
        ],
        referenceSolution: { python: 'n, target = map(int, input().split())\nnums = list(map(int, input().split()))\ndp = [0] * (target + 1)\ndp[0] = 1\nfor c in nums:\n    for i in range(c, target + 1):\n        dp[i] += dp[i - c]\nprint(dp[target])' },
        testCases: [
            { input: '4 7\n2 3 6 7', expectedOutput: '2', isHidden: false, category: 'NORMAL' },
            { input: '3 8\n2 3 5', expectedOutput: '3', isHidden: false, category: 'NORMAL' },
            { input: '1 5\n2', expectedOutput: '0', isHidden: true, category: 'BOUNDARY' },
            { input: '1 1\n1', expectedOutput: '1', isHidden: true, category: 'BOUNDARY' }
        ]
    });

    // ─── HIGH DIFFICULTY (20 questions) ────────────────────────────

    questions.push({
        slug: 'trapping-rain-water',
        title: 'Trapping Rain Water',
        description: 'Given N non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.',
        difficulty: 'HIGH',
        topics: ['Arrays', 'Two Pointers', 'Stacks'],
        tags: ['trapping-water', 'two-pointer'],
        skills: ['Two Pointers', 'Stacks'],
        inputFormat: 'First line: N\nSecond line: N integers (elevations)',
        outputFormat: 'Total trapped water units',
        constraints: '1 ≤ N ≤ 10^5',
        executionMode: 'STDIN',
        examples: [
            { input: '12\n0 1 0 2 1 0 1 3 2 1 2 1', output: '6', explanation: '6 units of water trapped' }
        ],
        referenceSolution: { python: 'n = int(input())\nh = list(map(int, input().split()))\nl, r = 0, n - 1\nlmax, rmax = 0, 0\nwater = 0\nwhile l < r:\n    if h[l] < h[r]:\n        if h[l] >= lmax:\n            lmax = h[l]\n        else:\n            water += lmax - h[l]\n        l += 1\n    else:\n        if h[r] >= rmax:\n            rmax = h[r]\n        else:\n            water += rmax - h[r]\n        r -= 1\nprint(water)' },
        testCases: [
            { input: '12\n0 1 0 2 1 0 1 3 2 1 2 1', expectedOutput: '6', isHidden: false, category: 'NORMAL' },
            { input: '6\n4 2 0 3 2 5', expectedOutput: '9', isHidden: false, category: 'NORMAL' },
            { input: '1\n5', expectedOutput: '0', isHidden: true, category: 'BOUNDARY' },
            { input: '5\n3 3 3 3 3', expectedOutput: '0', isHidden: true, category: 'EDGE_CASE' },
            { input: '5\n5 4 3 2 1', expectedOutput: '0', isHidden: true, category: 'EDGE_CASE' }
        ]
    });

    questions.push({
        slug: 'largest-rectangle-histogram',
        title: 'Largest Rectangle in Histogram',
        description: 'Given an array of integers representing the histogram bar heights (each bar width is 1), find the area of the largest rectangle in the histogram.',
        difficulty: 'HIGH',
        topics: ['Arrays', 'Stacks'],
        tags: ['monotonic-stack', 'histogram'],
        skills: ['Stacks'],
        inputFormat: 'First line: N\nSecond line: N integers (heights)',
        outputFormat: 'Maximum rectangle area',
        constraints: '1 ≤ N ≤ 10^5',
        executionMode: 'STDIN',
        examples: [
            { input: '6\n2 1 5 6 2 3', output: '10', explanation: 'Rectangle of height 5 and width 2' }
        ],
        referenceSolution: { python: 'n = int(input())\nheights = list(map(int, input().split()))\nstack = []\nmax_area = 0\nfor i in range(n + 1):\n    h = heights[i] if i < n else 0\n    while stack and heights[stack[-1]] > h:\n        height = heights[stack.pop()]\n        width = i if not stack else i - stack[-1] - 1\n        max_area = max(max_area, height * width)\n    stack.append(i)\nprint(max_area)' },
        testCases: [
            { input: '6\n2 1 5 6 2 3', expectedOutput: '10', isHidden: false, category: 'NORMAL' },
            { input: '1\n2', expectedOutput: '2', isHidden: false, category: 'BOUNDARY' },
            { input: '4\n2 2 2 2', expectedOutput: '8', isHidden: true, category: 'EDGE_CASE' },
            { input: '5\n1 2 3 4 5', expectedOutput: '9', isHidden: true, category: 'NORMAL' },
            { input: '3\n6 2 5', expectedOutput: '6', isHidden: true, category: 'NORMAL' }
        ]
    });

    questions.push({
        slug: 'longest-valid-parentheses',
        title: 'Longest Valid Parentheses',
        description: 'Given a string containing only \'(\' and \')\', find the length of the longest valid (well-formed) parentheses substring.',
        difficulty: 'HIGH',
        topics: ['Strings', 'Dynamic Programming', 'Stacks'],
        tags: ['dp', 'stack', 'parentheses'],
        skills: ['Dynamic Programming', 'Stacks'],
        inputFormat: 'A single string of parentheses',
        outputFormat: 'Length of longest valid substring',
        constraints: '0 ≤ length ≤ 3×10^4',
        executionMode: 'STDIN',
        examples: [
            { input: '(()', output: '2', explanation: 'Longest valid: "()"' },
            { input: ')()())', output: '4', explanation: 'Longest valid: "()()"' }
        ],
        referenceSolution: { python: 'try:\n    s = input().strip()\nexcept Exception:\n    s = ""\nstack = [-1]\nmax_len = 0\nfor i, c in enumerate(s):\n    if c == "(":\n        stack.append(i)\n    else:\n        stack.pop()\n        if not stack:\n            stack.append(i)\n        else:\n            max_len = max(max_len, i - stack[-1])\nprint(max_len)' },
        testCases: [
            { input: '(()', expectedOutput: '2', isHidden: false, category: 'NORMAL' },
            { input: ')()())', expectedOutput: '4', isHidden: false, category: 'NORMAL' },
            { input: '', expectedOutput: '0', isHidden: true, category: 'BOUNDARY' },
            { input: '()()()', expectedOutput: '6', isHidden: true, category: 'NORMAL' },
            { input: '((()', expectedOutput: '2', isHidden: true, category: 'NORMAL' }
        ]
    });

    questions.push({
        slug: 'sliding-window-maximum',
        title: 'Sliding Window Maximum',
        description: 'Given an array of integers and a window size K, find the maximum in each sliding window of size K as it moves from left to right.',
        difficulty: 'HIGH',
        topics: ['Arrays', 'Queues', 'Heaps'],
        tags: ['deque', 'sliding-window'],
        skills: ['Sliding Window', 'Queues'],
        inputFormat: 'First line: N and K\nSecond line: N integers',
        outputFormat: 'Space-separated maximum values for each window',
        constraints: '1 ≤ K ≤ N ≤ 10^5',
        executionMode: 'STDIN',
        examples: [
            { input: '8 3\n1 3 -1 -3 5 3 6 7', output: '3 3 5 5 6 7', explanation: 'Windows: [1,3,-1]→3, [3,-1,-3]→3, etc.' }
        ],
        referenceSolution: { python: 'from collections import deque\nn, k = map(int, input().split())\nnums = list(map(int, input().split()))\ndq = deque()\nresult = []\nfor i in range(n):\n    while dq and dq[0] < i - k + 1:\n        dq.popleft()\n    while dq and nums[dq[-1]] <= nums[i]:\n        dq.pop()\n    dq.append(i)\n    if i >= k - 1:\n        result.append(nums[dq[0]])\nprint(*result)' },
        testCases: [
            { input: '8 3\n1 3 -1 -3 5 3 6 7', expectedOutput: '3 3 5 5 6 7', isHidden: false, category: 'NORMAL' },
            { input: '1 1\n1', expectedOutput: '1', isHidden: false, category: 'BOUNDARY' },
            { input: '5 5\n1 2 3 4 5', expectedOutput: '5', isHidden: true, category: 'BOUNDARY' },
            { input: '5 2\n5 4 3 2 1', expectedOutput: '5 4 3 2', isHidden: true, category: 'NORMAL' }
        ]
    });

    questions.push({
        slug: 'count-inversions',
        title: 'Count Inversions in Array',
        description: 'Given an array of N integers, count the number of inversions. An inversion is a pair (i, j) such that i < j and arr[i] > arr[j].',
        difficulty: 'HIGH',
        topics: ['Arrays', 'Sorting'],
        tags: ['merge-sort', 'inversions', 'divide-conquer'],
        skills: ['Divide and Conquer', 'Sorting'],
        inputFormat: 'First line: N\nSecond line: N integers',
        outputFormat: 'Number of inversions',
        constraints: '1 ≤ N ≤ 10^5',
        executionMode: 'STDIN',
        examples: [
            { input: '5\n2 4 1 3 5', output: '3', explanation: 'Inversions: (2,1), (4,1), (4,3)' }
        ],
        referenceSolution: { python: 'import sys\ninput = sys.stdin.readline\nn = int(input())\narr = list(map(int, input().split()))\ndef merge_count(arr):\n    if len(arr) <= 1:\n        return arr, 0\n    mid = len(arr) // 2\n    left, lc = merge_count(arr[:mid])\n    right, rc = merge_count(arr[mid:])\n    merged = []\n    inv = lc + rc\n    i = j = 0\n    while i < len(left) and j < len(right):\n        if left[i] <= right[j]:\n            merged.append(left[i])\n            i += 1\n        else:\n            merged.append(right[j])\n            inv += len(left) - i\n            j += 1\n    merged.extend(left[i:])\n    merged.extend(right[j:])\n    return merged, inv\n_, result = merge_count(arr)\nprint(result)' },
        testCases: [
            { input: '5\n2 4 1 3 5', expectedOutput: '3', isHidden: false, category: 'NORMAL' },
            { input: '5\n1 2 3 4 5', expectedOutput: '0', isHidden: false, category: 'EDGE_CASE' },
            { input: '5\n5 4 3 2 1', expectedOutput: '10', isHidden: true, category: 'NORMAL' },
            { input: '1\n1', expectedOutput: '0', isHidden: true, category: 'BOUNDARY' }
        ]
    });

    questions.push({
        slug: 'lru-cache-design',
        title: 'LRU Cache',
        description: 'Design a Least Recently Used (LRU) cache with a given capacity. Implement get(key) and put(key, value) operations. When capacity is exceeded, evict the least recently used item.',
        difficulty: 'HIGH',
        topics: ['Hashing', 'Linked Lists'],
        tags: ['lru', 'cache', 'design'],
        skills: ['Design', 'Hash Map'],
        inputFormat: 'First line: capacity and N operations\nNext N lines: get key OR put key value',
        outputFormat: 'For each get: value or -1',
        constraints: '1 ≤ capacity ≤ 3000\n1 ≤ N ≤ 10^4',
        executionMode: 'STDIN',
        examples: [
            { input: '2 6\nput 1 1\nput 2 2\nget 1\nput 3 3\nget 2\nget 3', output: '1\n-1\n3', explanation: 'After put 3, cache=[1,3], key 2 evicted' }
        ],
        referenceSolution: { python: 'from collections import OrderedDict\ncap, n = map(int, input().split())\ncache = OrderedDict()\nfor _ in range(n):\n    parts = input().strip().split()\n    if parts[0] == "get":\n        key = int(parts[1])\n        if key in cache:\n            cache.move_to_end(key)\n            print(cache[key])\n        else:\n            print(-1)\n    elif parts[0] == "put":\n        key, val = int(parts[1]), int(parts[2])\n        if key in cache:\n            cache.move_to_end(key)\n        cache[key] = val\n        if len(cache) > cap:\n            cache.popitem(last=False)' },
        testCases: [
            { input: '2 6\nput 1 1\nput 2 2\nget 1\nput 3 3\nget 2\nget 3', expectedOutput: '1\n-1\n3', isHidden: false, category: 'NORMAL' },
            { input: '1 3\nput 1 10\nget 1\nput 2 20', expectedOutput: '10', isHidden: true, category: 'BOUNDARY' }
        ]
    });

    questions.push({
        slug: 'longest-common-subsequence',
        title: 'Longest Common Subsequence',
        description: 'Given two strings, find the length of the longest common subsequence. A subsequence maintains relative order but is not necessarily contiguous.',
        difficulty: 'HIGH',
        topics: ['Dynamic Programming', 'Strings'],
        tags: ['lcs', 'dp'],
        skills: ['Dynamic Programming'],
        inputFormat: 'Two lines, each containing a string',
        outputFormat: 'Length of LCS',
        constraints: '1 ≤ |string| ≤ 1000',
        executionMode: 'STDIN',
        examples: [
            { input: 'abcde\nace', output: '3', explanation: 'LCS is "ace"' },
            { input: 'abc\nabc', output: '3', explanation: 'Identical strings, LCS="abc"' }
        ],
        referenceSolution: { python: 'a = input().strip()\nb = input().strip()\nm, n = len(a), len(b)\ndp = [[0]*(n+1) for _ in range(m+1)]\nfor i in range(1, m+1):\n    for j in range(1, n+1):\n        if a[i-1] == b[j-1]:\n            dp[i][j] = dp[i-1][j-1] + 1\n        else:\n            dp[i][j] = max(dp[i-1][j], dp[i][j-1])\nprint(dp[m][n])' },
        testCases: [
            { input: 'abcde\nace', expectedOutput: '3', isHidden: false, category: 'NORMAL' },
            { input: 'abc\nabc', expectedOutput: '3', isHidden: false, category: 'NORMAL' },
            { input: 'abc\ndef', expectedOutput: '0', isHidden: true, category: 'EDGE_CASE' },
            { input: 'a\na', expectedOutput: '1', isHidden: true, category: 'BOUNDARY' }
        ]
    });

    questions.push({
        slug: 'matrix-chain-multiplication',
        title: 'Matrix Chain Multiplication',
        description: 'Given dimensions of N matrices, find the minimum number of scalar multiplications needed to multiply the chain. Matrix i has dimensions p[i-1] × p[i].',
        difficulty: 'HIGH',
        topics: ['Dynamic Programming'],
        tags: ['mcm', 'dp', 'interval-dp'],
        skills: ['Dynamic Programming'],
        inputFormat: 'First line: N+1 (number of dimension values)\nSecond line: N+1 integers (dimensions)',
        outputFormat: 'Minimum multiplications',
        constraints: '2 ≤ N ≤ 100',
        executionMode: 'STDIN',
        examples: [
            { input: '4\n10 20 30 40', output: '18000', explanation: 'Optimal: (10×20×30) + (10×30×40) = 6000+12000=18000' }
        ],
        referenceSolution: { python: 'n = int(input()) - 1\np = list(map(int, input().split()))\ndp = [[0]*n for _ in range(n)]\nfor length in range(2, n+1):\n    for i in range(n - length + 1):\n        j = i + length - 1\n        dp[i][j] = float("inf")\n        for k in range(i, j):\n            cost = dp[i][k] + dp[k+1][j] + p[i]*p[k+1]*p[j+1]\n            dp[i][j] = min(dp[i][j], cost)\nprint(dp[0][n-1])' },
        testCases: [
            { input: '4\n10 20 30 40', expectedOutput: '18000', isHidden: false, category: 'NORMAL' },
            { input: '5\n40 20 30 10 30', expectedOutput: '26000', isHidden: false, category: 'NORMAL' },
            { input: '2\n10 20', expectedOutput: '0', isHidden: true, category: 'BOUNDARY' },
            { input: '3\n10 30 5', expectedOutput: '1500', isHidden: true, category: 'NORMAL' }
        ]
    });

    questions.push({
        slug: 'palindrome-partitioning-min',
        title: 'Palindrome Partitioning (Minimum Cuts)',
        description: 'Given a string, find the minimum number of cuts needed so that every substring is a palindrome.',
        difficulty: 'HIGH',
        topics: ['Dynamic Programming', 'Strings'],
        tags: ['palindrome', 'dp', 'partitioning'],
        skills: ['Dynamic Programming'],
        inputFormat: 'A single string',
        outputFormat: 'Minimum number of cuts',
        constraints: '1 ≤ length ≤ 1000',
        executionMode: 'STDIN',
        examples: [
            { input: 'aab', output: '1', explanation: 'Cut "a|ab" → "a" and "ab" (no, "ab" is not palindrome). Cut "aa|b" → "aa" and "b" — 1 cut.' },
            { input: 'a', output: '0', explanation: 'Already a palindrome' }
        ],
        referenceSolution: { python: 's = input().strip()\nn = len(s)\nif n <= 1:\n    print(0)\n    exit()\npal = [[False]*n for _ in range(n)]\nfor i in range(n):\n    pal[i][i] = True\nfor length in range(2, n+1):\n    for i in range(n - length + 1):\n        j = i + length - 1\n        if length == 2:\n            pal[i][j] = s[i] == s[j]\n        else:\n            pal[i][j] = s[i] == s[j] and pal[i+1][j-1]\ncuts = [0] * n\nfor i in range(n):\n    if pal[0][i]:\n        cuts[i] = 0\n    else:\n        cuts[i] = float("inf")\n        for j in range(i):\n            if pal[j+1][i] and cuts[j] + 1 < cuts[i]:\n                cuts[i] = cuts[j] + 1\nprint(cuts[n-1])' },
        testCases: [
            { input: 'aab', expectedOutput: '1', isHidden: false, category: 'NORMAL' },
            { input: 'a', expectedOutput: '0', isHidden: false, category: 'BOUNDARY' },
            { input: 'abcba', expectedOutput: '0', isHidden: true, category: 'EDGE_CASE' },
            { input: 'abcd', expectedOutput: '3', isHidden: true, category: 'NORMAL' }
        ]
    });

    questions.push({
        slug: 'regex-matching',
        title: 'Regular Expression Matching',
        description: 'Implement regular expression matching with support for \'.\' and \'*\'. \'.\' matches any single character, \'*\' matches zero or more of the preceding element. The matching should cover the entire input string.',
        difficulty: 'HIGH',
        topics: ['Dynamic Programming', 'Strings'],
        tags: ['regex', 'dp'],
        skills: ['Dynamic Programming'],
        inputFormat: 'First line: string s\nSecond line: pattern p',
        outputFormat: 'true or false',
        constraints: '0 ≤ |s| ≤ 20\n0 ≤ |p| ≤ 30',
        executionMode: 'STDIN',
        examples: [
            { input: 'aa\na', output: 'false', explanation: '"a" does not match entire "aa"' },
            { input: 'aa\na*', output: 'true', explanation: '"a*" matches zero or more "a"' }
        ],
        referenceSolution: { python: 's = input().strip()\np = input().strip()\nm, n = len(s), len(p)\ndp = [[False]*(n+1) for _ in range(m+1)]\ndp[0][0] = True\nfor j in range(2, n+1):\n    if p[j-1] == "*":\n        dp[0][j] = dp[0][j-2]\nfor i in range(1, m+1):\n    for j in range(1, n+1):\n        if p[j-1] == "*":\n            dp[i][j] = dp[i][j-2]\n            if p[j-2] == "." or p[j-2] == s[i-1]:\n                dp[i][j] = dp[i][j] or dp[i-1][j]\n        elif p[j-1] == "." or p[j-1] == s[i-1]:\n            dp[i][j] = dp[i-1][j-1]\nprint("true" if dp[m][n] else "false")' },
        testCases: [
            { input: 'aa\na', expectedOutput: 'false', isHidden: false, category: 'NORMAL' },
            { input: 'aa\na*', expectedOutput: 'true', isHidden: false, category: 'NORMAL' },
            { input: 'ab\n.*', expectedOutput: 'true', isHidden: true, category: 'NORMAL' },
            { input: '\n.*', expectedOutput: 'true', isHidden: true, category: 'BOUNDARY' },
            { input: 'mississippi\nmis*is*p*.', expectedOutput: 'false', isHidden: true, category: 'EDGE_CASE' }
        ]
    });

    questions.push({
        slug: 'median-data-stream',
        title: 'Median from Data Stream',
        description: 'Design a data structure that supports adding numbers and finding the median. Given a list of N numbers, after adding each number, output the current median.',
        difficulty: 'HIGH',
        topics: ['Heaps'],
        tags: ['heap', 'median', 'design'],
        skills: ['Heaps', 'Design'],
        inputFormat: 'First line: N\nSecond line: N integers',
        outputFormat: 'Median after adding each number (one per line). If integer, print integer; else print with 1 decimal.',
        constraints: '1 ≤ N ≤ 10^5',
        executionMode: 'STDIN',
        examples: [
            { input: '5\n5 15 1 3 8', output: '5\n10.0\n5\n4.0\n5', explanation: 'Medians after each insertion' }
        ],
        referenceSolution: { python: 'import heapq\nn = int(input())\nnums = list(map(int, input().split()))\nlo = []  # max heap (negated)\nhi = []  # min heap\nfor x in nums:\n    heapq.heappush(lo, -x)\n    heapq.heappush(hi, -heapq.heappop(lo))\n    if len(hi) > len(lo):\n        heapq.heappush(lo, -heapq.heappop(hi))\n    if len(lo) > len(hi):\n        print(-lo[0])\n    else:\n        med = (-lo[0] + hi[0]) / 2\n        if med == int(med):\n            print(f"{med:.1f}")\n        else:\n            print(f"{med:.1f}")' },
        testCases: [
            { input: '5\n5 15 1 3 8', expectedOutput: '5\n10.0\n5\n4.0\n5', isHidden: false, category: 'NORMAL' },
            { input: '1\n42', expectedOutput: '42', isHidden: false, category: 'BOUNDARY' },
            { input: '3\n1 2 3', expectedOutput: '1\n1.5\n2', isHidden: true, category: 'NORMAL' }
        ]
    });

    questions.push({
        slug: 'merge-k-sorted-lists',
        title: 'Merge K Sorted Lists',
        description: 'Given K sorted lists, merge them into one sorted list and output the result.',
        difficulty: 'HIGH',
        topics: ['Heaps', 'Linked Lists', 'Sorting'],
        tags: ['heap', 'merge', 'k-way'],
        skills: ['Heaps', 'Sorting'],
        inputFormat: 'First line: K\nNext K lines: first number is the list length, followed by sorted elements',
        outputFormat: 'Space-separated merged sorted list',
        constraints: '1 ≤ K ≤ 10^4\nTotal elements ≤ 10^5',
        executionMode: 'STDIN',
        examples: [
            { input: '3\n3 1 4 5\n3 1 3 4\n2 2 6', output: '1 1 2 3 4 4 5 6', explanation: 'All lists merged and sorted' }
        ],
        referenceSolution: { python: 'import heapq\nk = int(input())\nlists = []\nfor _ in range(k):\n    parts = list(map(int, input().split()))\n    lists.append(parts[1:])\nheap = []\nfor i, lst in enumerate(lists):\n    if lst:\n        heapq.heappush(heap, (lst[0], i, 0))\nresult = []\nwhile heap:\n    val, li, idx = heapq.heappop(heap)\n    result.append(val)\n    if idx + 1 < len(lists[li]):\n        heapq.heappush(heap, (lists[li][idx+1], li, idx+1))\nprint(*result)' },
        testCases: [
            { input: '3\n3 1 4 5\n3 1 3 4\n2 2 6', expectedOutput: '1 1 2 3 4 4 5 6', isHidden: false, category: 'NORMAL' },
            { input: '1\n1 5', expectedOutput: '5', isHidden: false, category: 'BOUNDARY' },
            { input: '2\n2 1 3\n2 2 4', expectedOutput: '1 2 3 4', isHidden: true, category: 'NORMAL' }
        ]
    });

    questions.push({
        slug: 'word-ladder-shortest',
        title: 'Word Ladder (Shortest Transformation)',
        description: 'Given two words (beginWord and endWord) and a dictionary, find the length of the shortest transformation sequence from beginWord to endWord. Each step changes exactly one letter and the resulting word must exist in the dictionary.',
        difficulty: 'HIGH',
        topics: ['Graphs', 'Strings'],
        tags: ['bfs', 'word-ladder'],
        skills: ['BFS', 'Graph Traversal'],
        inputFormat: 'First line: beginWord\nSecond line: endWord\nThird line: N (dictionary size)\nFourth line: N space-separated words',
        outputFormat: 'Length of shortest path (including begin and end), or 0 if impossible',
        constraints: '1 ≤ N ≤ 5000\n|word| ≤ 10',
        executionMode: 'STDIN',
        examples: [
            { input: 'hit\ncog\n6\nhot dot dog lot log cog', output: '5', explanation: 'hit→hot→dot→dog→cog = 5 words' }
        ],
        referenceSolution: { python: 'from collections import deque\nbegin = input().strip()\nend = input().strip()\nn = int(input())\nword_list = set(input().split())\nif end not in word_list:\n    print(0)\n    exit()\nq = deque([(begin, 1)])\nvisited = {begin}\nwhile q:\n    word, dist = q.popleft()\n    for i in range(len(word)):\n        for c in "abcdefghijklmnopqrstuvwxyz":\n            nw = word[:i] + c + word[i+1:]\n            if nw == end:\n                print(dist + 1)\n                exit()\n            if nw in word_list and nw not in visited:\n                visited.add(nw)\n                q.append((nw, dist + 1))\nprint(0)' },
        testCases: [
            { input: 'hit\ncog\n6\nhot dot dog lot log cog', expectedOutput: '5', isHidden: false, category: 'NORMAL' },
            { input: 'hit\ncog\n5\nhot dot dog lot log', expectedOutput: '0', isHidden: false, category: 'EDGE_CASE' },
            { input: 'a\nc\n2\na c', expectedOutput: '2', isHidden: true, category: 'BOUNDARY' }
        ]
    });

    questions.push({
        slug: 'course-schedule-order',
        title: 'Course Schedule II (Topological Order)',
        description: 'There are N courses labeled 0 to N-1. Some courses have prerequisites. Return the ordering of courses you should take to finish all courses. If impossible (cycle), print IMPOSSIBLE.',
        difficulty: 'HIGH',
        topics: ['Graphs', 'Sorting'],
        tags: ['topological-sort', 'cycle-detection'],
        skills: ['Graph Traversal', 'Topological Sort'],
        inputFormat: 'First line: N (courses) and E (prerequisites)\nNext E lines: a b (b is prerequisite of a)',
        outputFormat: 'Space-separated course order, or IMPOSSIBLE',
        constraints: '1 ≤ N ≤ 2000',
        executionMode: 'STDIN',
        examples: [
            { input: '4 4\n1 0\n2 0\n3 1\n3 2', output: '0 1 2 3', explanation: 'Valid order respecting prerequisites' }
        ],
        referenceSolution: { python: 'from collections import deque\nn, e = map(int, input().split())\nadj = [[] for _ in range(n)]\nindeg = [0] * n\nfor _ in range(e):\n    a, b = map(int, input().split())\n    adj[b].append(a)\n    indeg[a] += 1\nq = deque([i for i in range(n) if indeg[i] == 0])\nresult = []\nwhile q:\n    node = q.popleft()\n    result.append(node)\n    for nb in adj[node]:\n        indeg[nb] -= 1\n        if indeg[nb] == 0:\n            q.append(nb)\nprint(*result if len(result) == n else ["IMPOSSIBLE"])' },
        testCases: [
            { input: '4 4\n1 0\n2 0\n3 1\n3 2', expectedOutput: '0 1 2 3', isHidden: false, category: 'NORMAL' },
            { input: '2 2\n0 1\n1 0', expectedOutput: 'IMPOSSIBLE', isHidden: false, category: 'EDGE_CASE' },
            { input: '1 0', expectedOutput: '0', isHidden: true, category: 'BOUNDARY' },
            { input: '3 0', expectedOutput: '0 1 2', isHidden: true, category: 'NORMAL' }
        ]
    });

    questions.push({
        slug: 'minimum-window-substring',
        title: 'Minimum Window Substring',
        description: 'Given two strings s and t, return the minimum window substring of s that contains all characters of t (including duplicates). If no such window exists, return an empty string.',
        difficulty: 'HIGH',
        topics: ['Strings', 'Hashing'],
        tags: ['sliding-window', 'hash-map'],
        skills: ['Sliding Window', 'Hash Map'],
        inputFormat: 'First line: string s\nSecond line: string t',
        outputFormat: 'Minimum window substring, or EMPTY',
        constraints: '1 ≤ |s|, |t| ≤ 10^5',
        executionMode: 'STDIN',
        examples: [
            { input: 'ADOBECODEBANC\nABC', output: 'BANC', explanation: 'Minimum window containing A, B, C' }
        ],
        referenceSolution: { python: 'from collections import Counter\ns = input().strip()\nt = input().strip()\nif not t or not s:\n    print("EMPTY")\n    exit()\nneed = Counter(t)\nhave = {}\nformed = 0\nrequired = len(need)\nbest = (float("inf"), 0, 0)\nl = 0\nfor r in range(len(s)):\n    c = s[r]\n    have[c] = have.get(c, 0) + 1\n    if c in need and have[c] == need[c]:\n        formed += 1\n    while l <= r and formed == required:\n        if r - l + 1 < best[0]:\n            best = (r - l + 1, l, r)\n        have[s[l]] -= 1\n        if s[l] in need and have[s[l]] < need[s[l]]:\n            formed -= 1\n        l += 1\nif best[0] == float("inf"):\n    print("EMPTY")\nelse:\n    print(s[best[1]:best[2]+1])' },
        testCases: [
            { input: 'ADOBECODEBANC\nABC', expectedOutput: 'BANC', isHidden: false, category: 'NORMAL' },
            { input: 'a\na', expectedOutput: 'a', isHidden: false, category: 'BOUNDARY' },
            { input: 'a\naa', expectedOutput: 'EMPTY', isHidden: true, category: 'EDGE_CASE' },
            { input: 'ab\nb', expectedOutput: 'b', isHidden: true, category: 'NORMAL' }
        ]
    });

    questions.push({
        slug: 'knapsack-01',
        title: '0/1 Knapsack Problem',
        description: 'Given N items each with a weight and value, and a knapsack with capacity W, find the maximum value you can carry. Each item can be taken at most once.',
        difficulty: 'HIGH',
        topics: ['Dynamic Programming'],
        tags: ['knapsack', 'dp'],
        skills: ['Dynamic Programming'],
        inputFormat: 'First line: N and W\nNext N lines: weight value',
        outputFormat: 'Maximum value',
        constraints: '1 ≤ N ≤ 100\n1 ≤ W ≤ 10^4',
        executionMode: 'STDIN',
        examples: [
            { input: '3 50\n10 60\n20 100\n30 120', output: '220', explanation: 'Take items 2 and 3: weight=50, value=220' }
        ],
        referenceSolution: { python: 'n, W = map(int, input().split())\nitems = []\nfor _ in range(n):\n    w, v = map(int, input().split())\n    items.append((w, v))\ndp = [0] * (W + 1)\nfor w, v in items:\n    for j in range(W, w - 1, -1):\n        dp[j] = max(dp[j], dp[j - w] + v)\nprint(dp[W])' },
        testCases: [
            { input: '3 50\n10 60\n20 100\n30 120', expectedOutput: '220', isHidden: false, category: 'NORMAL' },
            { input: '1 5\n10 100', expectedOutput: '0', isHidden: false, category: 'EDGE_CASE' },
            { input: '2 10\n5 10\n5 10', expectedOutput: '20', isHidden: true, category: 'NORMAL' },
            { input: '1 100\n1 1', expectedOutput: '1', isHidden: true, category: 'BOUNDARY' }
        ]
    });

    questions.push({
        slug: 'serialize-deserialize-tree',
        title: 'Serialize and Deserialize Binary Tree',
        description: 'Design an algorithm to serialize a binary tree (level-order, -1 for null) into a string and deserialize it back. Given a level-order input, output the level-order serialization.',
        difficulty: 'HIGH',
        topics: ['Trees'],
        tags: ['serialization', 'bfs'],
        skills: ['Trees', 'BFS'],
        inputFormat: 'Space-separated level-order values (-1 for null)',
        outputFormat: 'Space-separated level-order serialization (same format)',
        constraints: '0 ≤ nodes ≤ 10^4',
        executionMode: 'STDIN',
        examples: [
            { input: '1 2 3 -1 -1 4 5', output: '1 2 3 -1 -1 4 5', explanation: 'Serialize then deserialize preserves the tree' }
        ],
        referenceSolution: { python: 'data = input().strip()\nif not data:\n    print("")\n    exit()\nprint(data)' },
        testCases: [
            { input: '1 2 3 -1 -1 4 5', expectedOutput: '1 2 3 -1 -1 4 5', isHidden: false, category: 'NORMAL' },
            { input: '1', expectedOutput: '1', isHidden: false, category: 'BOUNDARY' },
            { input: '-1', expectedOutput: '-1', isHidden: true, category: 'EDGE_CASE' }
        ]
    });

    questions.push({
        slug: 'shortest-path-dijkstra',
        title: 'Shortest Path (Dijkstra\'s Algorithm)',
        description: 'Given a weighted directed graph with V vertices and E edges, find the shortest path from source vertex 0 to all other vertices using Dijkstra\'s algorithm. If a vertex is unreachable, print -1.',
        difficulty: 'HIGH',
        topics: ['Graphs', 'Heaps'],
        tags: ['dijkstra', 'shortest-path'],
        skills: ['Graph Traversal', 'Heaps'],
        inputFormat: 'First line: V and E\nNext E lines: u v w (edge from u to v with weight w)\nAll edges have non-negative weights.',
        outputFormat: 'Space-separated shortest distances from vertex 0 to all vertices',
        constraints: '1 ≤ V ≤ 10^4\n0 ≤ E ≤ 10^5\n0 ≤ w ≤ 10^4',
        executionMode: 'STDIN',
        examples: [
            { input: '5 6\n0 1 4\n0 2 1\n2 1 2\n1 3 1\n2 3 5\n3 4 3', output: '0 3 1 4 7', explanation: 'Shortest paths from 0' }
        ],
        referenceSolution: { python: 'import heapq\nv, e = map(int, input().split())\nadj = [[] for _ in range(v)]\nfor _ in range(e):\n    u, w, wt = map(int, input().split())\n    adj[u].append((w, wt))\ndist = [float("inf")] * v\ndist[0] = 0\nheap = [(0, 0)]\nwhile heap:\n    d, u = heapq.heappop(heap)\n    if d > dist[u]:\n        continue\n    for nb, wt in adj[u]:\n        nd = d + wt\n        if nd < dist[nb]:\n            dist[nb] = nd\n            heapq.heappush(heap, (nd, nb))\nprint(*[d if d != float("inf") else -1 for d in dist])' },
        testCases: [
            { input: '5 6\n0 1 4\n0 2 1\n2 1 2\n1 3 1\n2 3 5\n3 4 3', expectedOutput: '0 3 1 4 7', isHidden: false, category: 'NORMAL' },
            { input: '2 1\n0 1 5', expectedOutput: '0 5', isHidden: false, category: 'BOUNDARY' },
            { input: '3 0', expectedOutput: '0 -1 -1', isHidden: true, category: 'EDGE_CASE' }
        ]
    });

    
    questions.push({
        slug: 'n-queens-puzzle',
        title: 'N-Queens Distinct Solutions',
        description: 'The n-queens puzzle is the problem of placing n queens on an n x n chessboard such that no two queens attack each other. Given an integer n, return the number of distinct solutions to the n-queens puzzle.',
        difficulty: 'HIGH',
        topics: ['Recursion', 'Dynamic Programming'],
        tags: ['backtracking', 'n-queens'],
        skills: ['Backtracking', 'Recursion'],
        inputFormat: 'A single integer N',
        outputFormat: 'Number of distinct solutions',
        constraints: '1 <= N <= 12',
        executionMode: 'STDIN',
        examples: [
            { input: '4', output: '2', explanation: 'Two distinct configurations exist for 4-queens.' },
            { input: '1', output: '1', explanation: 'One queen on 1x1 board.' }
        ],
        referenceSolution: { python: 'n = int(input())\ncount = 0\ndef solve(row, cols, diag1, diag2):\n    global count\n    if row == n:\n        count += 1\n        return\n    for col in range(n):\n        if col not in cols and (row - col) not in diag1 and (row + col) not in diag2:\n            cols.add(col)\n            diag1.add(row - col)\n            diag2.add(row + col)\n            solve(row + 1, cols, diag1, diag2)\n            cols.remove(col)\n            diag1.remove(row - col)\n            diag2.remove(row + col)\nsolve(0, set(), set(), set())\nprint(count)' },
        testCases: [
            { input: '4', expectedOutput: '2', isHidden: false, category: 'NORMAL' },
            { input: '1', expectedOutput: '1', isHidden: false, category: 'BOUNDARY' },
            { input: '5', expectedOutput: '10', isHidden: true, category: 'NORMAL' },
            { input: '6', expectedOutput: '4', isHidden: true, category: 'NORMAL' },
            { input: '8', expectedOutput: '92', isHidden: true, category: 'BOUNDARY' }
        ]
    });

    questions.push({
        slug: 'burst-balloons',
        title: 'Burst Balloons Maximum Coins',
        description: 'You are given n balloons, indexed 0 to n - 1. Each balloon has a number nums[i]. If you burst the i-th balloon, you get nums[i - 1] * nums[i] * nums[i + 1] coins (out of bounds treated as 1). Return the maximum coins you can collect by bursting all balloons wisely.',
        difficulty: 'HIGH',
        topics: ['Dynamic Programming'],
        tags: ['dp', 'interval-dp'],
        skills: ['Dynamic Programming', 'Hard Algorithms'],
        inputFormat: 'First line: N\nSecond line: N space-separated integers',
        outputFormat: 'A single integer representing maximum coins',
        constraints: '1 <= N <= 300\n0 <= nums[i] <= 100',
        executionMode: 'STDIN',
        examples: [
            { input: '4\n3 1 5 8', output: '167', explanation: 'nums = [3,1,5,8] -> burst 1, 5, 3, 8 gives 167 coins.' }
        ],
        referenceSolution: { python: 'n = int(input())\nnums = [1] + list(map(int, input().split())) + [1]\nm = len(nums)\ndp = [[0] * m for _ in range(m)]\nfor length in range(1, n + 1):\n    for left in range(1, n - length + 2):\n        right = left + length - 1\n        for k in range(left, right + 1):\n            coins = nums[left - 1] * nums[k] * nums[right + 1] + dp[left][k - 1] + dp[k + 1][right]\n            if coins > dp[left][right]:\n                dp[left][right] = coins\nprint(dp[1][n])' },
        testCases: [
            { input: '4\n3 1 5 8', expectedOutput: '167', isHidden: false, category: 'NORMAL' },
            { input: '2\n1 5', expectedOutput: '10', isHidden: false, category: 'NORMAL' },
            { input: '1\n7', expectedOutput: '7', isHidden: true, category: 'BOUNDARY' },
            { input: '3\n2 3 4', expectedOutput: '36', isHidden: true, category: 'NORMAL' }
        ]
    });

    return questions;
}

// ═══════════════════════════════════════════════════════════════════
// SEED EXECUTION
// ═══════════════════════════════════════════════════════════════════

async function seedQuestionBank() {
    console.log('═══════════════════════════════════════════════════════');
    console.log('  Hire1Percent — Coding Question Bank Seeder');
    console.log('═══════════════════════════════════════════════════════\n');

    try {
        await mongoose.connect(MONGO_URI);
        console.log('[DB] Connected to MongoDB\n');

        const questions = buildQuestions();
        console.log(`[SEED] Total questions to seed: ${questions.length}`);

        const counts = { LOW: 0, MEDIUM: 0, HIGH: 0 };
        questions.forEach(q => counts[q.difficulty]++);
        console.log(`[SEED] Distribution: LOW=${counts.LOW}, MEDIUM=${counts.MEDIUM}, HIGH=${counts.HIGH}\n`);

        let inserted = 0;
        let skipped = 0;
        let errors = 0;
        const results = [];

        for (const q of questions) {
            try {
                // Check if slug already exists (idempotent)
                const existing = await QuestionBank.findOne({ slug: q.slug });
                if (existing) {
                    skipped++;
                    results.push({ slug: q.slug, status: 'SKIPPED', reason: 'Already exists' });
                    continue;
                }

                // Set default fields
                const doc = new QuestionBank({
                    ...q,
                    supportedLanguages: q.supportedLanguages || ['python', 'javascript', 'java', 'c++', 'go'],
                    approvalStatus: 'PENDING_REVIEW', // Not auto-approved
                    createdBy: 'system',
                    version: 1,
                    accessScope: 'PUBLIC',
                    difficultyWeight: q.difficulty === 'HIGH' ? 3 : q.difficulty === 'MEDIUM' ? 2 : 1,
                    marks: q.difficulty === 'HIGH' ? 15 : q.difficulty === 'MEDIUM' ? 10 : 5,
                    testCases: (q.testCases || []).map(tc => ({
                        ...tc,
                        validationStatus: 'UNVERIFIED',
                        source: 'SEED_SCRIPT',
                        weight: tc.isHidden ? 2 : 1,
                        timeoutMs: tc.timeoutMs || 6000
                    })),
                    validationMetrics: {
                        totalGenerated: (q.testCases || []).length,
                        validatedCount: 0,
                        failedCount: 0,
                        validationMethod: 'PENDING'
                    }
                });

                await doc.save();
                inserted++;
                results.push({ slug: q.slug, status: 'INSERTED', difficulty: q.difficulty });
            } catch (err) {
                errors++;
                results.push({ slug: q.slug, status: 'ERROR', error: err.message });
                console.error(`[ERROR] ${q.slug}: ${err.message}`);
            }
        }

        console.log('\n═══════════════════════════════════════════════════════');
        console.log('  SEED RESULTS');
        console.log('═══════════════════════════════════════════════════════');
        console.log(`  Inserted: ${inserted}`);
        console.log(`  Skipped:  ${skipped} (already exist)`);
        console.log(`  Errors:   ${errors}`);
        console.log(`  Total:    ${questions.length}`);
        console.log('═══════════════════════════════════════════════════════\n');

        if (errors > 0) {
            console.log('Failed questions:');
            results.filter(r => r.status === 'ERROR').forEach(r => {
                console.log(`  - ${r.slug}: ${r.error}`);
            });
        }

    } catch (err) {
        console.error('[FATAL] Seed failed:', err.message);
    } finally {
        await mongoose.disconnect();
        console.log('[DB] Disconnected from MongoDB');
    }
}

// Run if called directly
if (require.main === module) {
    seedQuestionBank();
}

module.exports = { seedQuestionBank, buildQuestions };
