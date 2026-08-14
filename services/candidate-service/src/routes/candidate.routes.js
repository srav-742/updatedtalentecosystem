import express from 'express';
import candidateController from '../controllers/candidate.controller.js';
import trustedContextMiddleware from '../middlewares/trustedContext.js';

const router = express.Router();

// All Candidate routes require trusted context forwarded by the Gateway
router.use(trustedContextMiddleware);

router.get('/profile', candidateController.getOwnProfile);
router.get('/profile/:userId', candidateController.getProfileByUserId);
router.put('/profile', candidateController.updateOwnProfile);
router.delete('/profile', candidateController.deleteOwnProfile);
router.get('/dashboard', candidateController.getDashboard);
router.post('/bookmarks/:jobId', candidateController.addBookmark);
router.delete('/bookmarks/:jobId', candidateController.removeBookmark);
router.get('/bookmarks', candidateController.getBookmarks);

export default router;
