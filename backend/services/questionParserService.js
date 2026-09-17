const crypto = require('crypto');
const path = require('path');
const pdf = require('pdf-parse');
const xlsx = require('xlsx');

let mammoth = null;
try {
    mammoth = require('mammoth');
} catch (_) {
    // Optional fallback if mammoth is not installed
}

/**
 * Strips question numbering/bullet prefixes while preserving exact wording.
 * Examples:
 *   "1. Explain goroutines." -> "Explain goroutines."
 *   "Q1: Explain the GMP scheduler." -> "Explain the GMP scheduler."
 *   "Question 3 - What are channels?" -> "What are channels?"
 *   "- Explain mutex." -> "Explain mutex."
 */
function cleanQuestionText(rawText = '') {
    if (!rawText) return '';
    let cleaned = String(rawText).trim();

    // 1. Remove leading numberings: "1.", "1)", "[1]", "Q1.", "Q1:", "Question 1:", "1 - ", etc.
    cleaned = cleaned.replace(/^\s*(?:\[\s*\d+\s*\]\s*|Q\s*[:.]?\s*\d+[:.)\]\s-]*|Question\s*[:.]?\s*\d+[:.)\]\s-]*|\d+[:.)\]\s-]+|[-*•]\s+)/i, '').trim();

    // 2. Remove lingering "Q:" or "Question:" prefix if without number
    cleaned = cleaned.replace(/^\s*(?:Q|Question)\s*[:.-]\s*/i, '').trim();

    // 3. Collapse multiple spaces/tabs within lines, while keeping single clean spaces
    cleaned = cleaned.replace(/[ \t]+/g, ' ').trim();

    return cleaned;
}

/**
 * Infers category, difficulty, and questionType for metadata.
 * Recruiter question wording is NEVER changed.
 */
function inferQuestionMetadata(questionText = '') {
    const textLower = questionText.toLowerCase();

    // 1. Category Inference
    let category = 'General';
    if (/golang|\bgo\b|goroutine|channel|mutex|sync|deadlock|race condition|atomic|worker pool|concurrency/i.test(textLower)) {
        category = 'Go / Golang';
    } else if (/garbage collection|\bgc\b|escape analysis|heap|stack|memory leak|pointer/i.test(textLower)) {
        category = 'Memory Management';
    } else if (/interface|nil|slice|map|struct|defer|panic|recover|generics|type assertion|compilation/i.test(textLower)) {
        category = 'Language Fundamentals';
    } else if (/microservice|system design|scalability|load balancer|architecture|cache|redis|throughput|latency|high availability/i.test(textLower)) {
        category = 'System Design';
    } else if (/sql|database|nosql|transaction|acid|index|postgres|mongo|gorm/i.test(textLower)) {
        category = 'Database';
    } else if (/http|rest|api|middleware|router|endpoint|status code/i.test(textLower)) {
        category = 'HTTP / API';
    } else if (/grpc|protobuf|protocol buffer|rpc|streaming/i.test(textLower)) {
        category = 'gRPC / Network';
    } else if (/debug|profiling|pprof|incident|outage|bottleneck|benchmark/i.test(textLower)) {
        category = 'Debugging / Performance';
    } else if (/tell me about a time|how do you handle|conflict|team|leadership|stakeholder/i.test(textLower)) {
        category = 'Behavioral';
    }

    // 2. Difficulty Inference
    let difficulty = 'Medium';
    if (/internals|under the hood|gmp|scheduler|escape analysis|hazard|distributed|zero-allocation|assembly|memory model/i.test(textLower)) {
        difficulty = 'Hard';
    } else if (/what is|define|basic|syntax|difference between/i.test(textLower) && questionText.length < 80) {
        difficulty = 'Easy';
    }

    // 3. Question Type Inference
    let questionType = 'Conceptual';
    if (/debug|troubleshoot|fix|why does this fail|error handling/i.test(textLower)) {
        questionType = 'Debugging';
    } else if (/suppose|scenario|how would you implement|walk me through|how would you architect|design/i.test(textLower)) {
        questionType = 'Scenario';
    } else if (category === 'System Design') {
        questionType = 'System Design';
    } else if (category === 'Behavioral') {
        questionType = 'Behavioral';
    }

    return { category, difficulty, questionType };
}

