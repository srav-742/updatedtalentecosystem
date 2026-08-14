import express from 'express';
import multer from 'multer';
import resumeController from '../controllers/resume.controller.js';
import trustedContextMiddleware from '../middlewares/trustedContext.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// All Resume routes require trusted context forwarded by the Gateway
router.use(trustedContextMiddleware);

// Upload Endpoints
// We support both /upload and the root POST endpoint (with /upload being the gateway route with 20MB limit)
router.post('/api/v1/resumes/upload', upload.single('file'), resumeController.upload);
router.post('/api/v1/resumes', upload.single('file'), resumeController.upload);

// Retrieve Resume Containers
router.get('/api/v1/resumes', resumeController.getOwnResume);
router.get('/api/v1/resumes/candidate/:candidateId', resumeController.getByCandidateId);
router.get('/api/v1/resumes/:id', resumeController.getById);

// Versioning and File Access
router.get('/api/v1/resumes/:id/versions', resumeController.listVersions);
router.get('/api/v1/resumes/:id/download', resumeController.download);
router.get('/api/v1/resumes/:id/preview', resumeController.preview);

// Deletion
router.delete('/api/v1/resumes/:id', resumeController.delete);

export default router;
