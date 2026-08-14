const express = require('express');
const router = express.Router();
const { searchCandidates } = require('../controllers/aiSearchController');

router.post('/candidates', searchCandidates);

module.exports = router;
