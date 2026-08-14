const { GoogleGenerativeAI } = require("@google/generative-ai");
const User = require("../models/User");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const modelName = "gemini-flash-latest";

// Matching agentController.js config for consistency
const getJsonConfig = () => ({
  temperature: 0.2, // Lower temp for more consistent JSON extraction
  responseMimeType: "application/json",
});

const cleanJson = (str) => {
    let cleaned = str.trim();
    if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/, '').trim();
    }
    return cleaned;
};

const searchCandidates = async (req, res) => {
    try {
        const { query } = req.body;
        if (!query) return res.status(400).json({ error: "Query is required" });

        const model = genAI.getGenerativeModel({ model: modelName });

        const prompt = `
            You are a technical recruiting assistant. Convert the following natural language query into a MONGO DB FILTER OBJECT for a "User" collection.
            The User schema has these relevant fields:
            - name: String
            - skills: [String] (Array of skills)
            - designation: String
            - bio: String
            - experience: [{ company: String, role: String, duration: String, description: String }]

            QUERY: "${query}"

            RULES:
            1. Return ONLY a valid JSON object matching this structure:
            {
               "filter": { ... your mongodb filter ... },
               "reasoning": "short explanation"
            }
            2. For skills, designations, and names, ALWAYS use case-insensitive regex for fuzzy matching. 
            3. For the "experience" array, search inside "experience.role", "experience.company", and "experience.description" using regex.
               Example: { "experience.description": { "$regex": "React", "$options": "i" } }
            4. Use $or to search across name, designation, bio, and experience if the query is a general role.
            5. Role MUST be exactly "candidate".

            Example output for "React developer":
            {
                "filter": {
                    "role": "candidate",
                    "$or": [
                        { "skills": { "$elemMatch": { "$regex": "React", "$options": "i" } } },
                        { "designation": { "$regex": "React", "$options": "i" } },
                        { "bio": { "$regex": "React", "$options": "i" } }
                    ]
                },
                "reasoning": "Searching for React in skills, designation, and bio with case-insensitivity."
            }
        `;

        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: getJsonConfig()
        });

        const jsonText = cleanJson(result.response.text());
        let interpreted;
        
        try {
            interpreted = JSON.parse(jsonText);
        } catch (e) {
            console.error("[AI-SEARCH] JSON Parse Failure. Raw text:", jsonText);
            // Safe fallback using broad regex
            interpreted = {
                filter: {
                    role: "candidate",
                    $or: [
                        { name: { $regex: query, $options: "i" } },
                        { bio: { $regex: query, $options: "i" } },
                        { designation: { $regex: query, $options: "i" } },
                        { skills: { $regex: query, $options: "i" } },
                        { "experience.role": { $regex: query, $options: "i" } },
                        { "experience.description": { $regex: query, $options: "i" } }
                    ]
                },
                reasoning: "Fallback search due to parsing error."
            };
        }

        // Ensure we only search candidates
        const finalFilter = interpreted.filter || interpreted;
        finalFilter.role = "candidate";

        console.log("[AI-SEARCH] Executing Filter:", JSON.stringify(finalFilter));

        // Use unified aggregation lookup pipeline to join User and ResumeProfile
        const candidates = await User.aggregate([
            { $match: { role: "candidate" } },
            {
                $lookup: {
                    from: "resumeprofiles",
                    localField: "uid",
                    foreignField: "userId",
                    as: "resumeDoc"
                }
            },
            {
                $unwind: {
                    path: "$resumeDoc",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $project: {
                    uid: "$uid",
                    name: { $ifNull: [ "$name", "$resumeDoc.basics.name" ] },
                    email: { $ifNull: [ "$email", "$resumeDoc.basics.email" ] },
                    profilePic: "$profilePic",
                    githubUrl: "$githubUrl",
                    linkedinUrl: "$linkedinUrl",
                    role: "$role",
                    skills: {
                        $setUnion: [
                            { $ifNull: [ "$skills", [] ] },
                            { $ifNull: [ "$resumeDoc.skills.programming", [] ] },
                            { $ifNull: [ "$resumeDoc.skills.frameworks", [] ] },
                            { $ifNull: [ "$resumeDoc.skills.databases", [] ] },
                            { $ifNull: [ "$resumeDoc.skills.tools", [] ] },
                            { $ifNull: [ "$resumeDoc.skills.soft", [] ] }
                        ]
                    },
                    bio: { $ifNull: [ "$bio", "$resumeDoc.summary", "" ] },
                    designation: {
                        $cond: {
                            if: {
                                $and: [
                                    { $eq: [ { $type: "$designation" }, "string" ] },
                                    { $ne: [ "$designation", "" ] }
                                ]
                            },
                            then: "$designation",
                            else: {
                                $ifNull: [
                                    {
                                        $let: {
                                            vars: {
                                                firstExp: { $arrayElemAt: [ { $ifNull: [ "$resumeDoc.workExperience", [] ] }, 0 ] }
                                            },
                                            in: "$$firstExp.position"
                                        }
                                    },
                                    "$resumeDoc.basics.location",
                                    ""
                                ]
                            }
                        }
                    },
                    experience: {
                        $cond: {
                            if: { $gt: [ { $size: { $ifNull: [ "$experience", [] ] } }, 0 ] },
                            then: "$experience",
                            else: {
                                $map: {
                                    input: { $ifNull: [ "$resumeDoc.workExperience", [] ] },
                                    as: "exp",
                                    in: {
                                        company: "$$exp.company",
                                        role: "$$exp.position",
                                        duration: { $concat: [ "$$exp.startYear", " - ", { $ifNull: [ "$$exp.endYear", "Present" ] } ] },
                                        description: "$$exp.description"
                                    }
                                }
                            }
                        }
                    }
                }
            },
            { $match: finalFilter },
            { $limit: 10 }
        ]);

        res.json({
            candidates,
            analysis: interpreted
        });

    } catch (err) {
        console.error("[AI-SEARCH] Fatal Error:", err);
        res.status(500).json({ error: "Search failed", detail: err.message });
    }
};

module.exports = { searchCandidates };
