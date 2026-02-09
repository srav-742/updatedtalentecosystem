# Technical Documentation: TalentEcoSystem (hire1percent)

This document provides a deep dive into the technical implementation of the TalentEcoSystem, explaining the logic and flow behind its core modules.

---

## 1. Resume Analysis Engine 📝
The Resume Analysis module is the first gate in the seeker's journey. It uses a combination of document parsing and LLM-based scoring.

**The Process:**
1.  **Extraction**: The backend uses `pdf-parse` to convert raw PDF data into a clean text string.
2.  **Comparison**: The extracted text, along with the Job Description (JD), is sent to the AI Service (Gemini/Grok).
3.  **Prompting**: A specialized system prompt instructs the AI to:
    - Extract skills (Technical & Soft).
    - Compare experience levels.
    - Calculate a "Match Percentage".
    - Provide a "Gap Analysis" (what the candidate is missing).
4.  **Parsing**: The AI returns a JSON object which is then displayed to the user via a radar chart or progress bar.

---

## 2. Dynamic Assessment System ⚡
Unlike traditional platforms with fixed question banks, TalentEcoSystem generates assessments in real-time.

**The Logic:**
- **Trigger**: When a candidate clicks "Start Assessment", the frontend sends the job's required skills and difficulty to `/api/generate-questions`.
- **Generation**: The backend calls the `GenerativeAIService`. It requests:
    - 10 Multiple Choice Questions (MCQs) with correct answers and explanations.
    - 3 Coding challenges with test cases.
- **Validation**: If the AI returns malformed JSON, the backend has a `try-catch` retry mechanism and a secondary fallback to a static "Template Bank" to ensure the candidate's flow isn't interrupted.

---

## 3. The Elite AI Interview System 🎙️
This is the flagship feature of the platform. It simulates a high-pressure, technical voice interview.

**Step-by-Step Flow:**
1.  **Initiation**: The system generates a "Starter Question" based on the job role.
2.  **Voice Interaction**:
    - **Frontend**: Uses the `Web Speech API` for real-time transcription (Speech-to-Text).
    - **Visuals**: A typewriter effect shows the AI's question as it "speaks" using browser Text-to-Speech.
3.  **Dynamic Follow-up**:
    - Every answer from the candidate is sent to the backend.
    - The AI analyzes the answer and generates the *next* question based on what the candidate just said. This prevents generic, scripted interviews.
4.  **Final Evaluation (The Audit)**:
    - Once the interview ends (usually after 5-7 questions), the entire transcript is audited.
    - **Metrics**: Technical Accuracy (40%), Communication (20%), Ownership Mindset (15%), Thinking Latency (15%), and Resilience (10%).
    - **Final Score**: Calculated as a weighted average and saved to the Application Ledger.

---

## 4. Smart Proctoring (Integrity Module) 👁️
To ensure fairness, the platform implements client-side proctoring.

**Implementation:**
- **Tool**: `face-api.js` running in the browser.
- **Monitoring**: 
    - **Face Count**: Alerts if 0 or >1 faces are detected.
    - **Focus Tracking**: (Optional) detecting if the user looks away from the screen for too long.
- **Enforcement**: Violations are flagged in the database and visible to the recruiter.

---

## 5. Recruiter Dashboard & Decision Support 📊
The Recruiter Portal is designed to reduce "Time to Hire".

- **Candidate Scoring**: Instead of reading every resume, recruiters see a "Weighted Total Score" which combines:
  - Resume Match %
  - Assessment Score (Objective)
  - Interview Score (Subjective AI Analysis)
- **Direct Shortlisting**: Candidates scoring >85% are automatically moved to the "Shortlisted" category, triggering a notification to the recruiter.

---

## 6. API Reference (Core Endpoints)

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/register` | POST | User/Recruiter Onboarding |
| `/api/analyze-resume` | POST | Upload PDF and get AI analysis |
| `/api/generate-questions` | POST | Get dynamic MCQs/Coding tasks |
| `/api/interview/start` | POST | Initialize AI Interview session |
| `/api/interview/next` | POST | Process answer and get next question |
| `/api/applications` | GET | Fetch all applications (Recruiter view) |

---

## 🎯 Development Philosophy
This project was built with **Performance** and **Scalability** in mind. The modular folder structure allows for easy addition of new AI models (e.g., swapping Gemini for DeepSeek or Grok) without changing the core business logic.

**Developed by: TalentEcoSystem Team**
