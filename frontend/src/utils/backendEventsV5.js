/**
 * Hire1Percent V5 — Deterministic Sample Fixture: backend_events_v5
 * 
 * This module provides the SINGLE shared fixture used by:
 * - Homepage assessment preview
 * - /sample-scorecard full report
 * - API webhook example payload
 * - Automated fixture verification tests
 * 
 * IMPORTANT: This fixture contains FICTIONAL candidate data only.
 * No real candidate data may appear in this module.
 * 
 * Fixture ID: backend_events_v5
 * Role: Backend Engineer (Python)
 * Task: Summarize account events without counting repeated deliveries twice.
 * Result: 8 of 10 unit tests passed (T01–T08 pass, T09 and T10 fail)
 */

export const FIXTURE_ID = 'backend_events_v5';
export const FIXTURE_ROLE = 'Backend Engineer (Python)';
export const FIXTURE_TASK_TITLE = 'Summarize account events without counting repeated deliveries twice.';
export const FIXTURE_RESULT = { passed: 8, total: 10 };

// ─── Original Candidate Submission ─────────────────────────────────────────────
// This is the EXACT submitted code. Do NOT replace with the corrected solution.
// Line numbers are 1-indexed:
// Line 1:  def candidate_summary(events):
// Line 2:      summaries = {}
// Line 3:      last_event_id = None
// Line 4:      for event in events:
// Line 5:          eid = event["event_id"]
// Line 6:          if eid == last_event_id:
// Line 7:              continue
// Line 8:          last_event_id = eid
// Line 9:          account = event["account"]
// Line 10:         if account not in summaries: summaries[account] = {"balance_cents": 0, "latest_at": 0}
// Line 11:         summaries[account]["latest_at"] = event["occurred_at"]
// Line 12:         summaries[account]["balance_cents"] += event["amount_cents"]
// Line 13:     return summaries
export const ORIGINAL_CODE = `def candidate_summary(events):
    summaries = {}
    last_event_id = None
    for event in events:
        eid = event["event_id"]
        if eid == last_event_id:
            continue
        last_event_id = eid
        account = event["account"]
        if account not in summaries: summaries[account] = {"balance_cents": 0, "latest_at": 0}
        summaries[account]["latest_at"] = event["occurred_at"]
        summaries[account]["balance_cents"] += event["amount_cents"]
    return summaries`;

export const ORIGINAL_CODE_LINES = ORIGINAL_CODE.split('\n');

// ─── Corrected Reference Solution ──────────────────────────────────────────────
// Uses a batch-wide set of seen event IDs and retains the maximum timestamp per account.
export const CORRECTED_CODE = `def corrected_reference_summary(events):
    """Corrected reference – batch-wide dedup + max timestamp."""
    summaries = {}
    seen_ids = set()
    for event in events:
        eid = event["event_id"]
        if eid in seen_ids:
            continue
        seen_ids.add(eid)
        account = event["account"]
        if account not in summaries:
            summaries[account] = {"balance_cents": 0, "latest_at": 0}
        summaries[account]["balance_cents"] += event["amount_cents"]
        summaries[account]["latest_at"] = max(
            summaries[account]["latest_at"],
            event["occurred_at"]
        )
    return summaries`;

export const CORRECTED_CODE_LINES = CORRECTED_CODE.split('\n');

