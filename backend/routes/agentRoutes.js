const express = require("express");
const router = express.Router();
const {
    startSession,
    respondToAgent,
    getEvaluation,
    getAvailableRoles,
    terminateSession
} = require("../controllers/agentController");

const { cacheMiddleware } = require("../middleware/cacheMiddleware");

// Caches roles in memory and sets browser cache headers
router.get("/roles", cacheMiddleware(86400, { httpMaxAge: 3600, staleWhileRevalidate: 86400 }), getAvailableRoles);
router.post("/start", startSession);
router.post("/respond", respondToAgent);
router.post("/evaluate", getEvaluation);
router.post("/terminate", terminateSession);

module.exports = router;