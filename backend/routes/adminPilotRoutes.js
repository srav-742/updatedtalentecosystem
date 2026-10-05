const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');
const adminPilotController = require('../controllers/adminPilotController');

const ADMIN_EMAILS = ['sravyaadmin@gmail.com', 'sravyadhadi@gmail.com', 'admin@hire1percent.com', 'hemangi@web3today.io'];

/**
 * Strict Admin Check Middleware.
 * Unlike generic roleCheck, this strictly prevents recruiters or candidates from ever
 * accessing admin pilot account creation, even if client headers are present.
 */
const requireAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized: Authentication required."
        });
    }

    const isAdminRole = req.user.role === 'admin';
    const isAdminEmail = req.user.email && ADMIN_EMAILS.includes(req.user.email.toLowerCase().trim());

    if (isAdminRole || isAdminEmail) {
        return next();
    }

    return res.status(403).json({
        success: false,
        message: "Forbidden: Only authorized administrators can access pilot account management."
    });
};

// Admin Pilot Accounts Routes
router.post('/admin/pilot-accounts', authMiddleware, requireAdmin, adminPilotController.createPilotAccount);
router.get('/admin/pilot-accounts', authMiddleware, requireAdmin, adminPilotController.getPilotAccounts);
router.delete('/admin/pilot-accounts/:userId', authMiddleware, requireAdmin, adminPilotController.deletePilotAccount);

module.exports = router;
