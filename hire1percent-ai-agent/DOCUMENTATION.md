# Hire1Percent AI Voice Recruiter - Documentation

## 1. Overview
Alex is an autonomous AI Recruitment Agent designed to guide candidates through the Hire1Percent hiring pipeline. Unlike a standard chatbot, Alex is **stage-aware**, meaning it understands exactly where a candidate is in the process (e.g., Resume Pending, Assessment Needed) and proactively provides guidance to move them to the next step.

---

## 2. Technical Architecture
The agent is built as an isolated service within the `hire1percent-ai-agent` directory.

- **Backend**: Node.js & Express
- **Database**: MongoDB (connecting to the main `talentecosystem` database)
- **AI Engine**: Gemini 1.5 Flash (Paid API)
- **STT (Speech-to-Text)**: Gemini 1.5 Flash (Processing audio/webm blobs)
- **TTS (Text-to-Speech)**: Web Speech API (Browser-based for testing)

---

## 3. Core Logic: Stage-Aware Guidance
The agent uses a tracking service (`candidateTracker.js`) to analyze the candidate's document in real-time.

### Hiring Stages Detected:
1.  **Just logged in**: Candidate has signed up but hasn't uploaded a resume.
2.  **Resume analysis pending**: Resume has not been analyzed by the system yet.
3.  **Profile shortlisted - Assessment pending**: Candidate passed resume screening but hasn't started the technical test.
4.  **Assessment passed - Interview pending**: Candidate passed the test and needs to attend the AI interview.
5.  **Hiring process completed**: All stages finished.

---

## 4. Conversation Flow
1.  **Audio Capture**: The frontend records 6 seconds of audio and sends it as a Base64 blob to `/api/voice-command`.
2.  **STT (Transcription)**: `sttService.js` sends the audio to Gemini 1.5 Flash to get a precise transcription.
3.  **Identification**:
    *   If no candidate is linked to the session, the agent extracts the name from the text using a regex + Gemini fallback.
    *   It then searches the MongoDB `candidates` collection for a matching name.
4.  **Analysis**: `aiAnalyzer.js` builds a dynamic prompt including:
    *   The candidate's current stage.
    *   The job description they applied for.
    *   Their specific skills and experience.
5.  **Response Generation**: Gemini generates a human-like, proactive response under 60 words.
6.  **Playback**: The frontend receives the text response and speaks it using the browser's voice synthesis.

---

## 5. System Prompt (The "Alex" Persona)
Alex's personality and logic are defined by the following system prompt in `aiAnalyzer.js`:

```text
You are Alex, the Elite Talent Scout for Hire1Percent. You are a high-level, human-like recruiter.

MISSION:
Your goal is to guide candidates through the hiring pipeline (Resume Analysis -> Skill Assessment -> AI Interview).
You must be PROACTIVE. If you know their stage, don't just wait for questions—give them advice and tell them what to do next.

CANDIDATE STAGE CONTEXT:
- CURRENT STAGE: ${stage}
- DATABASE DETAILS: ${dynamicContext}

GUIDANCE RULES BASED ON STAGE:
1. "Just logged in": Tell them their profile is spotted and encourage them to upload their resume to begin the "Top 1%" screening.
2. "Resume analysis pending": Explain that the resume is the key to unlocking the next level. Encourage upload.
3. "Profile shortlisted - Assessment pending": CONGRATULATE THEM! Tell them they've been shortlisted for the role. Push them to start the 15-minute technical assessment.
4. "Assessment passed - Interview pending": Tell them they've crushed the test! Now it's time for the AI Interview to finalize their selection.
5. "Hiring process completed": Be celebratory! Tell them they've finished the screening and to wait for the final human review.

CONVERSATION STYLE:
- Sophisticated, insightful, and direct.
- 40-60 words max.
- Address them as ${candidate.name}.
- End with a single, clear, encouraging question.
- Never sound robotic. No "How can I assist you?". Use "Let's move you forward," or "I've been looking at your progress."
```

---

## 6. Session Management
The agent supports **Isolated Sessions**. Each browser test generates a unique `sessionId` (e.g., `test_1723...`). This ensures:
- Multiple candidates can be tested simultaneously without data clashing.
- Conversation history is maintained per session.
- Identity is established once and remembered throughout the session.

---

## 7. How to Run & Test
1.  **Configure `.env`**:
    ```env
    PORT=5005
    MONGO_URI=your_mongodb_uri
    GEMINI_API_KEY=your_key
    ```
2.  **Start the Server**:
    `node src/server.js`
3.  **Open the Interface**:
    Open `test-voice.html` in a browser.
4.  **Simulation**:
    Run `node test_api.js` to see a text-based output of how Alex handles different candidates.
