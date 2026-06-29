import express from 'express';
import jobController from '../controllers/job.controller.js';
import trustedContextMiddleware from '../middlewares/trustedContext.js';

const router = express.Router();

// All Job routes require trusted context forwarded by the Gateway
router.use(trustedContextMiddleware);

router.post('/create', jobController.create);
router.get('/', jobController.list);
router.get('/:id', jobController.getById);
router.put('/:id', jobController.update);
router.delete('/:id', jobController.delete);
router.post('/:id/publish', jobController.publish);
router.post('/:id/archive', jobController.archive);

export default router;
