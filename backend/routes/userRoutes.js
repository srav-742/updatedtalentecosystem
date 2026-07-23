const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

router.get('/users', userController.getAllUsers);
router.get('/admin/analytics', userController.getAnalyticsData);
router.get('/profile/:userId', userController.getUserProfile);
router.put('/profile/:userId', userController.updateUserProfile);
router.get('/sample-candidates', userController.getSampleSeekers);

router.post('/admin/users', userController.addUser);
router.delete('/admin/users/:userId', userController.deleteUser);

module.exports = router;
