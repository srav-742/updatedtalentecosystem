# TalentEcosystem - Project Documentation

## 1. Executive Summary
**TalentEcosystem** is a next-generation AI-powered recruitment platform designed to bridge the gap between talent and opportunity. Unlike traditional job boards, it actively participates in the vetting process using a multi-agent AI architecture. It offers **Job Seekers** instant feedback on their resumes and skills while providing **Recruiters** with pre-vetted, high-quality candidates.

## 2. Technology Stack

### Frontend
- **Framework**: React.js (Vite)
- **Styling**: Tailwind CSS (Modern, Responsive Design)
- **State Management**: React Hooks (useState, useEffect, useContext)
- **Routing**: React Router DOM
- **Authentication**: Firebase Authentication (Google OAuth + Email/Password)

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB (via Mongoose ODM)
- **Security**: 
  - `bcryptjs` for password hashing (legacy support).
  - Firebase Admin (token verification).
  - `helmet` / `cors` for API security.

### AI & Intelligence Layer
- **Primary Intelligence**: Google Gemini (1.5 Flash / Pro)
- **Secondary Intelligence**: DeepSeek API (Failover)
- **Tertiary Backup**: Static Curated Question Pools (Resilience)
- **Processing**: `pdf-parse` for Resume Text Extraction.

## 3. Core Architecture & "The Theory"

### 3.1 The "Fan-Out" AI Architecture
To ensure 99.9% reliability, the system uses a tiered AI strategy:
1.  **Tier 1 (Gemini)**: The system first attempts to generate dynamic content using Google's Gemini models. It rotates between `flash` and `pro` variants to optimize for speed and quota.
2.  **Tier 2 (DeepSeek)**: If Gemini is rate-limited or unreachable, the system automatically routes the request to the DeepSeek API.
3.  **Tier 3 (Static Fallback)**: If all AI services fail, the system falls back to a locally hosted, high-quality JSON library of questions and logic. This ensures the user **never** experiences a service outage.

### 3.2 The Strict Verification Engine
A common issue in AI recruitment tools is "hallucination" (AI saying a candidate matches when they don't).
- **The Solution**: We implemented a **"Trust but Verify"** engine in `server.js`.
- **How it works**:
    1. The AI analyzes the candidate's resume and suggests a "Match Percentage".
    2. The Backend intercepts this result.
    3. It performs a **Regex-based Hard Check** on the resume text for every required skill.
    4. It **overwrites** the AI's score with the mathematically proven score.
    5. This guarantees that a "90% Match" is mathematically accurate, building trust with users.

## 4. Features & User Flow

### 4.1 Token Economy (Gamification)
To prevent abuse of expensive AI resources and encourage user engagement, the platform runs on a "Coin" economy.
- **Signup Bonus**: +50 Coins.
- **Profile Completion**: +50 Coins (Reward).
- **High Assessment Score (>80%)**: +20 Coins (Reward).
- **Resume Analysis**: -10 Coins (Cost).
- **Full Assessment**: -15 Coins (Cost).
- **Interview Check**: -5 Coins (Cost).

### 4.2 For Job Seekers
1.  **Resume Analysis**: Users upload a PDF. The system parses the text, extracts skills, and compares them against job requirements using the Strict Verification Engine.
2.  **Skill Assessments**:
    - **MCQ**: Dynamic multiple-choice questions generated in real-time.
    - **Coding**: Algorithmic challenges with specific constraints.
    - **Hybrid**: A mix of both for comprehensive vetting.
3.  **Mock Interviews**: The AI generates behavioral and technical questions specific to the role (e.g., "Explain the Virtual DOM" for a React role). It reviews the user's answers and provides a 0-100 score with feedback.

### 4.3 For Recruiters
1.  **Job Posting**: Recruiters define roles with required skills (e.g., "React, Node.js, MongoDB").
2.  **Smart Dashboard**: View real-time stats on how many applicants are "Shortlisted" vs "Applied".
3.  **Vetted Candidates**: Recruiters see the *final verified score* of applicants, saving time on initial screening.

## 5. Database Schema (MongoDB)

### User Model
- `uid`: Firebase UID link.
- `role`: 'seeker' | 'recruiter'.
- `coins`: Current balance.
- `coinHistory`: Ledger of all transactions.
- `skills`, `experience`: Profile data.

### Job Model
- `recruiterId`: Link to creating user.
- `skills`: Array of required strings.
- `assessment`: Config object (type, question count).
- `minPercentage`: Threshold for auto-shortlisting.

### Application Model
- `jobId` & `userId`: Links entities.
- `resumeMatchPercent`: Stored result of analysis.
- `assessmentScore`: Result of technical test.
- `interviewScore`: Result of behavioral test.
- `finalScore`: Weighted average.
- `status`: 'APPLIED' | 'SHORTLISTED' | 'REJECTED'.

## 6. Key API Endpoints
- **POST** `/api/analyze-resume`: Uploads PDF, parses text, runs Hybrid AI+Regex analysis.
- **POST** `/api/generate-full-assessment`: Generates unique MCQs/Coding problems based on job skills.
- **POST** `/api/validate-answer`: Grades a text response to an interview question.
- **POST** `/api/users/sync`: Syncs Firebase generic Auth data with MongoDB robust profiles.
- **GET** `/api/dashboard/:recruiterId`: Aggregates stats for the recruiter view.

## 7. Future Roadmap
- **Video Interviewing**: Using WebRTC to record and analyze non-verbal cues.
- **Resume Builder**: AI-assisted resume creation tool.
- **Team Accounts**: Multiple recruiters managing the same job pool.
