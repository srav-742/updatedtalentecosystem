/**
 * Hire1Percent V5 — Approved Public Content Constants
 * 
 * This file contains the EXACT approved V5 public copy from Document 1.
 * All components rendering V5 marketing content must reference this file
 * rather than hardcoding strings.
 */

// ─── Hero Section ──────────────────────────────────────────────────────────────
export const V5_HERO = {
  eyebrow: 'TECHNICAL ASSESSMENT PLATFORM WITH 4-LAYER ANTI-CHEAT',
  h1_line1: 'Assess How Candidates Code, Adapt, and Defend Their Decisions',
  h1_line2: '—Before You Book the Interview.',
  body: 'Hire1Percent runs a proctored coding task with a mid-assessment requirement change, then verifies authorship through a three-minute AI code defense. Recruiters receive a plain-English scorecard with unit-test results, code diffs, and session evidence — no engineering review required before the first interview.',
  demo_cta: 'Book a Live Demo',
  demo_cta_placement: 'header',
  sample_cta: 'See an Example Candidate Report',
  sample_cta_note: 'This sample report uses fictional candidate data and a deterministic test fixture. No real candidate information is displayed.',
  protocol_strip: [
    'Environment Lock',
    'Keystroke Telemetry',
    'AI Code Defense',
    'Constraint Update'
  ]
};

// ─── Workflow Section ──────────────────────────────────────────────────────────
export const V5_WORKFLOW = {
  heading: 'How It Works',
  stages: [
    {
      number: '01',
      title: 'Set the role and assessment',
      description: 'Choose the programming language and task complexity. The platform generates a practical coding challenge with a built-in mid-task requirement change and a ten-case unit-test suite.'
    },
    {
      number: '02',
      title: 'Assess coding and live adaptation',
      description: 'The candidate writes code in a proctored environment with environment lock, keystroke telemetry, and clipboard monitoring active from the start. Partway through, a requirement update tests whether the candidate can adapt existing code rather than only write new code.'
    },
    {
      number: '03',
      title: 'Verify authorship through the three-minute AI code defense',
      description: 'Immediately after submission, an AI interviewer asks the candidate to explain specific lines of their code, justify design choices, and discuss the failing test cases. The defense is recorded and scored for authorship confidence.'
    }
  ],
  evidence_items: [
    'Plain-English recruiter summary',
    'Unit test suite breakdown',
    'Expected-versus-actual outputs',
    'Submitted code and AST checkpoints',
    'Mid-task requirement change and before/after diff',
    'Code-specific AI prompt and transcript',
    'Four-layer telemetry',
    'LLM-signature analysis',
    'T09 and T10 review questions'
  ]
};

// ─── Four-Layer Anti-Cheat Section ─────────────────────────────────────────────
export const V5_ANTI_CHEAT = {
  heading: 'Four-Layer Anti-Cheat Protocol',
  cards: [
    {
      number: 1,
      title: 'Environment & Biometric Lock',
      body: 'Full-screen browser lock with face and gaze detection. The system monitors for tab switches, secondary displays, clipboard activity, and the presence of unauthorized individuals throughout the session.',
      evidence: 'Session integrity log, face-presence timeline, gaze deviation count',
      reviewer_value: 'Confirms the candidate was physically present and focused for the entire assessment.'
    },
    {
      number: 2,
      title: 'Keystroke & Code-Evolution Telemetry',
      body: 'Every keystroke is recorded with millisecond timestamps. AST (Abstract Syntax Tree) checkpoints capture how the code was built incrementally — not pasted in bulk.',
      evidence: 'Keystroke heatmap, AST checkpoint diffs, typing speed analysis',
      reviewer_value: 'Shows whether the code was written incrementally by a human or pasted from an external source.',
      ast_explanation: 'AST checkpoints are snapshots of the code\'s logical structure taken at regular intervals. They show how the candidate\'s solution evolved step by step — for example, first writing the loop, then adding the deduplication set, then building the account dictionary.'
    },
    {
      number: 3,
      title: 'AI Conversational Code Defense',
      body: 'Immediately after submission, an AI interviewer asks the candidate to explain specific lines of their submitted code, justify design decisions, and discuss edge cases. The three-minute recorded defense is scored for authorship confidence.',
      evidence: 'Defense transcript, authorship confidence score, response latency',
      reviewer_value: 'Verifies the candidate can explain and defend code they claim to have written.',
      example_prompt: 'Looking at your submitted code, your solution passes 8 of 10 tests but fails T09 and T10. On Line 11, you assign latest_at directly from the event timestamp rather than comparing it to the existing value. Can you explain your reasoning for that design choice?'
    },
    {
      number: 4,
      title: 'Mid-Assessment Constraint Updates & LLM-Signature Detection',
      body: 'Partway through the coding task, a new requirement is introduced that forces the candidate to modify their existing solution. The system monitors whether and how the candidate adapts. Separately, LLM-signature analysis checks the submitted code for patterns characteristic of AI-generated solutions.',
      evidence: 'Before/after diff, refactor timeline, LLM probability score',
      reviewer_value: 'Tests real-time adaptability and detects AI-generated code patterns.',
      example_change: 'Events may now arrive out of chronological order. Your summary must still report the maximum occurred_at per account.'
    }
  ]
};

