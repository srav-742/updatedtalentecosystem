const express = require('express');
const router = express.Router();
const communityController = require('../controllers/communityController');

router.get('/community', communityController.getCommunity);
router.post('/community', communityController.updateCommunity);

module.exports = router;
