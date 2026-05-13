const Application = require('../models/Application');
const ResumeProfile = require('../models/ResumeProfile');
const ResumeAnalysis = require('../models/ResumeAnalysis');
const AssessmentSubmission = require('../models/AssessmentSubmission');
const User = require('../models/User');
const Job = require('../models/Job');
const mongoose = require('mongoose');

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

        // 1. Fetch the application (populated with job)
        const application = await Application.findById(applicationId).lean();
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
        const assessment = await AssessmentSubmission.findOne({ applicationId }).lean()
            || await AssessmentSubmission.findOne({ userId, jobId }).lean();

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
                score: assessment.score || 0,
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
            interview: {
                score: application.interviewScore || null,
                totalQuestions: application.interviewAnswers?.length || 0,
                completedAt: application.updatedAt || null,
                questions: (application.interviewAnswers || []).map((q, idx) => ({
                    questionNumber: q.questionNumber || idx + 1,
                    question: q.question || '',
                    answer: q.answer || '',
                    score: q.score || 0,
                    marks: q.marks || 0,
                    feedback: q.feedback || '',
                    isAttempted: !!(q.answer && q.answer.trim()),
                })),
            },
            scores: {
                resumeMatch: application.resumeMatchPercent || null,
                assessmentScore: application.assessmentScore || null,
                interviewScore: application.interviewScore || null,
                finalScore: application.finalScore || null,
                ownershipScore: application.metrics?.ownershipMindset || null,
                teamFitScore: application.teamFit?.score || null,
            },
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

        const applications = await Application.find({ jobId })
            .select('_id applicantName applicantEmail applicantPic resumeMatchPercent assessmentScore interviewScore finalScore status appliedAt metrics teamFit interviewAnswers recordingStatus')
            .lean();

        const candidates = applications.map(app => ({
            applicationId: app._id,
            name: app.applicantName || 'Unknown',
            email: app.applicantEmail || '',
            profilePic: app.applicantPic || null,
            resumeScore: app.resumeMatchPercent || null,
            assessmentScore: app.assessmentScore || null,
            interviewScore: app.interviewScore || null,
            finalScore: app.finalScore || null,
            status: app.status,
            appliedAt: app.appliedAt,
            hasAssessment: app.assessmentScore !== null && app.assessmentScore !== undefined,
            hasInterview: (app.interviewAnswers?.length || 0) > 0,
            ownershipScore: app.metrics?.ownershipMindset || null,
            teamFitScore: app.teamFit?.score || null,
        }));

        return res.json({ jobId, total: candidates.length, candidates });

    } catch (error) {
        console.error('[TRANSCRIPT] Error fetching job candidates:', error);
        return res.status(500).json({ message: 'Failed to fetch candidates', error: error.message });
    }
};

module.exports = { getTranscript, getJobCandidates };
