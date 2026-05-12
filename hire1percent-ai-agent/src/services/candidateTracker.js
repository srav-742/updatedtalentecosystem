const getCandidateStatus = (candidate) => {
    if (!candidate) return "Unknown State";

    // 1. INITIAL SIGNUP / LOGGED IN ONLY
    if (!candidate.resumeAnalyzed && !candidate.assessmentCompleted && !candidate.interviewCompleted) {
        return "Just logged in";
    }

    // 2. RESUME ANALYSIS PENDING
    if (!candidate.resumeAnalyzed) {
        return "Resume analysis pending";
    }

    // 3. SHORTLISTED / ASSESSMENT PENDING
    if (candidate.resumeAnalyzed && !candidate.assessmentCompleted) {
        return "Profile shortlisted - Assessment pending";
    }

    // 4. ASSESSMENT DONE - INTERVIEW PENDING
    if (candidate.assessmentCompleted && !candidate.interviewCompleted) {
        return "Assessment passed - Interview pending";
    }

    // 5. COMPLETED
    if (candidate.interviewCompleted) {
        return "Hiring process completed";
    }

    return "Processing screening";
};

module.exports = getCandidateStatus;