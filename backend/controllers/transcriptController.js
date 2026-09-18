const Application = require('../models/Application');
const ResumeProfile = require('../models/ResumeProfile');
const ResumeAnalysis = require('../models/ResumeAnalysis');
const AssessmentSubmission = require('../models/AssessmentSubmission');
const User = require('../models/User');
const Job = require('../models/Job');
const CodingQuestion = require('../models/CodingQuestion');
const CodingRound = require('../models/CodingRound');
const mongoose = require('mongoose');
const ProctoringViolation = require('../models/ProctoringViolation');
const ProctoringViolationEnhanced = require('../models/ProctoringViolationEnhanced');
const { getViolationRating } = require('../utils/proctoringScoring');
const ProctoringReport = require('../models/ProctoringReport');
const { updateProctoringReport } = require('./proctoringControllerEnhanced');
const { sanitizeTranscript } = require('../utils/transcriptSanitizer');

const sanitizeViolationDetail = (type, detail, rating) => {
    if (!detail) return '';
    let cleanDetail = detail
        .replace(/\s*\(ratio:\s*[^)]+\)/gi, '')
        .replace(/\s*\(confidence:\s*[^)]+\)/gi, '');
    
    if (!cleanDetail.endsWith('.')) {
        cleanDetail += '.';
    }
    
    if (!cleanDetail.includes('(Ranking:')) {
        cleanDetail += ` (Ranking: ${rating})`;
    }
    return cleanDetail;
};

const calculateCandidateScores = (app, assessmentSubmission) => {
    let dynInterview = app.interviewScore || 0;
    const answers = app.interviewAnswers || [];

    if (answers.length > 0) {
        const validMarks = answers.filter(q => typeof q.marks === 'number' && !isNaN(q.marks));
        if (validMarks.length > 0) {
            const totalMarks = validMarks.reduce((s, q) => s + q.marks, 0);
            const maxPossible = answers.length * 10;
            if (maxPossible > 0) {
                dynInterview = Math.round((totalMarks / maxPossible) * 70);
            }
        } else {
            const validScores = answers.filter(q => typeof q.score === 'number' && !isNaN(q.score));
            if (validScores.length > 0) {
                const avgScore = validScores.reduce((s, q) => s + q.score, 0) / validScores.length;
                dynInterview = Math.round((avgScore > 1 ? avgScore / 100 : avgScore) * 70);
            }
        }
    }

    const dynResume = app.resumeMatchPercent || 0;
    
    let dynAssessment = app.assessmentScore || 0;
    if (assessmentSubmission && assessmentSubmission.totalQuestions > 0) {
        dynAssessment = Math.round((assessmentSubmission.correctAnswers / assessmentSubmission.totalQuestions) * 20);
    }

    const dynCoding = app.codingScore || 0;

    // Final Score strictly derived from present rounds (Resume + MCQ + Interview = 100 max)
    const computedFinalScore = dynResume + dynAssessment + dynInterview;

    return {
        resumeScore: dynResume,
        assessmentScore: dynAssessment,
        interviewScore: dynInterview,
        codingScore: dynCoding,
        finalScore: computedFinalScore
    };
};

/**
 * GET /api/transcripts/:applicationId
 * Returns a fully aggregated candidate evaluation transcript for admin view.
 */