// ─── Test Cases T01–T10 ────────────────────────────────────────────────────────
export const TEST_CASES = [
  {
    id: 'T01',
    name: 'Single event for one account',
    events: [{ event_id: 'e1', account: 'A', amount_cents: 100, occurred_at: 10 }],
    expected: { A: { balance_cents: 100, latest_at: 10 } },
    original_passes: true
  },
  {
    id: 'T02',
    name: 'Two events for same account',
    events: [
      { event_id: 'e1', account: 'A', amount_cents: 100, occurred_at: 10 },
      { event_id: 'e2', account: 'A', amount_cents: 200, occurred_at: 20 }
    ],
    expected: { A: { balance_cents: 300, latest_at: 20 } },
    original_passes: true
  },
  {
    id: 'T03',
    name: 'Duplicate event ID (adjacent) — should be ignored',
    events: [
      { event_id: 'e1', account: 'A', amount_cents: 100, occurred_at: 10 },
      { event_id: 'e1', account: 'A', amount_cents: 100, occurred_at: 10 }
    ],
    expected: { A: { balance_cents: 100, latest_at: 10 } },
    original_passes: true
  },
  {
    id: 'T04',
    name: 'Multiple accounts',
    events: [
      { event_id: 'e1', account: 'A', amount_cents: 100, occurred_at: 10 },
      { event_id: 'e2', account: 'B', amount_cents: 200, occurred_at: 20 }
    ],
    expected: {
      A: { balance_cents: 100, latest_at: 10 },
      B: { balance_cents: 200, latest_at: 20 }
    },
    original_passes: true
  },
  {
    id: 'T05',
    name: 'Empty events list',
    events: [],
    expected: {},
    original_passes: true
  },
  {
    id: 'T06',
    name: 'Negative amounts (refunds)',
    events: [
      { event_id: 'e1', account: 'A', amount_cents: 500, occurred_at: 10 },
      { event_id: 'e2', account: 'A', amount_cents: -200, occurred_at: 20 }
    ],
    expected: { A: { balance_cents: 300, latest_at: 20 } },
    original_passes: true
  },
  {
    id: 'T07',
    name: 'Zero amount event',
    events: [
      { event_id: 'e1', account: 'A', amount_cents: 0, occurred_at: 10 }
    ],
    expected: { A: { balance_cents: 0, latest_at: 10 } },
    original_passes: true
  },
  {
    id: 'T08',
    name: 'Multiple accounts with adjacent duplicates',
    events: [
      { event_id: 'e1', account: 'A', amount_cents: 100, occurred_at: 10 },
      { event_id: 'e1', account: 'A', amount_cents: 100, occurred_at: 10 },
      { event_id: 'e2', account: 'B', amount_cents: 200, occurred_at: 20 }
    ],
    expected: {
      A: { balance_cents: 100, latest_at: 10 },
      B: { balance_cents: 200, latest_at: 20 }
    },
    original_passes: true
  },
  {
    id: 'T09',
    name: 'Out-of-order timestamps — latest_at must retain maximum',
    events: [
      { event_id: 'e1', account: 'A', amount_cents: 250, occurred_at: 200 },
      { event_id: 'e2', account: 'A', amount_cents: 500, occurred_at: 0 }
    ],
    expected: { A: { balance_cents: 750, latest_at: 200 } },
    original_result: { A: { balance_cents: 750, latest_at: 0 } },
    original_passes: false,
    failure_explanation: 'The candidate solution assigns `latest_at = event["occurred_at"]` directly on Line 11 instead of taking `max(latest_at, occurred_at)`. When event e2 arrives with an earlier timestamp (0) after e1 (200), it overwrites the higher timestamp.',
    highlight_lines: [11],
    highlight_description: 'Line 11: `summaries[account]["latest_at"] = event["occurred_at"]` unconditionally overwrites latest_at.'
  },
  {
    id: 'T10',
    name: 'Non-adjacent duplicate event ID — must still be deduplicated',
    events: [
      { event_id: 'e1', account: 'A', amount_cents: 250, occurred_at: 100 },
      { event_id: 'e2', account: 'A', amount_cents: 500, occurred_at: 200 },
      { event_id: 'e1', account: 'A', amount_cents: 500, occurred_at: 200 }
    ],
    expected: { A: { balance_cents: 750, latest_at: 200 } },
    original_result: { A: { balance_cents: 1250, latest_at: 200 } },
    original_passes: false,
    failure_explanation: 'The candidate solution only compares each event with `last_event_id` (Lines 6–7) rather than tracking a batch-wide set of seen event IDs. When non-adjacent duplicate e1 arrives after e2, `eid != last_event_id` evaluates to true, causing Line 12 to double-count the event.',
    highlight_lines: [6, 7, 12],
    highlight_description: 'Lines 6–7: `if eid == last_event_id:` only catches adjacent duplicates. Line 12: `summaries[account]["balance_cents"] += event["amount_cents"]` accumulates the duplicate.'
  }
];

