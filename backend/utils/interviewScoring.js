const STOP_WORDS = new Set([
    'about', 'after', 'again', 'against', 'also', 'among', 'and', 'answer', 'any', 'are',
    'because', 'been', 'before', 'being', 'between', 'both', 'but', 'can', 'could',
    'describe', 'does', 'doing', 'done', 'during', 'each', 'from', 'give', 'have',
    'having', 'here', 'into', 'just', 'like', 'make', 'many', 'more', 'most', 'much',
    'must', 'need', 'only', 'other', 'over', 'part', 'same', 'should', 'since',
    'some', 'such', 'take', 'than', 'that', 'their', 'them', 'then', 'there',
    'these', 'they', 'this', 'those', 'through', 'under', 'using', 'very', 'what',
    'when', 'where', 'which', 'while', 'with', 'would', 'your'
]);

const EXPLANATION_SIGNALS = [
    'because', 'for example', 'for instance', 'for this reason', 'so that', 'in order to',
    'trade-off', 'tradeoff', 'approach', 'strategy', 'optimize', 'improve', 'reduce',
    'prevent', 'monitor', 'measure', 'debug', 'analyze', 'validate', 'ensure'
];

const WEAK_ANSWERS = [
    'i dont know', 'i don\'t know', 'no idea', 'skip', 'don\'t know', 'not sure',
    'i have no idea', 'i do not know'
];

const TECHNICAL_SIGNALS = [
    'api', 'architecture', 'async', 'backend', 'cache', 'caching', 'component',
    'database', 'frontend', 'function', 'hook', 'hooks', 'latency', 'memoization',
    'performance', 'profiling', 'query', 'react', 'redis', 'render', 'scalable',
    'scalability', 'state', 'testing', 'typescript', 'usecallback', 'usememo'
];

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function roundToTenth(value) {
    return Math.round(value * 10) / 10;
}

