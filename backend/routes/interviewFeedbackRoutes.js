const express = require('express');
const router = express.Router();
const InterviewFeedback = require('../models/InterviewFeedback');

// Helper function to detect sentiment
function detectSentiment(overallRating) {
    if (overallRating >= 4) return "positive";
    if (overallRating === 3) return "neutral";
    return "negative";
}

function sanitizeRatings(ratings) {
    if (!ratings || typeof ratings !== 'object') return {};
    return Object.fromEntries(
        Object.entries(ratings).filter(([, value]) => value !== null && value !== undefined && Number(value) > 0)
    );
}

// POST /api/interview/feedback
// Submit post-interview feedback
router.post('/feedback', async (req, res) => {
    try {
        const {
            userId,
            jobId,
            interviewId,
            overallRating,
            recommendationScore,
            ratings,
            likedMost,
            improvements,
            issuesFaced
        } = req.body;

        if (!userId || !jobId || !interviewId || !overallRating) {
            return res.status(400).json({
                success: false,
                message: 'userId, jobId, interviewId, and overallRating are required.'
            });
        }

        const sentiment = detectSentiment(overallRating);
        const safeRatings = sanitizeRatings(ratings);

        // Upsert: update if already submitted (one feedback per interview)
        const feedback = await InterviewFeedback.findOneAndUpdate(
            { userId, jobId, interviewId },
            {
                userId,
                jobId,
                interviewId,
                overallRating,
                recommendationScore,
                ratings: safeRatings,
                likedMost,
                improvements,
                issuesFaced,
                sentiment,
                submittedAt: new Date()
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        res.json({
            success: true,
            message: 'Feedback submitted successfully. Thank you!',
            feedback
        });

    } catch (error) {
        console.error(' [INTERNAL-FEEDBACK-ERROR] Critical Failure during feedback save:');
        console.error('  - Error Message:', error.message);
        console.error('  - Error Stack:', error.stack);
        console.error('  - Request Body:', JSON.stringify(req.body, null, 2));

        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: 'Validation failed.',
                details: error.errors
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to save feedback.',
            error: error.message
        });
    }
});

// GET /api/interview/feedback/check?userId=&interviewId=
// Check if user already submitted feedback for this interview
router.get('/feedback/check', async (req, res) => {
    try {
        const { userId, interviewId } = req.query;
        if (!userId || !interviewId) {
            return res.status(400).json({ message: 'userId and interviewId required.' });
        }
        const exists = await InterviewFeedback.findOne({ userId, interviewId });
        res.json({ alreadySubmitted: !!exists });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Check failed.' });
    }
});

module.exports = router;