// ─── Recruiter Summary ─────────────────────────────────────────────────────────
export const RECRUITER_SUMMARY = 
  'The candidate passed 8 of 10 unit tests. Their solution correctly handles basic event summarization, ' +
  'duplicate event deduplication for adjacent events, multi-account aggregation, refunds, and empty inputs. ' +
  'However, the solution fails when events arrive out of chronological order (T09) because it overwrites ' +
  'the latest timestamp instead of retaining the maximum. It also fails T10 because non-adjacent duplicate ' +
  'event IDs are not properly deduplicated across the full batch. The candidate demonstrated solid ' +
  'fundamentals but missed two edge cases that would matter in production event-processing systems.';

// ─── Interview Questions (T09/T10) ─────────────────────────────────────────────
export const INTERVIEW_QUESTIONS = [
  {
    id: 'T09',
    question: 'Your summary function overwrites the latest_at timestamp with each event\'s occurred_at. What happens when events arrive out of chronological order, and how would you fix this?'
  },
  {
    id: 'T10',
    question: 'Your deduplication correctly handles adjacent duplicate event IDs, but T10 shows a non-adjacent duplicate being counted twice. Can you walk through why your current implementation misses this case?'
  }
];

// ─── Code Defense (Layer 3) ────────────────────────────────────────────────────
export const CODE_DEFENSE_PROMPT = 
  'Looking at your submitted code for the account event summarizer, your solution passes 8 of 10 tests ' +
  'but fails T09 and T10. On Line 11, you assign latest_at directly from the event timestamp rather than ' +
  'comparing it to the existing value. Can you explain your reasoning for that design choice, and what ' +
  'would you change if events could arrive out of order?';

export const CODE_DEFENSE_TRANSCRIPT = [
  {
    speaker: 'System',
    text: CODE_DEFENSE_PROMPT
  },
  {
    speaker: 'Candidate',
    text: 'Right, so I assumed the events would always come in chronological order since that\'s how most event streams work. For the latest_at field, I just assigned it directly because each new event would naturally have a later timestamp. But if events can arrive out of order — which makes sense in distributed systems — I should use max() to compare the current latest_at with the incoming occurred_at. That\'s a one-line fix on Line 11.'
  },
  {
    speaker: 'System',
    text: 'Good. Now regarding T10 — your code uses last_event_id which catches adjacent duplicates, but the test shows a non-adjacent duplicate event (e1, e2, e1) being double-counted. Can you explain why that happened?'
  },
  {
    speaker: 'Candidate',
    text: 'Ah, yes — I only stored last_event_id as a single variable instead of using a set to track all seen event IDs across the entire batch. So when e2 arrived, last_event_id was updated to e2, and when e1 appeared again later, it didn\'t match e2 and got counted again. To fix that, I should initialize a seen_ids set at the start and check `if eid in seen_ids:`.'
  }
];

// ─── Session Evidence (4 Layers) ───────────────────────────────────────────────
export const SESSION_EVIDENCE = {
  layer1: {
    name: 'Environment & Biometric Lock',
    status: 'Verified',
    face_present_pct: 99.4,
    gaze_on_screen_pct: 97.2,
    tab_switches: 0,
    secondary_display: 'None detected',
    unauthorized_persons: 0,
    audio_events: 0,
    clipboard_pastes_external: 0
  },
  layer2: {
    name: 'Keystroke & Code-Evolution Telemetry',
    status: 'Verified',
    total_keystrokes: 1420,
    typing_speed_wpm: 54,
    ast_checkpoints: 6,
    incremental_ratio: 0.96,
    bulk_paste_events: 0,
    backspace_rate: '8.2%',
    pattern: 'Natural incremental human coding'
  },
  layer3: {
    name: 'AI Conversational Code Defense',
    status: 'Verified',
    authorship_confidence: '94%',
    defense_duration_seconds: 180,
    questions_answered: 2,
    response_latency_avg_ms: 620,
    explanation_match_score: '96%'
  },
  layer4: {
    name: 'Mid-Assessment Constraint Updates & LLM-Signature Detection',
    status: 'Partial Adaptation',
    update_disclosed_at: '07:00',
    adaptation_status: 'Refactor attempted, T09/T10 edge cases unresolved',
    llm_probability_score: '2.1%',
    llm_signature_detected: false,
    refactor_diff_summary: 'Added latest_at assignment and attempted dedup'
  }
};

