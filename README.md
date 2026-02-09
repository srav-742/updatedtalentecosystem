# TalentEcoSystem - AI-Powered Recruitment Reimagined

Welcome to **TalentEcoSystem** (branded as **hire1percent**), a state-of-the-art recruitment platform designed to bridge the gap between top-tier talent and forward-thinking recruiters. By leveraging cutting-edge AI, we've automated the most tedious parts of hiring while ensuring a premium, bias-free experience for everyone.

---

## 🚀 Overview

TalentEcoSystem is a full-stack platform that transforms the traditional job application process into an interactive, AI-driven journey. From the moment a seeker uploads their resume to the final AI-conducted voice interview, every step is optimized for precision and engagement.

### Key Pillars:
- **AI-First**: Deep integration with OpenAI (Grok/GPT) and Google Gemini for intelligent analysis.
- **Voice Interaction**: Real-time, voice-based AI interviews using Whisper & Web Speech API.
- **Dynamic Assessments**: On-the-fly generation of technical MCQs and coding challenges tailored to the job role.
- **Integrity First**: Built-in webcam proctoring with face-detection technology.

---

## 🏗️ Architecture

The project follows a modern **MERN** (MongoDB, Express, React, Node.js) architecture, enhanced with specialized AI services and a modular backend.

- **Frontend**: React (Vite), Tailwind CSS, Framer Motion (Animations), Face-API.js.
- **Backend**: Node.js, Express, MongoDB (Mongoose), Multer (File Handling).
- **AI Services**: OpenAI API (Whisper, GPT-4), Grok API, Google Generative AI (Gemini).
- **Security**: Firebase Authentication & JWT.

---

## ✨ Core Features & Step-by-Step Flow

### 1. Unified Authentication
- **Dual Roles**: Separate onboarding flows for **Job Seekers** and **Recruiters**.
- **Secure Access**: Powered by Firebase and custom JWT middleware for robust session management.

### 2. The Recruiter Experience
- **Smart Job Posting**: Recruiters can post jobs with detailed descriptions, required skills, and difficulty levels.
- **Applicant Ledger**: A centralized dashboard to view all applicants, sorted by AI-generated scores (Resume Match, Assessment Score, Interview Performance).
- **Analytics**: High-level overview of hiring health and candidate pipelines.

### 3. The Job Seeker Journey (Application Flow)
Once a seeker finds a job, they enter a multi-stage **Intelligence Pipeline**:

#### **Step A: Smart Resume Analysis** 📄
- **Parsing**: The platform extracts text from PDF resumes using `pdf-parse`.
- **Matching**: AI compares the resume against the Job Description to calculate a **Match Percentage** and identify skill gaps.

#### **Step B: Dynamic Skill Assessment** 🧠
- **No More Static Tests**: The system generates 10 MCQs and 3 Coding Challenges on-the-fly based on the job's required skills.
- **Proctoring**: The webcam is activated, using `face-api.js` to ensure the candidate remains focused and present.

#### **Step C: AI Voice Interview** 🎙️
- **Voice-First Interaction**: Candidates engage in a real-time conversation.
- **Technologies**: 
  - **Speech-to-Text**: Whisper API / Web Speech API for near-instant transcription.
  - **Logic**: AI generates follow-up questions dynamically based on previous answers.
  - **Evaluation**: The AI audits the interview for technical accuracy, communication skills, and mindset.

---

## 📂 Project Structure

```text
updatetalentecosystem/
├── frontend/               # React (Vite) Application
│   ├── src/
│   │   ├── components/     # Reusable UI (Buttons, Nav, Layouts)
│   │   ├── pages/
│   │   │   ├── seeker/     # Seeker dashboard and workflow
│   │   │   ├── recruiter/  # Recruiter tools and applicant management
│   │   │   └── LandingPage # High-conversion entry page
│   │   └── firebase.js     # Auth configuration
├── backend/                # Node.js Express Server
│   ├── models/             # Mongoose Schemas (Jobs, Users, Applications)
│   ├── routes/             # API Endpoints (Auth, Job, Assessment, AI)
│   ├── controllers/        # Business Logic
│   ├── services/           # AI Logic (Gemini/Grok/Whisper wrappers)
│   ├── uploads/            # Temporary storage for resumes/audio
│   └── server.js           # Entry Point
└── package.json            # Workspace configuration
```

---

## 🛠️ Setup & Installation

Follow these steps to get the ecosystem running locally:

### 1. Prerequisites
- Node.js (v18+)
- MongoDB (Local or Atlas)
- API Keys: OpenAI, Google GenAI (Gemini), Grok.

### 2. Backend Setup
```bash
cd backend
npm install
# Create a .env file with:
# PORT=5000
# MONGO_URI=your_mongodb_uri
# GEMINI_API_KEY=your_key
# GROK_API_KEY=your_key
# OPENAI_API_KEY=your_key
npm run dev
```

### 3. Frontend Setup
```bash
cd frontend
npm install
# Create a .env file with:
# VITE_API_URL=http://localhost:5000/api
# VITE_FIREBASE_CONFIG=...
npm run dev
```

---

## 🛡️ Smart Proctoring & Reliability

- **Face Detection**: Uses `face-api.js` to detect multiple faces or absence of the candidate.
- **Fault Tolerance**: The backend includes fallback mechanisms for AI generation—if an AI service is down, the system provides curated static assessments to ensure zero downtime.

---

## 🔮 Future Roadmap
- **Collaborative Hiring**: Multi-recruiter voting on candidates.
- **Coding Playground**: Advanced sandbox for real-time code execution.
- **Salary Benchmarking**: AI-driven compensation recommendations.

---

**Developed with ❤️ for the future of work.**