// ─── Candidate Experience Section ──────────────────────────────────────────────
export const V5_CANDIDATE_EXPERIENCE = {
  heading: 'What Candidates Experience',
  recruiter_caption: 'Share this section with candidates so they know exactly what to expect.',
  cards: [
    {
      title: 'A practical coding task, not a trick question',
      body: 'You\'ll work on a realistic backend or full-stack problem — the kind of task you might encounter in your first week on the job. Expect the task to take approximately 15–20 minutes.',
      detail: 'During the coding task, a requirement will change partway through. This is disclosed upfront — there are no hidden surprises. The update tests whether you can adapt existing code rather than only write new code.'
    },
    {
      title: 'Your environment and what\'s recorded',
      body: 'You\'ll code in a browser-based editor with full-screen lock enabled. Your keystrokes, code snapshots, webcam feed, and screen activity are recorded throughout the session.',
      detail: 'You may use standard language documentation and built-in IDE features. External AI assistants, browser tabs, and copy-paste from outside the editor are monitored and flagged.'
    },
    {
      title: 'A three-minute code defense after submission',
      body: 'Immediately after you submit your code, an AI interviewer will ask you to explain specific lines of your solution. This short recorded conversation verifies that you wrote the code yourself.',
      detail: 'The defense typically includes 2–3 questions about your design choices and the test cases that failed. It\'s a conversation, not a quiz — explain your thinking naturally.'
    }
  ],
  accommodation: 'If you need accommodations or experience technical issues during your assessment, contact us at',
  accommodation_link: '/contact?topic=assessment-support',
  prep_guide_label: 'Read the Candidate Preparation Guide',
  prep_guide_link: '/for-engineers'
};

// ─── Homepage FAQs (V5 — 6 required) ──────────────────────────────────────────
export const V5_HOMEPAGE_FAQS = [
  {
    question: 'What does Hire1Percent assess?',
    answer: 'Hire1Percent assesses how candidates code, adapt to changing requirements, and defend their design decisions. Each assessment includes a practical coding task with a mid-task requirement change, a ten-case automated test suite, and a three-minute AI code defense to verify authorship.'
  },
  {
    question: 'How does the four-layer anti-cheat work?',
    answer: 'Layer 1 locks the browser and monitors biometrics. Layer 2 records every keystroke and takes AST snapshots of the code\'s evolution. Layer 3 runs a post-submission AI interview where the candidate explains their code. Layer 4 introduces a mid-task requirement change and analyzes the code for LLM-generated patterns.'
  },
  {
    question: 'What does the recruiter receive after an assessment?',
    answer: 'Recruiters receive a plain-English scorecard with unit-test results, submitted code with highlighted issues, a before/after diff from the requirement change, the code-defense transcript, and session evidence from all four anti-cheat layers. No engineering review is required to understand the report.'
  },
  {
    question: 'How much does an assessment cost?',
    answer: 'Individual assessments cost $7.50 each. The Starter plan provides 12 credits per month (10 base + 2 bonus) for $50/month, approximately $4.17 per credit. The Growth plan provides 25 credits per month (20 base + 5 bonus) for $100/month, $4.00 per credit. Enterprise pricing is custom for 100+ monthly assessments.'
  },
  {
    question: 'Do unused credits roll over?',
    answer: 'Yes. Unused monthly credits roll over to the next billing period while retaining their original grant-lot identity. For example, if you use 8 of your 12 Starter credits in September, the remaining 4 credits carry forward and combine with your 12 new October credits for a total of 16 available credits.'
  },
  {
    question: 'Can candidates prepare for the assessment?',
    answer: 'Yes. Candidates are told upfront that the task involves a practical coding challenge, a mid-task requirement change, and a three-minute code defense. The Candidate Preparation Guide at /for-engineers provides the full format, expected duration, permitted tools, and tips for the defense conversation.'
  }
];

