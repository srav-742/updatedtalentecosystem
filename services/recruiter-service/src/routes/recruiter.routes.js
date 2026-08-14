import express from 'express';
import recruiterController from '../controllers/recruiter.controller.js';
import organizationController from '../controllers/organization.controller.js';
import trustedContextMiddleware from '../middlewares/trustedContext.js';

const router = express.Router();

// All Recruiter/Organization routes require trusted context forwarded by the Gateway
router.use(trustedContextMiddleware);

// Profile & Dashboard Routes
router.get('/api/v1/recruiters/profile', recruiterController.getOwnProfile);
router.get('/api/v1/recruiters/profile/:userId', recruiterController.getProfileByUserId);
router.put('/api/v1/recruiters/profile', recruiterController.updateOwnProfile);
router.get('/api/v1/recruiters/dashboard', recruiterController.getDashboard);

// Organization Routes
router.get('/api/v1/organizations', organizationController.getOwnOrganization);
router.post('/api/v1/organizations', organizationController.createOrganization);
router.put('/api/v1/organizations', organizationController.updateOrganization);

// Organization Team Routes
router.get('/api/v1/organizations/team', organizationController.getTeam);
router.post('/api/v1/organizations/team/invite', organizationController.inviteTeamMember);
router.post('/api/v1/organizations/team/invite/accept', organizationController.acceptInvitation);
router.delete('/api/v1/organizations/team/:id', organizationController.removeTeamMember);

// Subscription Routes
router.get('/api/v1/subscription', organizationController.getSubscription);
router.put('/api/v1/subscription', organizationController.updateSubscription);

// Branding Routes
router.get('/api/v1/branding', organizationController.getBranding);
router.put('/api/v1/branding', organizationController.updateBranding);

export default router;