// ─── Eight-Row Chronological Timeline ──────────────────────────────────────────
export const SESSION_TIMELINE = [
  { time: '00:00', event: 'Assessment started', layer: 'Layer 1 & 2 active' },
  { time: '02:15', event: 'AST Checkpoint 1: Initial function skeleton and empty summaries map', layer: 'Layer 2' },
  { time: '04:30', event: 'AST Checkpoint 2: Added event loop and basic balance accumulation', layer: 'Layer 2' },
  { time: '07:00', event: 'Requirement update: Out-of-order events & deduplication constraints announced', layer: 'Layer 4' },
  { time: '09:45', event: 'AST Checkpoint 3: Added last_event_id adjacent dedup and latest_at assignment', layer: 'Layer 2 & 4' },
  { time: '14:20', event: 'Local test run: 8 of 10 passed, candidate attempted quick adjustments', layer: 'Platform' },
  { time: '17:45', event: 'Code submitted: Candidate finalized submission', layer: 'Platform' },
  { time: '17:50', event: 'Layer 3 AI Conversational Code Defense began (3-minute recorded prompt)', layer: 'Layer 3' }
];

// ─── API Webhook Example Payload ───────────────────────────────────────────────
export const WEBHOOK_EXAMPLE_PAYLOAD = {
  event: 'assessment.report.ready',
  fixture_id: FIXTURE_ID,
  timestamp: '2026-10-17T15:30:00.000Z',
  data: {
    candidate_id: 'cand_fictional_demo_01',
    role: FIXTURE_ROLE,
    scorecard_url: 'https://hire1percent.com/sample-scorecard',
    results: {
      tests_passed: 8,
      tests_total: 10,
      failed_test_ids: ['T09', 'T10'],
      adaptation_status: 'partial'
    },
    anti_cheat: {
      layer_1_environment_lock: 'pass',
      layer_2_keystroke_telemetry: 'pass',
      layer_3_code_defense: 'pass',
      layer_4_llm_detection: 'clean'
    }
  }
};

// ─── Executable JavaScript Verification ────────────────────────────────────────

/**
 * JS implementation of candidate_summary matching the Python submission behavior
 */
export function candidateSummary(events) {
  const summaries = {};
  let lastEventId = null;
  for (const event of events) {
    const eid = event.event_id;
    if (eid === lastEventId) continue;
    lastEventId = eid;
    const account = event.account;
    if (!summaries[account]) {
      summaries[account] = { balance_cents: 0, latest_at: 0 };
    }
    summaries[account].latest_at = event.occurred_at;
    summaries[account].balance_cents += event.amount_cents;
  }
  return summaries;
}

/**
 * JS implementation of corrected_reference_summary matching the Python reference
 */
export function correctedReferenceSummary(events) {
  const summaries = {};
  const seenIds = new Set();
  for (const event of events) {
    const eid = event.event_id;
    if (seenIds.has(eid)) continue;
    seenIds.add(eid);
    const account = event.account;
    if (!summaries[account]) {
      summaries[account] = { balance_cents: 0, latest_at: 0 };
    }
    summaries[account].balance_cents += event.amount_cents;
    summaries[account].latest_at = Math.max(
      summaries[account].latest_at,
      event.occurred_at
    );
  }
  return summaries;
}

/**
 * Run all test cases against candidate solution
 */
export function runFixtureTests() {
  return TEST_CASES.map(tc => {
    const actual = candidateSummary(tc.events);
    const passed = JSON.stringify(actual) === JSON.stringify(tc.expected);
    return {
      id: tc.id,
      name: tc.name,
      passed,
      expected: tc.expected,
      actual,
      expected_pass: tc.original_passes
    };
  });
}

/**
 * Run all test cases against corrected reference solution
 */
export function runCorrectedTests() {
  return TEST_CASES.map(tc => {
    const actual = correctedReferenceSummary(tc.events);
    const passed = JSON.stringify(actual) === JSON.stringify(tc.expected);
    return {
      id: tc.id,
      name: tc.name,
      passed,
      expected: tc.expected,
      actual
    };
  });
}
