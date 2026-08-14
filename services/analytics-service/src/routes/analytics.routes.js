import { Router } from 'express';
import { charts, dashboard, exportReport, metrics, recordEvent, reports } from '../controllers/analytics.controller.js';

const router = Router();

router.post('/events', recordEvent);
router.get('/dashboard', dashboard);
router.get('/reports', reports);
router.get('/metrics', metrics);
router.get('/charts', charts);
router.get('/export', exportReport);

export default router;
