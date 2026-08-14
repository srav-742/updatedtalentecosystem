const express = require("express");
const router = express.Router();
const {
    startSession,
    respondToAgent,
    getEvaluation,
    getAvailableRoles,
    terminateSession
} = require("../controllers/agentController");

// temporarily remove protect middleware to test
router.get("/roles", getAvailableRoles);
router.post("/start", startSession);
router.post("/respond", respondToAgent);
router.post("/evaluate", getEvaluation);
router.post("/terminate", terminateSession);

module.exports = router;