const getTranscript = async (req, res) => {
    try {
        const { applicationId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(applicationId)) {
            return res.status(400).json({ message: 'Invalid application ID' });
        }

        // 1. Fetch the application (populated with job and coding question details)
        const application = await Application.findById(applicationId)
            .populate('codingAnswers.questionId')
            .lean();
        if (!application) {
            return res.status(404).json({ message: 'Application not found' });
        }

        const userId = application.userId;
        const jobId = application.jobId;

        // 2. Fetch the job
        const job = await Job.findById(jobId).lean();

        // 3. Fetch the candidate user profile
        const user = await User.findOne({ uid: userId }).lean();

        // 4. Fetch resume profile
        const resumeProfile = await ResumeProfile.findOne({ userId }).lean();

        // 5. Fetch resume analysis (job-specific)
        const resumeAnalysis = await ResumeAnalysis.findOne({ userId, jobId }).lean();

        // 6. Fetch skill assessment submission
        const assessment = (application.assessmentSubmissionId 
            ? await AssessmentSubmission.findById(application.assessmentSubmissionId).lean() 
            : null)
            || await AssessmentSubmission.findOne({ applicationId }).lean()
            || await AssessmentSubmission.findOne({ userId, jobId }).sort({ submittedAt: -1 }).lean();

        // 6.5 Query Proctoring Violations
        const jobIdStr = jobId?.toString();
        const sessionIdStr = application.recordingSessionId;

        const queryConditions = [];
        if (userId && jobIdStr) {
            queryConditions.push({ 
                userId, 
                examId: { $regex: new RegExp(jobIdStr) } 
            });
        }
        if (userId && sessionIdStr) {
            queryConditions.push({ 
                userId, 
                examId: { $regex: new RegExp(sessionIdStr) } 
            });
        }

        let baseViolations = [];
        let enhancedViolations = [];

        if (queryConditions.length > 0) {
            const query = { $or: queryConditions };
            
            const allBase = await ProctoringViolation.find(query).sort({ timestamp: 1 }).lean();
            const allEnhanced = await ProctoringViolationEnhanced.find(query).sort({ timestamp: 1 }).lean();

            baseViolations = allBase.filter(v => {
                if (sessionIdStr && v.examId.includes(sessionIdStr)) return true;
                if (jobIdStr && v.examId.includes(jobIdStr)) return true;
                return false;
            });

            enhancedViolations = allEnhanced.filter(v => {
                if (sessionIdStr && v.examId.includes(sessionIdStr)) return true;
                if (jobIdStr && v.examId.includes(jobIdStr)) return true;
                return false;
            });
        }

        const hasInterview = Boolean(
            (application.interviewAnswers && application.interviewAnswers.length > 0) ||
            application.recordingSessionId ||
            application.recordingUrl ||
            application.recordingPlaybackUrl ||
            (typeof application.interviewScore === 'number' && application.interviewScore > 0)
        );

        let mappedViolations = [];
        let proctoringFlags = [];
        let totalIntegrityPenalty = 0;
        let proctoringScore = 0;

        if (hasInterview) {
            mappedViolations = [
                ...baseViolations.map(v => {
                    const rating = v.rating || getViolationRating(v.type, v.metadata);
                    return {
                        id: v._id,
                        type: v.type,
                        detail: sanitizeViolationDetail(v.type, v.detail, rating),
                        count: v.count,
                        severity: 'medium',
                        rating,
                        isAnswering: false,
                        timestamp: v.timestamp || v.createdAt
                    };
                }),
                ...enhancedViolations.map(v => {
                    const rating = v.rating || getViolationRating(v.type, v.metadata);
                    return {
                        id: v._id,
                        type: v.type,
                        detail: sanitizeViolationDetail(v.type, v.detail, rating),
                        count: v.count,
                        severity: v.severity || 'medium',
                        rating,
                        isAnswering: v.isAnswering || false,
                        timestamp: v.timestamp || v.createdAt
                    };
                })
            ];

            // Fallback: if session-specific query yielded no violations but user has violations in DB
            if (mappedViolations.length === 0 && userId) {
                const userBase = await ProctoringViolation.find({ userId }).sort({ timestamp: 1 }).lean();
                const userEnhanced = await ProctoringViolationEnhanced.find({ userId }).sort({ timestamp: 1 }).lean();
                
                if (userBase.length > 0 || userEnhanced.length > 0) {
                    const fallbackViolations = [
                        ...userBase.map(v => ({
                            id: v._id,
                            type: v.type,
                            detail: sanitizeViolationDetail(v.type, v.detail, v.rating || getViolationRating(v.type, v.metadata)),
                            count: v.count,
                            severity: 'medium',
                            rating: v.rating || getViolationRating(v.type, v.metadata),
                            isAnswering: false,
                            timestamp: v.timestamp || v.createdAt
                        })),
                        ...userEnhanced.map(v => ({
                            id: v._id,
                            type: v.type,
                            detail: sanitizeViolationDetail(v.type, v.detail, v.rating || getViolationRating(v.type, v.metadata)),
                            count: v.count,
                            severity: v.severity || 'medium',
                            rating: v.rating || getViolationRating(v.type, v.metadata),
                            isAnswering: v.isAnswering || false,
                            timestamp: v.timestamp || v.createdAt
                        }))
                    ];
                    mappedViolations.push(...fallbackViolations);
                }
            }

            mappedViolations.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

            proctoringFlags = Array.from(new Set(mappedViolations.map(v => v.type)));
            totalIntegrityPenalty = (application.integrityPenalty !== undefined && application.integrityPenalty !== null && application.integrityPenalty > 0)
                ? application.integrityPenalty
                : mappedViolations.reduce((sum, v) => sum + (v.rating || 0), 0);
            proctoringScore = (application.proctoringScore !== undefined && application.proctoringScore !== null)
                ? application.proctoringScore
                : Math.max(0, 100 - Math.round(totalIntegrityPenalty * 2.5));
        } else {
            // Candidate has NOT attended the interview: strictly 0 score, 0 penalty, no flags
            mappedViolations = [];
            proctoringFlags = [];
            totalIntegrityPenalty = 0;
            proctoringScore = 0;
        }

        // ── Query Proctoring Report ──
        const examIdStr = sessionIdStr && jobIdStr ? `interview:${jobIdStr}:${sessionIdStr}` : '';
        let proctoringReport = null;
        if (examIdStr) {
            proctoringReport = await ProctoringReport.findOne({ examId: examIdStr }).lean();
            if (!proctoringReport && (baseViolations.length > 0 || enhancedViolations.length > 0)) {
                // Compile on-the-fly if violations exist but report doesn't
                try {
                    proctoringReport = await updateProctoringReport(examIdStr, userId);
                } catch (reportErr) {
                    console.warn('[TRANSCRIPT-REPORT-ON-THE-FLY] Generation failed:', reportErr);
                }
            }
        }

        // Unified score calculation
        const scoreData = calculateCandidateScores(application, assessment);

        // Auto-heal DB if stored scores were out-of-sync
        if (application.finalScore !== scoreData.finalScore || application.interviewScore !== scoreData.interviewScore) {
            Application.updateOne(
                { _id: application._id },
                { $set: { finalScore: scoreData.finalScore, interviewScore: scoreData.interviewScore } }
            ).catch(err => console.error('[TRANSCRIPT-AUTO-HEAL] Error updating DB:', err));
        }

        // 6.8 Build Coding Assessment Data if present (strictly for coding/Python jobs)
        const isJobCoding = Boolean(
            job?.codingAssessment?.enabled === true || 
            (job?.title && /python/i.test(job.title) && job?.codingAssessment?.enabled !== false)
        );
        let codingData = null;
        if (isJobCoding && application.codingAnswers && application.codingAnswers.length > 0) {
            const answers = application.codingAnswers.map((a, idx) => {
                const qDoc = (a.questionId && typeof a.questionId === 'object' && a.questionId.title) ? a.questionId : {};
                const maxMarks = a.maximumMarks !== undefined && a.maximumMarks !== null ? a.maximumMarks : (qDoc.marks || 10);
                const obtMarks = a.obtainedMarks !== undefined && a.obtainedMarks !== null ? a.obtainedMarks : (a.score !== undefined ? a.score : 0);

                return {
                    questionId: a.questionId?._id || a.questionId,
                    questionTitle: a.questionTitle || qDoc.title || `Problem ${idx + 1}`,
                    questionDescription: a.questionDescription || qDoc.description || '',
                    difficulty: a.difficulty || qDoc.difficulty || 'MEDIUM',
                    difficultyWeight: a.difficultyWeight || 1,
                    maximumMarks: maxMarks,
                    obtainedMarks: obtMarks,
                    testCasesPassed: a.testCasesPassed !== undefined ? a.testCasesPassed : null,
                    totalTestCases: a.totalTestCases || 10,
                    constraints: a.constraints || qDoc.constraints || '',
                    correctAnswer: a.correctAnswer || qDoc.expectedApproach || '',
                    expectedApproach: a.expectedApproach || qDoc.expectedApproach || '',
                    code: a.code || '',
                    language: a.language || 'Python',
                    score: obtMarks,
                    feedback: a.feedback || '',
                    suggestedCode: a.suggestedCode || '',
                    aiEvaluationStatus: a.aiEvaluationStatus || 'success',
                    correctnessVerdict: a.correctnessVerdict || 'Evaluated'
                };
            });

            const passingScore = job?.codingAssessment?.passingScore || 60;
            const codingScore = application.codingScore !== undefined && application.codingScore !== null ? application.codingScore : (scoreData.codingScore || 0);

            codingData = {
                score: codingScore,
                passingScore,
                isPassed: codingScore >= passingScore,
                codingDetails: application.codingDetails || {
                    totalQuestions: answers.length,
                    totalMaximumMarks: 100,
                    totalObtainedMarks: codingScore,
                    finalPercentage: codingScore
                },
                answers
            };
        }

        // 7. Build the unified transcript
        const transcript = {
            generatedAt: new Date().toISOString(),
            candidate: {
                name: application.applicantName || user?.name || 'Unknown',
                email: application.applicantEmail || user?.email || '',
                phone: resumeProfile?.basics?.phone || '',
                location: resumeProfile?.basics?.location || '',
                profilePic: application.applicantPic || user?.profilePic || null,
                linkedinUrl: user?.linkedinUrl || null,
                githubUrl: user?.githubUrl || null,
                resumeUrl: user?.resumeUrl || null,
            },
            job: {
                title: job?.title || 'Unknown Role',
                company: job?.company || '',
                location: job?.location || '',
                type: job?.type || '',
                description: job?.description || '',
                skills: job?.skills || [],
                experienceLevel: job?.experienceLevel || '',
            },
            application: {
                id: application._id,
                status: application.status,
                appliedAt: application.appliedAt,
                resultsVisibleAt: application.resultsVisibleAt,
                videoIntroUrl: application.videoIntroUrl || null,
                recordingUrl: application.recordingPlaybackUrl || application.recordingUrl || null,
                assessmentRecordingUrl: application.assessmentRecordingPlaybackUrl || application.assessmentRecordingUrl || null,
                integrityPenalty: totalIntegrityPenalty,
                proctoringScore: proctoringScore,
                proctoringFlags: proctoringFlags,
            },
            resume: {
                profile: resumeProfile ? {
                    summary: resumeProfile.summary || '',
                    education: resumeProfile.education || [],
                    workExperience: resumeProfile.workExperience || [],
                    projects: resumeProfile.projects || [],
                    skills: resumeProfile.skills || {},
                    languages: resumeProfile.languages || [],
                    publications: resumeProfile.publications || [],
                    professionalProfiles: resumeProfile.professionalProfiles || [],
                    experienceYears: resumeProfile.experienceYears || 0,
                } : null,
                analysis: resumeAnalysis ? {
                    matchPercentage: resumeAnalysis.matchPercentage || 0,
                    skillsScore: resumeAnalysis.skillsScore || 0,
                    experienceScore: resumeAnalysis.experienceScore || 0,
                    skillsFeedback: resumeAnalysis.skillsFeedback || '',
                    experienceFeedback: resumeAnalysis.experienceFeedback || '',
                    explanation: resumeAnalysis.explanation || '',
                } : null,
            },
            assessment: assessment ? {
                score: scoreData.assessmentScore,
                totalQuestions: assessment.totalQuestions || 0,
                correctAnswers: assessment.correctAnswers || 0,
                submittedAt: assessment.submittedAt,
                answers: (assessment.answers || []).map(a => ({
                    question: a.question,
                    skill: a.skill || '',
                    questionType: a.questionType,
                    userAnswer: a.userAnswer,
                    correctAnswer: a.correctAnswer,
                    isCorrect: a.isCorrect,
                    score: a.score || 0,
                })),
            } : null,
            coding: codingData,
            interview: {
                hasInterview,
                score: scoreData.interviewScore,
                totalQuestions: application.interviewAnswers?.length || 0,
                completedAt: hasInterview ? (application.updatedAt || null) : null,
                questions: (application.interviewAnswers || []).map((q, idx) => ({
                    questionNumber: q.questionNumber || idx + 1,
                    question: q.question || '',
                    answer: sanitizeTranscript(q.answer || ''),
                    score: q.score || 0,
                    marks: q.marks || 0,
                    feedback: q.feedback || '',
                    isAttempted: !!(q.answer && q.answer.trim()),
                })),
                proctoringViolations: mappedViolations,
                proctoringReport: hasInterview ? (proctoringReport || null) : null,
                proctoringFlags: proctoringFlags,
            },
            scores: {
                resumeMatch: scoreData.resumeScore,
                assessmentScore: scoreData.assessmentScore,
                codingScore: isJobCoding ? (application.codingScore !== undefined && application.codingScore !== null ? application.codingScore : scoreData.codingScore) : null,
                interviewScore: scoreData.interviewScore,
                finalScore: scoreData.finalScore,
                ownershipScore: application.metrics?.ownershipMindset || null,
                teamFitScore: application.teamFit?.score || null,
                proctoringScore: proctoringScore,
                integrityPenalty: totalIntegrityPenalty,
            },
            hasInterview,
            proctoringFlags: proctoringFlags,
            proctoringScore: proctoringScore,
            integrityPenalty: totalIntegrityPenalty,
        };

        return res.json(transcript);

    } catch (error) {
        console.error('[TRANSCRIPT] Error generating transcript:', error);
        return res.status(500).json({ message: 'Failed to generate transcript', error: error.message });
    }
};

