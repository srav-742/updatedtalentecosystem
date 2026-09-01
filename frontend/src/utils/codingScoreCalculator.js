/**
 * Dynamic Coding Round Score Distribution Utility (Frontend)
 * 
 * Objective:
 * Guarantee that the Coding Round has a maximum score of strictly 100 marks,
 * dynamically distributed across any number of questions based on their difficulty:
 * - LOW    = 1
 * - MEDIUM = 2
 * - HIGH   = 3
 * 
 * Formula:
 * Total Weight = Σ (weights)
 * Question Maximum Marks = (Weight / Total Weight) * 100
 * Difference (100 - Σ rounded) is applied to the final question to guarantee exactly 100.00.
 */

export const DIFFICULTY_WEIGHTS = Object.freeze({
    LOW: 1,
    MEDIUM: 2,
    HIGH: 3
});

/**
 * Normalizes difficulty input into standard uppercase 'LOW', 'MEDIUM', 'HIGH'
 * with backward compatibility for 'Easy', 'Medium', 'Hard'.
 * 
 * @param {string} difficulty 
 * @returns {'LOW' | 'MEDIUM' | 'HIGH'}
 */
export function normalizeDifficulty(difficulty) {
    if (!difficulty || typeof difficulty !== 'string') return 'MEDIUM';
    const normalized = difficulty.trim().toUpperCase();

    if (normalized === 'LOW' || normalized === 'EASY') return 'LOW';
    if (normalized === 'HIGH' || normalized === 'HARD') return 'HIGH';
    if (normalized === 'MEDIUM') return 'MEDIUM';

    return 'MEDIUM';
}

/**
 * Gets difficulty weight (LOW = 1, MEDIUM = 2, HIGH = 3).
 * 
 * @param {string} difficulty 
 * @returns {number} 1, 2, or 3
 */
export function getDifficultyWeight(difficulty) {
    const norm = normalizeDifficulty(difficulty);
    return DIFFICULTY_WEIGHTS[norm] || 2;
}

/**
 * Rounds a number to exactly 2 decimal places.
 * 
 * @param {number} num 
 * @returns {number}
 */
export function round2(num) {
    return Math.round((Number(num) + Number.EPSILON) * 100) / 100;
}

/**
 * Calculates dynamic maximum marks for a list of questions.
 * Guarantees sum(maximumMarks) === 100.00 for any valid array of questions.
 * 
 * @param {Array<Object>} questions - Array of questions containing difficulty
 * @returns {Array<Object>} Array of objects with question id, normalized difficulty, weight, and maximumMarks
 */
export function calculateDynamicMarks(questions) {
    if (!Array.isArray(questions) || questions.length === 0) {
        return [];
    }

    // 1. Calculate weights for all questions
    const items = questions.map((q, index) => {
        const difficulty = normalizeDifficulty(q.difficulty);
        const difficultyWeight = getDifficultyWeight(difficulty);
        return {
            index,
            ref: q,
            id: q._id || q.id,
            difficulty,
            difficultyWeight
        };
    });

    const totalWeight = items.reduce((sum, item) => sum + item.difficultyWeight, 0);

    if (totalWeight <= 0) {
        return questions.map(q => ({
            ref: q,
            id: q._id || q.id,
            difficulty: normalizeDifficulty(q.difficulty),
            difficultyWeight: 2,
            maximumMarks: 0
        }));
    }

    // 2. Proportional marks calculation (rounded to 2 decimal places)
    const calculated = items.map(item => {
        const rawProportion = (item.difficultyWeight / totalWeight) * 100;
        const maximumMarks = round2(rawProportion);
        return {
            ...item,
            maximumMarks
        };
    });

    // 3. Compute rounded total & rounding difference
    const currentTotal = round2(calculated.reduce((sum, item) => sum + item.maximumMarks, 0));
    const difference = round2(100 - currentTotal);

    // 4. Apply difference to final question to ensure exactly 100.00 total
    if (calculated.length > 0 && Math.abs(difference) > 0.00001) {
        const lastIdx = calculated.length - 1;
        calculated[lastIdx].maximumMarks = round2(calculated[lastIdx].maximumMarks + difference);
    }

    return calculated;
}

/**
 * Computes difficulty distribution summary for recruiter/admin display.
 * 
 * @param {Array<Object>} questions 
 * @returns {{ totalQuestions: number, high: number, medium: number, low: number, totalMarks: number, questionMarks: Array<{ index: number, id: any, title: string, difficulty: string, marks: number }> }}
 */
export function getRecruiterDistributionSummary(questions) {
    if (!Array.isArray(questions) || questions.length === 0) {
        return {
            totalQuestions: 0,
            high: 0,
            medium: 0,
            low: 0,
            totalMarks: 100,
            questionMarks: []
        };
    }

    const marksMap = calculateDynamicMarks(questions);
    let high = 0;
    let medium = 0;
    let low = 0;

    const questionMarks = marksMap.map((item, idx) => {
        if (item.difficulty === 'HIGH') high++;
        else if (item.difficulty === 'MEDIUM') medium++;
        else if (item.difficulty === 'LOW') low++;

        const originalTitle = item.ref?.title || `Question ${idx + 1}`;
        return {
            index: idx + 1,
            id: item.id,
            title: originalTitle,
            difficulty: item.difficulty,
            difficultyWeight: item.difficultyWeight,
            marks: item.maximumMarks
        };
    });

    return {
        totalQuestions: questions.length,
        high,
        medium,
        low,
        totalMarks: 100,
        questionMarks
    };
}
