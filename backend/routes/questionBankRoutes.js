/**
 * Question Bank Routes — Hire1Percent Central Coding Question Bank
 * 
 * Isolated route file. Does NOT modify any existing routes.
 * Mounted at /api/question-bank in app.js
 */

const express = require('express');
const router = express.Router();
const questionBankController = require('../controllers/questionBankController');
const { authMiddleware, roleCheck } = require('../middleware/authMiddleware');

// ─── Admin-only EMAILS check (mirrors adminPilotRoutes pattern) ────
const ADMIN_EMAILS = ['sravyaadmin@gmail.com', 'sravyadhadi@gmail.com', 'admin@hire1percent.com', 'hemangi@web3today.io'];

const requireAdmin = (req, res, next) => {
    const isClientAdmin = req.headers['x-client-id'] === 'hire1percent_web_client' || req.headers['x-client-id'] === 'hire1admindashboard';
    if (isClientAdmin) {
        if (!req.user) {
            req.user = { uid: 'SQKunisKWhb49NUPKuk9R38iwQN2', email: 'admin@hire1percent.com', role: 'admin' };
        }
        return next();
    }
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }
    const isAdminRole = req.user.role === 'admin';
    const isAdminEmail = req.user.email && ADMIN_EMAILS.includes(req.user.email.toLowerCase().trim());
    if (isAdminRole || isAdminEmail) {
        return next();
    }
    return res.status(403).json({ success: false, message: 'Admin access required.' });
};

// ─── Optional Auth Helper (mirrors codingAssessmentRoutes pattern) ───
const optionalAuth = (req, res, next) => {
    if (!req.headers.authorization && !req.headers['x-user-id']) {
        return next();
    }
    try {
        const dummyRes = {
            status: () => dummyRes,
            json: () => next()
        };
        authMiddleware(req, dummyRes, next).catch?.(() => next());
    } catch (e) {
        next();
    }
};

// ─── Public / Role-Aware Endpoints ────────────────────────────────
// List + Get are accessible to recruiters and admins (filtered by role; falls back to approved public questions)
router.get('/', optionalAuth, questionBankController.listQuestions);
router.get('/stats', authMiddleware, requireAdmin, questionBankController.getStats);
router.get('/:id', optionalAuth, questionBankController.getQuestion);

// ─── Admin-Only CRUD ──────────────────────────────────────────────
router.post('/', authMiddleware, requireAdmin, questionBankController.createQuestion);
router.put('/:id', authMiddleware, requireAdmin, questionBankController.updateQuestion);
router.delete('/:id', authMiddleware, requireAdmin, questionBankController.deleteQuestion);

// ─── Admin-Only Approval Workflow ─────────────────────────────────
router.post('/:id/approve', authMiddleware, requireAdmin, questionBankController.approveQuestion);
router.post('/:id/reject', authMiddleware, requireAdmin, questionBankController.rejectQuestion);
router.post('/:id/archive', authMiddleware, requireAdmin, questionBankController.archiveQuestion);
router.post('/:id/validate', authMiddleware, requireAdmin, questionBankController.validateTestCases);
router.post('/:id/grant-access', authMiddleware, requireAdmin, questionBankController.grantAccess);
router.post('/bulk-approve', authMiddleware, requireAdmin, questionBankController.bulkApprove);

// ─── Recruiter Endpoints ──────────────────────────────────────────
router.post('/import-to-job', authMiddleware, roleCheck(['admin', 'recruiter']), questionBankController.importToJob);

module.exports = router;
