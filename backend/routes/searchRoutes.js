const express = require('express');
const router = express.Router();

const {
  globalSearch,
  jobSearch,
  candidateSearch,
  recruiterSearch,
  organizationSearch,
  resumeSearch,
  indexJobs,
  indexCandidates,
  deleteIndex,
} = require('../controllers/searchController');

// Search endpoints
router.get('/search', globalSearch);
router.get('/search/jobs', jobSearch);
router.get('/search/candidates', candidateSearch);
router.get('/search/recruiters', recruiterSearch);
router.get('/search/organizations', organizationSearch);
router.get('/search/resumes', resumeSearch);

// Indexing endpoints (POST)
router.post('/index/jobs', indexJobs);
router.post('/index/candidates', indexCandidates);
// Generic delete endpoint
router.delete('/index/:type/:id', deleteIndex);

module.exports = router;
