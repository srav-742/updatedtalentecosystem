# 🤖 Hire1Percent AI Recruitment Agent - Documentation

## 🌟 Overview
The Hire1Percent AI Agent is an autonomous, conversational recruiter named **Alex**. It is designed to identify top 1% talent by guiding candidates through a multi-stage hiring pipeline (Resume Analysis, Skill Assessment, and AI Interview) via natural voice and text communication.

---

## 🏗️ System Architecture

### 1. Frontend (The Interface)
- **Automatic Conversation Loop**: A web-based dashboard (`test-voice.html`) that uses the browser's **Web Speech API** for real-time Text-to-Speech (TTS).
- **Auto-Listening**: Automatically triggers the microphone once the agent finishes speaking, enabling a hands-free, human-like dialogue.
- **Visual Feedback**: Includes a voice visualizer and status indicators (Listening, Thinking, Speaking).

### 2. Backend (The Orchestrator)
- **Node.js & Express**: High-performance server hosting the recruitment logic.
- **Session Management**: Tracks candidate identity and conversation state in real-time.
- **Candidate Tracker**: Analyzes MongoDB records to determine the exact hiring stage (e.g., "Resume Pending", "Assessment Completed").

### 3. AI Engine (The Brain)
- **Gemini Pro (Multi-modal)**: Used for high-fidelity Speech-to-Text (STT) and intelligent decision making.
- **Production-Level Prompting**: A massive 800+ word system instruction that defines Alex's recruiter persona, company knowledge, and strict communication rules.
- **Persistent Memory**: Uses an in-memory data store (`conversations.js`) to remember previous turns, ensuring a continuous dialogue instead of one-off replies.

### 4. Database (The Memory)
- **MongoDB**: Stores all candidate records, application stages, and timestamps.
- **Dynamic Lookup**: The agent can search the entire database to recognize any candidate by name.

---

## 🚀 Core Features

### 🔹 Dynamic Identity Detection
Candidates can introduce themselves naturally (e.g., *"I am Shankar"* or just *"Sravya"*). The agent instantly retrieves their specific job role and progress from the database.

### 🔹 Proactive Recruitment Guidance
Alex doesn't just answer questions; he **leads** the candidate. 
- *"I see your resume is pending. Shall I guide you to the upload section?"*
- *"You've passed the test! Ready to start your AI interview?"*

### 🔹 Multi-Turn Conversation
Thanks to the `history` tracking, the agent understands follow-up questions:
- **User**: "What is my status?"
- **Alex**: "You need to take the assessment. Want to start?"
- **User**: "Yes, please."
- **Alex**: "Great! Initiating the test now..."

### 🔹 Intelligent Fallback (Quota-Safe)
If the Gemini API reaches its daily limit, Alex switches to a **Proactive Fallback Brain**. This ensures the agent remains helpful, professional, and stage-aware even without active AI generation.

---

## 🛠️ Setup & Usage

### 1. Prerequisites
- Node.js installed.
- MongoDB connection string in `.env`.
- Gemini API Key in `.env`.

### 2. Seeding Data
Run the seeding script to populate the database with test candidates:
```bash
node seed.js
```

### 3. Running the Server
```bash
node src/server.js
```

### 4. Testing the Agent
Open the following URL in your browser:
**[http://localhost:5005/test-voice.html](http://localhost:5005/test-voice.html)**

---

## 🗣️ How to Interact with Alex
1. Click **"Start Conversation"**.
2. **Introduce Yourself**: Say or type your name (e.g., *"I am Sravya"*).
3. **Ask for Status**: Once identified, ask *"Where am I in the process?"*.
4. **Ask for Guidance**: Ask *"What should I do next?"* or *"Why do I need to attend the interview?"*.

---

## 🛡️ Security & Reliability
- **Base64 Audio Handling**: Supports large audio payloads (up to 50MB).
- **Session Isolation**: Each candidate has a unique, isolated conversation history.
- **Error Logging**: Detailed console logs for monitoring STT, AI Generation, and Database lookups.

---

**Developed for the Hire1Percent Talent Ecosystem.**