/**
 * GET /api/transcripts/job/:jobId
 * Returns a list of all candidates for a specific job (for admin transcript panel).
 */
const getJobCandidates = async (req, res) => {
    try {
        const { jobId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(jobId)) {
            return res.status(400).json({ message: 'Invalid job ID' });
        }

        const [job, applications] = await Promise.all([
            Job.findById(jobId).lean(),
            Application.find({ jobId })
                .select('_id userId applicantName applicantEmail applicantPic resumeMatchPercent assessmentScore codingScore interviewScore finalScore status appliedAt metrics teamFit interviewAnswers recordingStatus integrityPenalty proctoringScore codingAnswers')
                .lean()
        ]);

        const isJobCoding = Boolean(
            job?.codingAssessment?.enabled === true || 
            (job?.title && /python/i.test(job.title) && job?.codingAssessment?.enabled !== false)
        );

        const userIdList = applications.map(app => app.userId).filter(Boolean);
        const jobIdStr = jobId.toString();

        const query = {
            $or: [
                { examId: { $regex: new RegExp(`^(interview|assessment):${jobIdStr}:`) } },
                { userId: { $in: userIdList } }
            ]
        };

        const [baseViolations, enhancedViolations] = await Promise.all([
            ProctoringViolation.find(query).lean(),
            ProctoringViolationEnhanced.find(query).lean()
        ]);

        const userPenaltyMap = {};
        const userFlagsMap = {};
        const addRating = (userId, examId, type, metadata, ratingFromDb) => {
            if (!userId) return;
            const rating = ratingFromDb !== undefined ? ratingFromDb : getViolationRating(type, metadata);
            
            let jobId = null;
            if (examId && typeof examId === 'string') {
                const parts = examId.split(':');
                if (parts.length >= 2) {
                    jobId = parts[1];
                }
            }
            const key = jobId ? `${userId}_${jobId}` : userId;
            userPenaltyMap[key] = (userPenaltyMap[key] || 0) + rating;
            if (!userFlagsMap[key]) userFlagsMap[key] = new Set();
            userFlagsMap[key].add(type);
            if (!userFlagsMap[userId]) userFlagsMap[userId] = new Set();
            userFlagsMap[userId].add(type);
        };

        baseViolations.forEach(v => {
            if (v.type === 'MULTIPLE_DEVICES' && (/camera/i.test(v.detail) || v.metadata?.cameraCount)) {
                return;
            }
            addRating(v.userId, v.examId, v.type, v.metadata, v.rating);
        });

        enhancedViolations.forEach(v => {
            if (v.type === 'MULTIPLE_DEVICES' && (/camera/i.test(v.detail) || v.metadata?.cameraCount)) {
                return;
            }
            addRating(v.userId, v.examId, v.type, v.metadata, v.rating);
        });

        const candidates = applications.map(app => {
            const hasInterview = Boolean(
                (app.interviewAnswers && app.interviewAnswers.length > 0) ||
                app.recordingSessionId ||
                app.recordingUrl ||
                app.recordingPlaybackUrl ||
                (typeof app.interviewScore === 'number' && app.interviewScore > 0)
            );

            let rawPenalty = 0;
            let proctoringScore = 0;
            let proctoringFlags = [];

            if (hasInterview) {
                const key = jobIdStr ? `${app.userId}_${jobIdStr}` : app.userId;
                rawPenalty = (app.integrityPenalty !== undefined && app.integrityPenalty !== null && app.integrityPenalty > 0)
                    ? app.integrityPenalty 
                    : (userPenaltyMap[key] || userPenaltyMap[app.userId] || 0);
                proctoringScore = (app.proctoringScore !== undefined && app.proctoringScore !== null)
                    ? app.proctoringScore
                    : Math.max(0, 100 - Math.round(rawPenalty * 2.5));
                const flags = userFlagsMap[key] || userFlagsMap[app.userId];
                proctoringFlags = flags ? Array.from(flags) : [];
            } else {
                rawPenalty = 0;
                proctoringScore = 0;
                proctoringFlags = [];
            }

            // Compute live accurate scores using unified score calculator
            const scoreData = calculateCandidateScores(app, null);

            // Auto-heal DB document if out-of-sync
            if (app.finalScore !== scoreData.finalScore || app.interviewScore !== scoreData.interviewScore) {
                Application.updateOne(
                    { _id: app._id },
                    { $set: { finalScore: scoreData.finalScore, interviewScore: scoreData.interviewScore } }
                ).catch(err => console.error('[TRANSCRIPT-AUTO-HEAL-LIST] Error updating DB:', err));
            }
            const hasCoding = isJobCoding && Boolean(
                (app.codingAnswers && app.codingAnswers.length > 0) || 
                (app.codingScore !== null && app.codingScore !== undefined && app.codingScore > 0)
            );
            return {
                applicationId: app._id,
                name: app.applicantName || 'Unknown',
                email: app.applicantEmail || '',
                profilePic: app.applicantPic || null,
                resumeScore: scoreData.resumeScore,
                assessmentScore: scoreData.assessmentScore,
                codingScore: isJobCoding ? (app.codingScore !== undefined && app.codingScore !== null ? app.codingScore : scoreData.codingScore) : null,
                interviewScore: scoreData.interviewScore,
                finalScore: scoreData.finalScore,
                proctoringScore,
                integrityPenalty: rawPenalty,
                proctoringFlags,
                status: app.status,
                appliedAt: app.appliedAt,
                hasAssessment: app.assessmentScore !== null && app.assessmentScore !== undefined,
                hasCoding,
                hasInterview,
                ownershipScore: app.metrics?.ownershipMindset || null,
                teamFitScore: app.teamFit?.score || null,
            };
        });

        return res.json({ jobId, total: candidates.length, candidates });

    } catch (error) {
        console.error('[TRANSCRIPT] Error fetching job candidates:', error);
        return res.status(500).json({ message: 'Failed to fetch candidates', error: error.message });
    }
};

module.exports = { getTranscript, getJobCandidates };