/**
 * Normalizes question text for robust duplicate detection.
 */
function normalizeForComparison(text = '') {
    return cleanQuestionText(text)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
}

/**
 * Parses raw text (e.g. from copy-paste or text file) into structured questions.
 */
function parseRawQuestionText(rawText = '') {
    if (!rawText || typeof rawText !== 'string') {
        return {
            totalDetected: 0,
            uniqueCount: 0,
            duplicateCount: 0,
            questions: []
        };
    }

    const lines = rawText.split(/\r?\n/);
    const candidateBlocks = [];
    let currentBlock = [];

    // Helper to check if a line starts a new question
    const startsNewQuestion = (line) => {
        const trimmed = line.trim();
        if (!trimmed) return false;
        // Patterns: "[1]", "1.", "1)", "Q1", "Question 1", "- ", "* ", "• "
        return /^(?:\[\s*\d+\s*\]|Q\s*[:.]?\s*\d+|\bQuestion\s*[:.]?\s*\d+|\d+[:.)\]\s-]+|[-*•]\s+)/i.test(trimmed);
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        if (!trimmed) {
            // Empty line: if we have an accumulated block, close it
            if (currentBlock.length > 0) {
                candidateBlocks.push(currentBlock.join(' '));
                currentBlock = [];
            }
            continue;
        }

        if (startsNewQuestion(trimmed) && currentBlock.length > 0) {
            candidateBlocks.push(currentBlock.join(' '));
            currentBlock = [trimmed];
        } else {
            currentBlock.push(trimmed);
        }
    }

    if (currentBlock.length > 0) {
        candidateBlocks.push(currentBlock.join(' '));
    }

    // Process blocks and filter out noise / duplicates
    const questions = [];
    const seenHashes = new Set();
    let duplicateCount = 0;
    let totalDetected = 0;

    for (let i = 0; i < candidateBlocks.length; i++) {
        const cleaned = cleanQuestionText(candidateBlocks[i]);

        // Validation: meaningful question text, not just numbers or headers
        if (!cleaned || cleaned.length < 5) continue;
        if (/^(?:table of contents|questions|question list|interview questions|index|page \d+)$/i.test(cleaned)) continue;

        totalDetected++;

        const normKey = normalizeForComparison(cleaned);
        if (!normKey) continue;

        if (seenHashes.has(normKey)) {
            duplicateCount++;
            continue;
        }

        seenHashes.add(normKey);

        const { category, difficulty, questionType } = inferQuestionMetadata(cleaned);
        const questionId = `q_${Date.now()}_${questions.length + 1}_${crypto.randomBytes(3).toString('hex')}`;

        questions.push({
            questionId,
            text: cleaned,
            question: cleaned,
            order: questions.length + 1,
            category,
            difficulty,
            questionType,
            timeLimit: 120,
            source: 'RECRUITER'
        });
    }

    const warnings = [];
    if (duplicateCount > 0) {
        warnings.push(`Filtered out ${duplicateCount} duplicate question(s).`);
    }

    return {
        count: questions.length,
        totalDetected,
        uniqueCount: questions.length,
        duplicateCount,
        warnings,
        questions
    };
}

/**
 * Extracts raw text from an uploaded file buffer.
 * Supports: .txt, .csv, .xlsx, .docx, .pdf
 */
