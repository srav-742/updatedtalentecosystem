const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

router.get('/users', userController.getAllUsers);
router.get('/profile/:userId', userController.getUserProfile);
router.get('/user/:userId/coins', userController.getUserCoins);
router.put('/profile/:userId', userController.updateUserProfile);
router.post('/users/add-coins', userController.addCoinsManual);
router.get('/sample-seekers', userController.getSampleSeekers);

module.exports = router;
