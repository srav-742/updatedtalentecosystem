const Application = require('../models/Application');
const ResumeProfile = require('../models/ResumeProfile');
const ResumeAnalysis = require('../models/ResumeAnalysis');
const AssessmentSubmission = require('../models/AssessmentSubmission');
const User = require('../models/User');
const Job = require('../models/Job');
const CodingQuestion = require('../models/CodingQuestion');
const CodingRound = require('../models/CodingRound');
const { callInterviewAI } = require('../utils/aiClients');
const mongoose = require('mongoose');

/**
 * GET /api/transcripts/:applicationId/recommendation
 * Generates or retrieves cached AI overall summary and hire recommendations.
 */
const getRecommendationSummary = async (req, res) => {
    try {
        const { applicationId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(applicationId)) {
            return res.status(400).json({ message: 'Invalid application ID' });
        }

        // 1. Fetch the application
        const application = await Application.findById(applicationId).populate('codingAnswers.questionId');
        if (!application) {
            return res.status(404).json({ message: 'Application not found' });
        }

        const isForce = req.query.force === 'true' || req.query.refresh === 'true';

        // 2. Check if recommendation summary already exists
        const hasExisting = application.recommendationSummary && application.recommendationSummary.overallSummary;
        const hasCodingAnswers = Array.isArray(application.codingAnswers) && application.codingAnswers.length > 0;
        const isStaleCodingSummary = hasCodingAnswers && application.recommendationSummary && (
            /no skill assessment/i.test(application.recommendationSummary.overallSummary || '') ||
            /no assessment/i.test(application.recommendationSummary.overallSummary || '') ||
            (Array.isArray(application.recommendationSummary.weaknesses) && application.recommendationSummary.weaknesses.some(w => /no skill assessment/i.test(w)))
        );

        if (hasExisting && !isForce && !isStaleCodingSummary) {
            return res.json(application.recommendationSummary);
        }

        // 3. Gather data to build the AI prompt context
        const userId = application.userId;
        const jobId = application.jobId;

        const job = await Job.findById(jobId).lean();
        const user = await User.findOne({ uid: userId }).lean();
        const resumeProfile = await ResumeProfile.findOne({ userId }).lean();
        const resumeAnalysis = await ResumeAnalysis.findOne({ userId, jobId }).lean();
        const assessment = (application.assessmentSubmissionId 
            ? await AssessmentSubmission.findById(application.assessmentSubmissionId).lean() 
            : null)
            || await AssessmentSubmission.findOne({ applicationId }).lean()
            || await AssessmentSubmission.findOne({ userId, jobId }).sort({ submittedAt: -1 }).lean();

        // 4. Construct helper data structures for prompt
        const candidateName = application.applicantName || user?.name || 'Candidate';
        const jobTitle = job?.title || 'Unknown Role';
        const jobDesc = job?.description || '';
        const jobSkills = (job?.skills || []).join(', ') || 'N/A';

        // Resume info
        const resumeSummary = resumeProfile?.summary || '';
        const resumeSkills = resumeProfile?.skills ? JSON.stringify(resumeProfile.skills) : 'N/A';
        const resumeAnalysisText = resumeAnalysis ? `
Overall Resume Match Score: ${application.resumeMatchPercent || resumeAnalysis.matchPercentage || 0}/10
Explanation: ${resumeAnalysis.explanation || ''}
Skills Feedback: ${resumeAnalysis.skillsFeedback || ''}
Experience Feedback: ${resumeAnalysis.experienceFeedback || ''}
` : 'N/A';

        // Skill Assessment (MCQ)
        const assessmentScore = application.assessmentScore !== null && application.assessmentScore !== undefined 
            ? application.assessmentScore 
            : (assessment?.score || 0);
        let assessmentDetails = 'No MCQ assessment taken';
        if (assessment) {
            const qaList = (assessment.answers || []).map((a, i) => `Q${i+1}: ${a.question}\nCorrect: ${a.isCorrect ? 'Yes' : 'No'}\nCandidate Answer: ${a.userAnswer}\nCorrect Answer: ${a.correctAnswer}`).join('\n\n');
            assessmentDetails = `Score: ${assessmentScore}/20\nCorrect Answers: ${assessment.correctAnswers}/${assessment.totalQuestions}\n\nQuestions & Answers:\n${qaList}`;
        }

        // Coding Assessment Details
        const codingScore = application.codingScore !== null && application.codingScore !== undefined 
            ? application.codingScore 
            : 0;
        let codingDetails = 'No coding assessment taken';
        if (hasCodingAnswers) {
            const qaList = application.codingAnswers.map((ca, i) => {
                const qDoc = ca.questionId && typeof ca.questionId === 'object' ? ca.questionId : {};
                const qTitle = ca.questionTitle || qDoc.title || `Coding Challenge ${i+1}`;
                const diff = ca.difficulty || qDoc.difficulty || 'MEDIUM';
                const obtMarks = ca.obtainedMarks !== undefined && ca.obtainedMarks !== null ? ca.obtainedMarks : (ca.score || 0);
                const maxMarks = ca.maximumMarks || qDoc.marks || 10;
                const testPassed = ca.testCasesPassed !== undefined && ca.testCasesPassed !== null ? ca.testCasesPassed : 0;
                const testTotal = ca.totalTestCases || 10;
                const verdict = ca.correctnessVerdict || (obtMarks > 0 ? 'Partially Correct' : 'Incorrect');

                return `Problem ${i+1}: ${qTitle} (${diff})
Status / Verdict: ${verdict}
Score: ${obtMarks}/${maxMarks} marks (${testPassed}/${testTotal} test cases passed)
Language: ${ca.language || 'Python'}
Candidate Submitted Code:
\`\`\`${ca.language || 'python'}
${ca.code ? ca.code.slice(0, 800) : 'No code submitted'}
\`\`\`
Evaluator Feedback: ${ca.feedback ? ca.feedback.slice(0, 600) : 'N/A'}`;
            }).join('\n\n');

            codingDetails = `Overall Coding Score: ${codingScore}/100\nTotal Challenges: ${application.codingAnswers.length}\n\nCandidate Coding Submissions:\n${qaList}`;
        }

        // Interview Details
        const interviewScore = application.interviewScore !== null && application.interviewScore !== undefined 
            ? application.interviewScore 
            : 0;
        let interviewDetails = 'No interview taken';
        if (application.interviewAnswers && application.interviewAnswers.length > 0) {
            const qaList = application.interviewAnswers.map((q, i) => `Q${q.questionNumber || i+1}: ${q.question}\nAnswer: ${q.answer}\nScore: ${q.score}/100 (${q.marks}/10)\nFeedback: ${q.feedback}`).join('\n\n');
            interviewDetails = `Score: ${interviewScore}/70\n\nQuestions & Answers:\n${qaList}`;
        }

        // Communication metrics
        const commDelta = application.metrics?.communicationDelta !== undefined ? application.metrics.communicationDelta : 'N/A';
        const thinkingLatency = application.metrics?.thinkingLatency !== undefined ? application.metrics.thinkingLatency : 'N/A';
        const ownershipScore = application.metrics?.ownershipMindset !== undefined ? application.metrics.ownershipMindset : 'N/A';

        // 5. Build prompt
        const prompt = `
You are an expert executive talent assessor and technical recruiter. Your task is to analyze a candidate's complete application profile and generate a comprehensive, highly refined evaluation summary and hire recommendation.

=== CANDIDATE PROFILE ===
Name: ${candidateName}

=== JOB DESCRIPTION ===
Role: ${jobTitle}
Company: ${job?.company || ''}
Description: ${jobDesc}
Required Skills: ${jobSkills}

=== RESUME EVALUATION ===
${resumeAnalysisText}

=== SKILL ASSESSMENT TRANSCRIPT ===
${assessmentDetails}

=== CODING ASSESSMENT TRANSCRIPT ===
${codingDetails}

=== INTERVIEW TRANSCRIPT ===
${interviewDetails}
Communication Delta Score: ${commDelta}
Thinking Latency Score: ${thinkingLatency}
Ownership Mindset Score: ${ownershipScore}

=== TASK ===
Analyze the candidate's complete performance: resume match, practical coding assessment performance (problem-solving velocity, test case pass rate, code quality, algorithms, and correctness), skill assessment, and interview transcripts. Write an objective, rigorous, and professional assessment.
Provide the output ONLY as a JSON object with the following structure:
{
  "keyStrengths": ["Strength 1 (specific to their answers, coding skills, or experience)", "Strength 2...", "Strength 3..."],
  "weaknesses": ["Weakness 1 (specific technical gaps, failed test cases, or shortcomings)", "Weakness 2..."],
  "areasToImprove": ["Area 1 (specific guidance on where they can upskill in coding/domain)", "Area 2..."],
  "communication": "Provide a concise assessment of candidate communication style, or note if the role evaluation was primarily code-based.",
  "overallSummary": "A highly refined, professional 3-4 sentence overall summary synthesizing the candidate's background, coding test results, and hiring suitability for this role."
}
`;

        // 6. Call AI
        console.log(`[RECOMMENDATION] Generating recommendation summary for applicationId: ${applicationId}`);
        const rawResponse = await callInterviewAI(
            prompt,
            1200,
            true,
            "You are a professional executive talent recruiter. Provide an objective evaluation of the candidate in a valid JSON object."
        );

        if (!rawResponse) {
            return res.status(500).json({ message: 'Failed to generate recommendation from AI.' });
        }

        // Parse JSON safely
        let parsed = null;
        let rawCleaned = String(rawResponse || '').trim();

        console.log('[RECOMMENDATION] Raw AI Response:', rawCleaned);

        // Remove markdown code blocks if present
        if (rawCleaned.startsWith('```')) {
            rawCleaned = rawCleaned.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/, '').trim();
        }

        // Extract raw JSON block { ... } if wrapped in conversational text
        if (!rawCleaned.startsWith('{')) {
            const firstBrace = rawCleaned.indexOf('{');
            const lastBrace = rawCleaned.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                rawCleaned = rawCleaned.substring(firstBrace, lastBrace + 1).trim();
            }
        }

        // Try standard parsing first
        try {
            parsed = JSON.parse(rawCleaned);
        } catch (_) {
            console.warn('[RECOMMENDATION] Direct JSON.parse failed. Attempting robust fixes...');
            try {
                let fixedCleaned = rawCleaned;
                // Simple trailing comma removal: replace , followed by whitespace and } or ]
                fixedCleaned = fixedCleaned.replace(/,\s*([}\]])/g, '$1');
                parsed = JSON.parse(fixedCleaned);
            } catch (e2) {
                console.warn('[RECOMMENDATION] Robust JSON syntax fixes failed, falling back to delimiter-based parser.');
            }
        }

        // Delimiter-based parsing fallback
        if (!parsed || !parsed.overallSummary) {
            console.log('[RECOMMENDATION] Standard/fixed parsing failed or missing overallSummary. Utilizing delimiter-based parser...');
            try {
                const delimiterParsed = {};
                const schemaFields = ['keyStrengths', 'weaknesses', 'areasToImprove', 'communication', 'overallSummary'];
                
                // Helper to escape regex special characters
                const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

                for (const field of schemaFields) {
                    // Try to find the field key (case-insensitive, optional quotes/smart quotes)
                    const keyRegex = new RegExp(`["'“‘]?${escapeRegExp(field)}["'”’]?\\s*:\\s*`, 'i');
                    const keyMatch = rawCleaned.match(keyRegex);
                    if (!keyMatch) {
                        delimiterParsed[field] = field === 'communication' || field === 'overallSummary' ? '' : [];
                        continue;
                    }

                    const startIndex = keyMatch.index + keyMatch[0].length;
                    
                    // Find where this value ends. It ends when we encounter another field's key,
                    // or the end of the JSON object (closing brace `}`).
                    let endIndex = rawCleaned.length;
                    for (const otherField of schemaFields) {
                        if (otherField === field) continue;
                        const otherKeyRegex = new RegExp(`["'“‘]?${escapeRegExp(otherField)}["'”’]?\\s*:\\s*`, 'i');
                        const otherKeyMatch = rawCleaned.substring(startIndex).match(otherKeyRegex);
                        if (otherKeyMatch) {
                            const foundIndex = startIndex + otherKeyMatch.index;
                            if (foundIndex < endIndex) {
                                endIndex = foundIndex;
                            }
                        }
                    }

                    // Also limit by the closing brace `}` at the end of the JSON if no other field is found
                    const closingBraceIdx = rawCleaned.lastIndexOf('}');
                    if (closingBraceIdx !== -1 && closingBraceIdx > startIndex && closingBraceIdx < endIndex) {
                        endIndex = closingBraceIdx;
                    }

                    let rawValue = rawCleaned.substring(startIndex, endIndex).trim();

                    if (field === 'keyStrengths' || field === 'weaknesses' || field === 'areasToImprove') {
                        // Extract array elements
                        // Remove leading '[' and trailing ']' if present
                        rawValue = rawValue.replace(/^\s*\[/, '').replace(/\]\s*,?\s*$/, '').trim();
                        
                        // Split by newlines or commas
                        const lines = rawValue.split(/\n|,/);
                        const items = [];
                        for (const line of lines) {
                            const trimmed = line.trim();
                            if (!trimmed) continue;
                            
                            // Strip leading/trailing quotes, smart quotes, and brackets
                            let cleanedItem = trimmed
                                .replace(/^[\["'“‘\s]+/, '')
                                .replace(/[\]"'”’,\s\n\r;]+$/, '')
                                .trim();
                            
                            // Unescape quotes and slashes
                            cleanedItem = cleanedItem.replace(/\\"/g, '"').replace(/\\'/g, "'").replace(/\\\\/g, '\\');
                            if (cleanedItem) {
                                items.push(cleanedItem);
                            }
                        }
                        delimiterParsed[field] = items;
                    } else {
                        // Extract string elements
                        // Remove leading quote if present
                        let cleanedStr = rawValue.trim();
                        cleanedStr = cleanedStr.replace(/^["'“‘\s]+/, '').replace(/["'”’,\s\n\r;]+$/, '').trim();
                        
                        // Unescape quotes, newlines, and slashes
                        cleanedStr = cleanedStr
                            .replace(/\\"/g, '"')
                            .replace(/\\'/g, "'")
                            .replace(/\\n/g, '\n')
                            .replace(/\\\\/g, '\\');
                        
                        delimiterParsed[field] = cleanedStr;
                    }
                }

                if (delimiterParsed.overallSummary) {
                    parsed = delimiterParsed;
                    console.log('[RECOMMENDATION] Successfully parsed AI response via delimiter-based fallback!');
                }
            } catch (err) {
                console.error('[RECOMMENDATION] Delimiter-based fallback parser also failed:', err);
            }
        }

        if (!parsed || !parsed.overallSummary) {
            console.error('[RECOMMENDATION] AI output could not be parsed as valid JSON:', rawResponse);
            return res.status(500).json({ message: 'AI returned invalid formatted summary.', rawResponse });
        }

        // Validate and clean up arrays
        const cleanArray = (arr) => Array.isArray(arr) ? arr.map(s => String(s).trim()).filter(Boolean) : [];
        const summaryObj = {
            keyStrengths: cleanArray(parsed.keyStrengths),
            weaknesses: cleanArray(parsed.weaknesses),
            areasToImprove: cleanArray(parsed.areasToImprove),
            communication: String(parsed.communication || '').trim(),
            overallSummary: String(parsed.overallSummary || '').trim(),
            calculatedAt: new Date()
        };

        // 7. Save to application
        application.recommendationSummary = summaryObj;
        await application.save();

        console.log(`[RECOMMENDATION] Successfully generated and stored recommendation summary for application: ${applicationId}`);
        return res.json(summaryObj);

    } catch (error) {
        console.error('[RECOMMENDATION] Error generating recommendation:', error);
        return res.status(500).json({ message: 'Failed to generate recommendation', error: error.message });
    }
};

module.exports = { getRecommendationSummary };
