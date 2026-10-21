/**
 * Hire1Percent V5 — Single Versioned Pricing Catalog
 * 
 * This is the SINGLE SOURCE OF TRUTH for all pricing across the application.
 * Homepage pricing cards, /pricing page, /book-demo package options, and 
 * package CTA routing ALL consume this catalog.
 * 
 * Catalog version: 2026-10-17-v5
 * Active profile:  launch_founder_promo
 * Currency:        USD
 * 
 * IMPORTANT: All monetary values are stored as INTEGER CENTS (minor units).
 * Format for display ONLY at the presentation boundary using formatCents().
 */

export const PRICING_CATALOG_VERSION = '2026-10-17-v5';
export const PRICING_PROFILE = 'launch_founder_promo';
export const PRICING_CURRENCY = 'USD';
export const BASE_MONTHLY_RATE_CENTS = 500;
export const BILLABLE_EVENT = 'completed_assessment_report';

/**
 * Plan definitions — authoritative plan data
 */
export const PLANS = [
  {
    plan_id: 'payg',
    name: 'Pay as you go',
    amount_cents: 750,
    base_credits: 1,
    bonus_credits: 0,
    total_credits: 1,
    effective_rate_cents: 750,
    is_monthly: false,
    is_custom: false,
    cta_label: 'Get Started',
    description: 'Purchase individual assessment credits as needed. No commitment required.',
    features: [
      'Single assessment credit',
      'Full 4-layer anti-cheat report',
      'Sample scorecard access',
      'Email support'
    ]
  },
  {
    plan_id: 'monthly_small',
    name: 'Starter',
    amount_cents: 5000,
    base_credits: 10,
    bonus_credits: 2,
    total_credits: 12,
    effective_rate_cents: 417, // Math.round(5000 / 12)
    is_monthly: true,
    is_custom: false,
    popular: true,
    cta_label: 'Start Free Trial',
    description: 'Ideal for growing teams running regular technical assessments each month.',
    features: [
      '10 base + 2 bonus credits/month',
      'Unused credits roll over',
      'Full 4-layer anti-cheat',
      'Priority email support',
      'Team dashboard'
    ]
  },
  {
    plan_id: 'monthly_large',
    name: 'Growth',
    amount_cents: 10000,
    base_credits: 20,
    bonus_credits: 5,
    total_credits: 25,
    effective_rate_cents: 400, // 10000 / 25
    is_monthly: true,
    is_custom: false,
    cta_label: 'Start Free Trial',
    description: 'Built for scaling engineering teams with high-volume hiring needs.',
    features: [
      '20 base + 5 bonus credits/month',
      'Unused credits roll over',
      'Full 4-layer anti-cheat',
      'API & webhook access',
      'Dedicated account manager',
      'Custom question bank'
    ]
  },
  {
    plan_id: 'enterprise_scale',
    name: 'Scale & Enterprise',
    amount_cents: null, // Custom pricing
    base_credits: 100,
    bonus_credits: null, // Custom bonus allowance
    total_credits: null, // Custom
    effective_rate_cents: null, // Volume pricing
    is_monthly: true,
    is_custom: true,
    min_credits: 100,
    cta_label: 'Contact Sales',
    description: 'Custom pricing for organizations running 100+ assessments per month.',
    features: [
      '100+ assessments/month',
      'Custom credit pool & rollover',
      'Full 4-layer anti-cheat',
      'API & webhook integration',
      'Dedicated success manager',
      'Custom SLA & MSA',
      'SSO & advanced security'
    ]
  }
];

/**
 * Get a plan by its plan_id
 * @param {string} planId 
 * @returns {Object|null}
 */
export function getPlanById(planId) {
  return PLANS.find(p => p.plan_id === planId) || null;
}

/**
 * Validate a plan_id against the catalog
 * @param {string} planId 
 * @returns {boolean}
 */
export function isValidPlanId(planId) {
  return PLANS.some(p => p.plan_id === planId);
}

/**
 * Get the display name for a plan_id
 * @param {string} planId 
 * @returns {string}
 */
export function getPlanDisplayName(planId) {
  const plan = getPlanById(planId);
  return plan ? plan.name : '';
}

/**
 * Format integer cents to a display-ready USD string.
 * This is the ONLY place cents are converted to dollars for display.
 * @param {number} cents — integer minor units
 * @param {Object} options
 * @param {boolean} options.showCents — whether to show .00 for whole dollars
 * @returns {string}
 */
export function formatCents(cents, { showCents = true } = {}) {
  if (cents === null || cents === undefined) return 'Custom';
  const dollars = cents / 100;
  if (!showCents && dollars === Math.floor(dollars)) {
    return `$${Math.floor(dollars)}`;
  }
  return `$${dollars.toFixed(2)}`;
}

/**
 * Format the effective per-credit rate for display.
 * Uses ~ prefix when the rate involves rounding.
 * @param {Object} plan 
 * @returns {string}
 */
export function formatEffectiveRate(plan) {
  if (plan.is_custom) return 'Custom';
  if (!plan.is_monthly) return formatCents(plan.effective_rate_cents);
  // Check if rate is approximate (has remainder)
  const exactRate = plan.amount_cents / plan.total_credits;
  const isApproximate = exactRate !== Math.round(exactRate) || Math.round(exactRate) !== plan.effective_rate_cents;
  const prefix = isApproximate ? '≈' : '';
  return `${prefix}${formatCents(plan.effective_rate_cents)}`;
}

/**
 * Build the CTA URL for a plan
 * @param {string} planId 
 * @returns {string}
 */
export function getPlanCtaUrl(planId) {
  return `/book-demo?plan=${planId}`;
}

/**
 * Grant-lot rollover example data (for documentation/display)
 * Previous Starter grant: 4 unused credits
 * Next renewal: 12 new credits (10 base + 2 bonus)
 * Total available: 16 (NOT 20 — the 4 rollover retain their original grant identity)
 */
export const ROLLOVER_EXAMPLE = {
  previous_grant: {
    plan_id: 'monthly_small',
    original_credits: 12,
    consumed: 8,
    remaining: 4,
    period: '2026-09'
  },
  new_grant: {
    plan_id: 'monthly_small',
    base_credits: 10,
    bonus_credits: 2,
    total_credits: 12,
    period: '2026-10'
  },
  total_available: 16, // 4 rollover + 12 new
  note: 'Rolled-over credits retain their original grant-lot identity for audit purposes.'
};
