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
            interviewId,
            overallRating,
            recommendationScore,
            ratings,
            likedMost,
            improvements,
            issuesFaced
        } = req.body;

        if (!userId || !interviewId || !overallRating) {
            return res.status(400).json({
                success: false,
                message: 'userId, interviewId, and overallRating are required.'
            });
        }

        const sentiment = detectSentiment(overallRating);
        const safeRatings = sanitizeRatings(ratings);

        // Upsert: update if already submitted (one feedback per interview)
        const feedback = await InterviewFeedback.findOneAndUpdate(
            { userId, interviewId },
            {
                userId,
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
        console.error('[INTERVIEW-FEEDBACK] Error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to save feedback.'
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