async function parseFileToText(fileBuffer, originalFilename = '', mimeType = '') {
    if (!fileBuffer || !fileBuffer.length) {
        throw new Error("File buffer is empty");
    }

    const ext = path.extname(originalFilename || '').toLowerCase();

    // 1. Plain Text (.txt)
    if (ext === '.txt' || mimeType.includes('text/plain')) {
        return fileBuffer.toString('utf8');
    }

    // 2. PDF (.pdf)
    if (ext === '.pdf' || mimeType.includes('application/pdf')) {
        const data = await pdf(fileBuffer);
        return (data && data.text) ? data.text : '';
    }

    // 3. Excel (.xlsx) / CSV (.csv)
    if (ext === '.xlsx' || ext === '.xls' || ext === '.csv' || mimeType.includes('spreadsheet') || mimeType.includes('csv')) {
        const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
        const extractedQuestions = [];

        for (const sheetName of workbook.SheetNames) {
            const sheet = workbook.Sheets[sheetName];
            const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });

            if (!rows || rows.length === 0) continue;

            // Find question column index
            let questionColIndex = -1;
            const headerRow = rows[0] || [];

            for (let c = 0; c < headerRow.length; c++) {
                const headerText = String(headerRow[c] || '').toLowerCase();
                if (headerText.includes('question') || headerText.includes('prompt') || headerText.includes('title')) {
                    questionColIndex = c;
                    break;
                }
            }

            const startRow = questionColIndex !== -1 ? 1 : 0;
            for (let r = startRow; r < rows.length; r++) {
                const row = rows[r];
                if (!row) continue;

                if (questionColIndex !== -1) {
                    const text = String(row[questionColIndex] || '').trim();
                    if (text) extractedQuestions.push(text);
                } else {
                    // Pick the cell with the longest text in the row
                    let longest = '';
                    for (let c = 0; c < row.length; c++) {
                        const cellText = String(row[c] || '').trim();
                        if (cellText.length > longest.length) longest = cellText;
                    }
                    if (longest && longest.length > 5) {
                        extractedQuestions.push(longest);
                    }
                }
            }
        }

        return extractedQuestions.join('\n\n');
    }

    // 4. Word Document (.docx)
    if (ext === '.docx' || mimeType.includes('wordprocessingml')) {
        if (mammoth) {
            const result = await mammoth.extractRawText({ buffer: fileBuffer });
            return (result && result.value) ? result.value : '';
        }
        // Fallback: search for UTF-8 XML strings inside zip buffer
        const rawStr = fileBuffer.toString('utf8');
        const textParts = rawStr.match(/<w:t[^>]*>([^<]+)<\/w:t>/g) || [];
        return textParts.map(t => t.replace(/<[^>]+>/g, '')).join(' ');
    }

    // Default fallback to UTF-8
    return fileBuffer.toString('utf8');
}

/**
 * Validates question bank configuration for saving.
 */
function validateQuestionBank(questions = [], questionCount = 5) {
    const validQuestions = (questions || []).filter(q => {
        const txt = q?.text || q?.question;
        return txt && String(txt).trim().length > 0;
    });

    const errors = [];

    if (validQuestions.length === 0) {
        errors.push("At least one valid recruiter question is required.");
        return {
            isValid: false,
            error: errors[0],
            errors
        };
    }

    const count = (questionCount !== undefined && questionCount !== null && !isNaN(Number(questionCount))) ? Number(questionCount) : validQuestions.length;

    if (count < 1) {
        errors.push("Question count must be at least 1.");
    }

    if (count > validQuestions.length) {
        errors.push(`Question count (${count}) cannot exceed the number of questions available (${validQuestions.length}).`);
    }

    if (errors.length > 0) {
        return {
            isValid: false,
            error: errors[0],
            errors
        };
    }

    return {
        isValid: true,
        errors: [],
        normalizedCount: count,
        validQuestions
    };
}

module.exports = {
    cleanQuestionText,
    inferQuestionMetadata,
    normalizeForComparison,
    parseRawQuestionText,
    parseFileToText,
    validateQuestionBank
};
