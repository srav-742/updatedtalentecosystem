/**
 * Aggregates candidate and job data into a rich text context for the AI.
 */
const buildContext = (candidate, job = null) => {
    const skills = candidate.skills ? candidate.skills.join(", ") : "Not yet analyzed";
    const jobSkills = job && job.skills ? job.skills.join(", ") : "General requirement";
    
    // Calculate missing skills if possible
    let missingSkills = "Analyze resume first";
    if (job && job.skills && candidate.skills) {
        const diff = job.skills.filter(s => !candidate.skills.includes(s));
        missingSkills = diff.length > 0 ? diff.join(", ") : "None";
    }

    const inactiveMs = Date.now() - new Date(candidate.lastActiveAt || Date.now()).getTime();
    const inactiveHours = Math.floor(inactiveMs / (1000 * 60 * 60));

    return `
========================================
REAL-TIME DATABASE CONTEXT
========================================
Candidate Name: ${candidate.name}
Applied Role: ${job ? job.title : candidate.appliedJob}
Required Skills: ${jobSkills}
Candidate Skills: ${skills}
Experience: ${candidate.experience || "Not specified"}
Missing Skills: ${missingSkills}
Resume Score: ${candidate.resumeScore || "N/A"}
Assessment Score: ${candidate.assessmentScore || "Pending"}
Last Active: ${inactiveHours} hours ago
Job Description: ${job ? job.description : "Standard AI Engineer role"}
========================================
`;
};

module.exports = buildContext;
