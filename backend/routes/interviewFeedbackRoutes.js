const express = require('express');
const router = express.Router();
const InterviewFeedback = require('../models/InterviewFeedback');

// POST /api/interview/feedback
// Submit post-interview feedback (one per userId+jobId)
router.post('/feedback', async (req, res) => {
    try {
        const { userId, jobId, interviewScore, experienceRating, difficultyLevel, aiRelevance, technicalIssues, comments } = req.body;

        if (!userId || !jobId) {
            return res.status(400).json({ message: 'userId and jobId are required.' });
        }

        if (experienceRating && (experienceRating < 1 || experienceRating > 5)) {
            return res.status(400).json({ message: 'experienceRating must be between 1 and 5.' });
        }

        const validDifficulty = ['Very Easy', 'Easy', 'Medium', 'Hard', 'Very Hard'];
        if (difficultyLevel && !validDifficulty.includes(difficultyLevel)) {
            return res.status(400).json({ message: 'Invalid difficultyLevel value.' });
        }

        // Upsert: update if already submitted (anti-spam)
        const feedback = await InterviewFeedback.findOneAndUpdate(
            { userId, jobId },
            { userId, jobId, interviewScore, experienceRating, difficultyLevel, aiRelevance, technicalIssues, comments, createdAt: new Date() },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        console.log(`[INTERVIEW-FEEDBACK] Saved feedback for user: ${userId}, job: ${jobId}`);
        res.json({ success: true, message: 'Feedback submitted. Thank you!', feedback });

    } catch (error) {
        console.error('[INTERVIEW-FEEDBACK] Error:', error.message);
        res.status(500).json({ success: false, message: 'Failed to save feedback.' });
    }
});

// GET /api/interview/feedback/check?userId=&jobId=
// Check if user already submitted feedback for this job
router.get('/feedback/check', async (req, res) => {
    try {
        const { userId, jobId } = req.query;
        if (!userId || !jobId) return res.status(400).json({ message: 'userId and jobId required.' });
        const exists = await InterviewFeedback.findOne({ userId, jobId });
        res.json({ alreadySubmitted: !!exists });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Check failed.' });
    }
});

module.exports = router;