// ─── Cookie Consent (V5 approved copy) ─────────────────────────────────────────
export const V5_COOKIE_CONSENT = {
  title: 'Cookie choices',
  body: 'We use essential cookies to keep the platform working and optional cookies to improve your experience and understand how the site is used.',
  accept_label: 'Accept optional cookies',
  reject_label: 'Reject optional cookies',
  settings_label: 'Cookie settings',
  policy_link: '/cookies'
};

// ─── Service Retirement Notice ─────────────────────────────────────────────────
export const V5_SERVICE_RETIREMENT = {
  heading: 'Staffing Service Retired',
  body: 'Our managed staffing and direct-hire placement service has been retired. Hire1Percent is now focused exclusively on technical assessment and anti-cheat verification for engineering hiring teams.',
  cta_label: 'Explore the Assessment Platform',
  cta_link: '/',
  contact_label: 'Questions about an existing engagement?',
  contact_link: '/contact?topic=other'
};

// ─── Contact Topics ────────────────────────────────────────────────────────────
export const V5_CONTACT_TOPICS = {
  'assessment-support': {
    h1: 'Assessment Support',
    intro: 'Need help with a coding assessment, environment check, or technical issue during your session? We\'re here to assist.',
    note: 'Please do not paste your signed invitation URL or private code solutions into this form.'
  },
  'security': {
    h1: 'Security & Privacy',
    intro: 'Questions about our security practices, data handling, or compliance? Our security team will respond within one business day.'
  },
  'packages': {
    h1: 'Packages & Pricing',
    intro: 'Interested in our assessment plans, credit packages, or enterprise pricing? Let us find the right fit for your team.'
  },
  'other': {
    h1: 'General Inquiries',
    intro: 'Have a question that doesn\'t fit the categories above? Reach out and we\'ll route your message to the right team.'
  }
};

// ─── For Engineers / Candidate Prep ────────────────────────────────────────────
export const V5_CANDIDATE_PREP = {
  heading: 'Candidate Preparation Guide',
  subheading: 'Everything you need to know before your Hire1Percent assessment.',
  steps: [
    {
      number: '1',
      title: 'Review the assessment details',
      description: 'Check the role, coding task description, expected duration (approximately 15–20 minutes), submission deadline, and permitted tools in your invitation email.'
    },
    {
      number: '2',
      title: 'Complete your environment check',
      description: 'Read the assessment data notice. Verify your webcam, microphone, and browser are working. The assessment requires full-screen mode with camera access enabled.'
    },
    {
      number: '3',
      title: 'Work on the task and respond to the requirement update',
      description: 'Write your solution in the browser-based editor. Partway through the task, you will receive a requirement change — this is disclosed upfront and tests your ability to adapt existing code.'
    },
    {
      number: '4',
      title: 'Submit and complete the code defense',
      description: 'After submitting your code, an AI interviewer will immediately ask you to explain specific lines of your solution in a three-minute recorded video conversation. Speak naturally about your design choices.'
    },
    {
      number: '5',
      title: 'Your report is sent to the hiring team',
      description: 'The hiring team receives your scorecard with test results, code analysis, defense transcript, and session evidence. You don\'t need to do anything else — the report speaks for itself.'
    }
  ],
  warning: 'Do not paste your signed invitation URL or private code solutions into any support form, chat, or public forum.',
  support_text: 'Need accommodations or experiencing technical issues?',
  support_link: '/contact?topic=assessment-support'
};
