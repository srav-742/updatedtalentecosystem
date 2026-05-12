const express = require("express");
const router = express.Router();
const Candidate = require("../models/Candidate");
const getCandidateStatus = require("../services/candidateTracker");
const generateFollowupMessage = require("../services/aiAnalyzer");
const processVoiceCommand = require("../services/sttService");
const Groq = require("groq-sdk");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const sessions = {};

// Diagnostic Route
router.get("/test-agent", async (req, res) => {
    try {
        const candidate = await Candidate.findOne();
        if (!candidate) return res.status(404).json({ message: "No candidate found" });
        const aiMessage = await generateFollowupMessage(candidate, "status");
        res.json({ success: true, candidate: candidate.name, status: getCandidateStatus(candidate), aiMessage });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post("/voice-command", async (req, res) => {
    try {
        const { audio, text, sessionId } = req.body;
        if (!audio && !text) return res.status(400).json({ error: "No audio or text provided" });

        const sid = sessionId || "default_session";
        if (!sessions[sid]) sessions[sid] = { identifiedCandidate: null };
        const session = sessions[sid];

        let transcription = "";
        if (text) {
            transcription = text;
        } else {
            transcription = await processVoiceCommand(audio, session);
        }
        
        console.log(`[Session: ${sid}] Input:`, transcription);

        // 1. DYNAMIC IDENTITY DETECTION
        if (!session.identifiedCandidate) {
            // Trim and clean transcription
            const cleanText = transcription.trim().replace(/[.,?]/g, "");
            
            // Fast Regex Check
            const nameMatch = cleanText.match(/(?:i am|this is|my name is|i'm|name is)\s+([a-zA-Z\s]+)/i);
            let potentialName = nameMatch ? nameMatch[1].trim() : (cleanText.split(' ').length <= 2 ? cleanText : null);

            // AI Extraction Fallback
            if (!potentialName || potentialName.toLowerCase().startsWith("i am") || potentialName.length < 2) {
                const extraction = await groq.chat.completions.create({
                    messages: [
                        { role: "system", content: "Extract only the person's name from the user text. If no name is mentioned, respond ONLY with 'NONE'." },
                        { role: "user", content: transcription }
                    ],
                    model: "llama-3.1-8b-instant",
                });
                const aiName = extraction.choices[0].message.content.trim().replace(/[.,]/g, "");
                if (aiName !== "NONE") potentialName = aiName;
            }

            if (potentialName) {
                // Better Matching: Try exact match first, then partial
                let foundCandidate = await Candidate.findOne({ 
                    name: new RegExp(`^${potentialName}$`, 'i') 
                });

                if (!foundCandidate) {
                    foundCandidate = await Candidate.findOne({ 
                        name: new RegExp(potentialName.split(' ').pop(), 'i') // Try last name / single name
                    });
                }

                // AI-Powered Fuzzy Matching for spelling variations (e.g., Shravya vs Sravya)
                if (!foundCandidate) {
                    const allCandidates = await Candidate.find({}, 'name');
                    if (allCandidates.length > 0) {
                        const candidateNames = allCandidates.map(c => c.name).join(", ");
                        const matchResult = await groq.chat.completions.create({
                            messages: [
                                { role: "system", content: `You are a strict data matcher. Your task is to check if the spoken name "${potentialName}" matches any name in this exact list: [${candidateNames}]. Minor phonetic spelling differences are allowed (e.g., "Shravya" = "Sravya"). However, if the spoken name is completely different from all names in the list (e.g., "Abhir Mishra" is not in the list), you MUST respond ONLY with the word "NONE". Do not make wild guesses.` }
                            ],
                            model: "llama-3.1-8b-instant"
                        });
                        const matchedName = matchResult.choices[0].message.content.trim();
                        if (matchedName !== "NONE" && matchedName !== '"NONE"') {
                            foundCandidate = await Candidate.findOne({ name: matchedName });
                        }
                    }
                }

                if (foundCandidate) {
                    session.identifiedCandidate = foundCandidate;
                    console.log(`[Session: ${sid}] Identified: ${foundCandidate.name}`);
                    const response = await generateFollowupMessage(foundCandidate, "Hello");
                    return res.json({ success: true, transcription, response, candidate: foundCandidate.name });
                } else {
                    // Name provided but not found in DB
                    const notFoundResponse = await groq.chat.completions.create({
                        messages: [
                            { role: "system", content: `You are Alex, a Senior Executive Talent Scout for Hire1Percent. The user provided the name "${potentialName}", but this name is NOT in our database. Inform them politely that you cannot find their profile under that name, and ask if they might have applied under a different name or email. Keep it strictly formal and under 30 words.` }
                        ],
                        model: "llama-3.1-8b-instant",
                    });
                    return res.json({ 
                        success: true, 
                        transcription, 
                        response: notFoundResponse.choices[0].message.content,
                        candidate: "Unknown" 
                    });
                }
            }

            // Persona-based fallback for unidentified
            const anonResponse = await groq.chat.completions.create({
                messages: [
                    { role: "system", content: "You are Alex, a Senior Executive Talent Scout for Hire1Percent. A candidate has approached you but you haven't identified them yet. Professionally and politely ask for their full name to locate their profile. Do not use casual greetings like 'Good morning' or 'Hi there'. Keep it strictly formal and direct. Max 30 words." }
                ],
                model: "llama-3.1-8b-instant",
            });
            
            return res.json({ 
                success: true, 
                transcription, 
                response: anonResponse.choices[0].message.content,
                candidate: "Unknown" 
            });
        }

        // 2. CONVERSATIONAL AGENT
        const responseMessage = await generateFollowupMessage(session.identifiedCandidate, transcription);

        res.json({
            success: true,
            transcription,
            response: responseMessage,
            candidate: session.identifiedCandidate.name
        });
    } catch (error) {
        console.error("Route Error:", error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;