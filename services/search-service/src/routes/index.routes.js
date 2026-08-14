import { Router } from 'express';
import { deleteDocument, indexDocument } from '../controllers/index.controller.js';

const router = Router();

router.post('/jobs', indexDocument('jobs'));
router.post('/candidates', indexDocument('candidates'));
router.post('/recruiters', indexDocument('recruiters'));
router.post('/organizations', indexDocument('organizations'));
router.post('/resumes', indexDocument('resumes'));
router.delete('/:type/:id', deleteDocument);

export default router;
