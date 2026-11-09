const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authMiddleware, roleCheck } = require('../middleware/authMiddleware');

router.get('/users', authMiddleware, roleCheck('admin'), userController.getAllUsers);
router.get('/admin/analytics', authMiddleware, roleCheck('admin'), userController.getAnalyticsData);
router.get('/profile/:userId', authMiddleware, userController.getUserProfile);
router.put('/profile/:userId', authMiddleware, userController.updateUserProfile);
router.post('/profile/:userId', authMiddleware, userController.updateUserProfile);
router.get('/sample-candidates', authMiddleware, roleCheck('recruiter'), userController.getSampleSeekers);
router.get('/sample-seekers', authMiddleware, roleCheck('recruiter'), userController.getSampleSeekers);

router.post('/admin/users', authMiddleware, roleCheck('admin'), userController.addUser);
router.delete('/admin/users/:userId', authMiddleware, roleCheck('admin'), userController.deleteUser);

module.exports = router;
