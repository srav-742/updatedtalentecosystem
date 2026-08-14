import { Router } from 'express';
import { analytics, autocomplete, globalSearch, typedSearch } from '../controllers/search.controller.js';

const router = Router();

router.get('/', globalSearch);
router.get('/jobs', typedSearch('jobs'));
router.get('/candidates', typedSearch('candidates'));
router.get('/recruiters', typedSearch('recruiters'));
router.get('/organizations', typedSearch('organizations'));
router.get('/resumes', typedSearch('resumes'));
router.get('/autocomplete', autocomplete);
router.get('/analytics', analytics);

export default router;