function tokenize(text, minimumLength = 3) {
    return String(text || '')
        .toLowerCase()
        .replace(/[^a-z0-9+#.\s-]/g, ' ')
        .split(/\s+/)
        .map(token => token.trim())
        .filter(token => token.length >= minimumLength && !STOP_WORDS.has(token));
}

function unique(list) {
    return [...new Set(list.filter(Boolean))];
}

function extractQuestionKeywords(questionText) {
    return unique(tokenize(questionText, 4)).slice(0, 16);
}

function extractJobKeywords(jobSkills = [], jobDescription = '') {
    const skillTokens = Array.isArray(jobSkills)
        ? jobSkills.flatMap(skill => {
            const raw = String(skill || '').toLowerCase().trim();
            return raw ? unique([raw, ...tokenize(raw, 2)]) : [];
        })
        : [];

    const descriptionTokens = unique(tokenize(jobDescription, 5)).slice(0, 20);
    return unique([...skillTokens, ...descriptionTokens]).slice(0, 24);
}

function countPhraseMatches(answerLower, phrases = []) {
    return phrases.filter(phrase => phrase && answerLower.includes(String(phrase).toLowerCase())).length;
}

function buildHeuristicFeedback(dimensions, finalMarks, questionHits, jobHits) {
    const labels = {
        relevance: 'role relevance',
        completeness: 'answer completeness',
        specificity: 'technical specificity',
        clarity: 'communication clarity'
    };

    const sorted = Object.entries(dimensions)
        .sort((a, b) => b[1] - a[1]);
    const strongestKey = sorted[0]?.[0] || 'relevance';
    const weakestKey = sorted[sorted.length - 1]?.[0] || 'clarity';
    const strongestLabel = labels[strongestKey];
    const weakestLabel = labels[weakestKey];

    if (finalMarks >= 8.5) {
        return `Strong answer with high ${strongestLabel} and clear alignment to the question. It would be even better with a little more ${weakestLabel}.`;
    }

    if (finalMarks >= 7) {
        return `Good answer with solid ${strongestLabel} and useful context. To score higher, add more ${weakestLabel} or sharper role-specific examples.`;
    }

    if (questionHits === 0 && jobHits === 0) {
        return "The answer stayed too general and did not connect strongly enough to the interview question or role requirements.";
    }

    return `The answer showed some understanding, but it needs stronger ${weakestLabel} and clearer role-specific detail to score higher.`;
}

function isEmptyAnswer(answer) {
    return (
        !answer ||
        answer.trim().length === 0 ||
        answer.trim().length < 10
    );
}

function scoreInterviewAnswer({
    questionText,
    answerText,
    jobSkills = [],
    jobDescription = ''
}) {
    const normalizedAnswer = String(answerText || '').trim();
    const answerLower = normalizedAnswer.toLowerCase();

    // Check for weak answers
    const isWeak = WEAK_ANSWERS.some(weak => answerLower === weak || answerLower.includes(weak) && answerLower.length < 20);

    if (isEmptyAnswer(normalizedAnswer) || isWeak) {
        return {
            score: 0,
            marks: 0,
            isAttempted: false,
            feedback: "The answer was missing, too short, or did not demonstrate any knowledge (e.g. 'skip' or 'I don't know').",
            breakdown: {
                relevance: 0,
                completeness: 0,
                specificity: 0,
                clarity: 0
            }
        };
    }

    const answerLower = normalizedAnswer.toLowerCase();
    const words = normalizedAnswer.match(/\b[a-zA-Z0-9+#.%/-]+\b/g) || [];
    const uniqueWords = unique(words.map(word => word.toLowerCase()));
    const sentences = normalizedAnswer
        .split(/(?<=[.?!])\s+/)
        .map(sentence => sentence.trim())
        .filter(Boolean);

    const questionKeywords = extractQuestionKeywords(questionText);
    const jobKeywords = extractJobKeywords(jobSkills, jobDescription);

    const questionHits = countPhraseMatches(answerLower, questionKeywords);
    const jobHits = countPhraseMatches(answerLower, jobKeywords);
    const explanationHits = countPhraseMatches(answerLower, EXPLANATION_SIGNALS);
    const technicalHits = countPhraseMatches(answerLower, TECHNICAL_SIGNALS);
    const metricHits = (normalizedAnswer.match(/\b\d+(?:\.\d+)?%?\b/g) || []).length;
    const lexicalDiversity = uniqueWords.length / Math.max(words.length, 1);
    const averageSentenceLength = words.length / Math.max(sentences.length, 1);
    const repetitionPenalty = clamp((1 - lexicalDiversity) * 3, 0, 2.2);

    const questionCoverage = questionKeywords.length
        ? questionHits / questionKeywords.length
        : 0.4;
    const jobCoverage = jobKeywords.length
        ? jobHits / jobKeywords.length
        : 0.35;

    const relevance = clamp(
        2.1
        + questionCoverage * 4.4
        + Math.min(jobHits, 5) * 0.35
        + Math.min(technicalHits, 4) * 0.2,
        0,
        10
    );

    const completeness = clamp(
        1.6
        + Math.min(words.length / 12, 4.6)
        + Math.min(sentences.length, 4) * 0.65
        + (explanationHits > 0 ? 0.5 : 0)
        + (metricHits > 0 ? 0.4 : 0),
        0,
        10
    );

    const specificity = clamp(
        1.7
        + Math.min(uniqueWords.length / 11, 2.8)
        + Math.min(technicalHits, 6) * 0.55
        + Math.min(explanationHits, 4) * 0.45
        + Math.min(metricHits, 3) * 0.45,
        0,
        10
    );

    const clarity = clamp(
        3.6
        + (averageSentenceLength >= 8 && averageSentenceLength <= 24 ? 1.5 : 0.4)
        + lexicalDiversity * 2.2
        + (/[,;:]/.test(normalizedAnswer) ? 0.5 : 0)
        - repetitionPenalty,
        0,
        10
    );

    let finalMarks = (
        (relevance * 0.38) +
        (completeness * 0.24) +
        (specificity * 0.24) +
        (clarity * 0.14)
    );

    if (words.length < 8) {
        finalMarks = Math.min(finalMarks, 4.5);
    } else if (words.length < 16) {
        finalMarks = Math.min(finalMarks, 6.6);
    }

    if (questionKeywords.length > 0 && questionHits === 0) {
        finalMarks -= 0.8;
    }

    if (jobKeywords.length > 0 && jobHits === 0 && technicalHits === 0) {
        finalMarks -= 0.4;
    }

    if (explanationHits > 1 && metricHits > 0) {
        finalMarks += 0.3;
    }

    finalMarks = roundToTenth(clamp(finalMarks, 2.0, 9.8));
    const percentage = clamp(Math.round(finalMarks * 10), 20, 98);

    return {
        score: percentage,
        marks: finalMarks,
        feedback: buildHeuristicFeedback(
            { relevance, completeness, specificity, clarity },
            finalMarks,
            questionHits,
            jobHits
        ),
        breakdown: {
            relevance: roundToTenth(relevance),
            completeness: roundToTenth(completeness),
            specificity: roundToTenth(specificity),
            clarity: roundToTenth(clarity)
        }
    };
}

function averageInterviewScore(answerEvaluations = []) {
    const values = answerEvaluations
        .map(entry => Number(entry?.score))
        .filter(value => !Number.isNaN(value));

    if (!values.length) return 0;
    return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function hasLegacyUniformQuestionScores(interviewAnswers = []) {
    if (!Array.isArray(interviewAnswers) || interviewAnswers.length < 2) {
        return false;
    }

    const allMarksMissing = interviewAnswers.every(answer => typeof answer?.marks !== 'number');
    if (!allMarksMissing) {
        return false;
    }

    const uniqueScores = new Set(
        interviewAnswers
            .map(answer => Number(answer?.score))
            .filter(score => !Number.isNaN(score))
    );

    return uniqueScores.size === 1;
}

module.exports = {
    averageInterviewScore,
    clamp,
    hasLegacyUniformQuestionScores,
    roundToTenth,
    scoreInterviewAnswer
};
