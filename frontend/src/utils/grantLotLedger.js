/**
 * Hire1Percent V5 — Grant-Lot Rollover Ledger
 * 
 * Provides deterministic, audit-compliant grant-lot credit accounting:
 * - Unused monthly base and bonus credits roll into the next month
 * - Each rolled-over credit retains its original grant-lot identity
 * - Separate grant lots for base and bonus credits
 * - FIFO / lot-specific credit consumption
 * - Idempotent grant allocations (by billingEventId / cycleId)
 * - Safe balance calculations (no double counting, no negative or inflated balances)
 * 
 * Reference: V5 Developer Spec Section 7.2 & Acceptance Group V5-103
 */

/**
 * @typedef {Object} GrantLot
 * @property {string} lot_id - Unique lot identifier (e.g., "lot_2026_09_base_001")
 * @property {string} user_id - Owner user/organization ID
 * @property {string} plan_id - Associated plan (e.g., "monthly_small", "monthly_large", "payg")
 * @property {'base' | 'bonus' | 'payg'} grant_type - Type of grant
 * @property {number} original_quantity - Original credit quantity allocated
 * @property {number} remaining_quantity - Remaining unconsumed credits in this lot
 * @property {string} billing_period - Billing cycle identifier (e.g., "2026-09")
 * @property {string} granted_at - ISO timestamp of allocation
 * @property {string|null} rolled_from_lot_id - Identity of predecessor lot if rolled over
 * @property {string} [billing_event_id] - Idempotency key from billing provider
 */

/**
 * @typedef {Object} ConsumptionRecord
 * @property {string} consumption_id - Unique consumption record ID
 * @property {string} user_id - User/organization ID
 * @property {string} lot_id - Lot from which credit was drawn
 * @property {number} amount - Number of credits consumed (typically 1)
 * @property {string} reason - Billable event (default: 'completed_assessment_report')
 * @property {string} timestamp - ISO timestamp of consumption
 * @property {string} [report_id] - Optional assessment report reference
 */

export class GrantLotLedger {
  constructor(initialLots = [], initialConsumptions = []) {
    /** @type {Map<string, GrantLot>} */
    this.lots = new Map();
    /** @type {ConsumptionRecord[]} */
    this.consumptions = [];
    /** @type {Set<string>} */
    this.processedBillingEvents = new Set();

    for (const lot of initialLots) {
      this.lots.set(lot.lot_id, { ...lot });
      if (lot.billing_event_id) {
        this.processedBillingEvents.add(lot.billing_event_id);
      }
    }
    for (const c of initialConsumptions) {
      this.consumptions.push({ ...c });
    }
  }

  /**
   * Allocate new credits for a subscription renewal or purchase idempotently.
   * 
   * @param {Object} params
   * @param {string} params.userId
   * @param {string} params.planId - 'monthly_small', 'monthly_large', 'payg'
   * @param {number} params.baseCredits
   * @param {number} [params.bonusCredits=0]
   * @param {string} params.billingPeriod - 'YYYY-MM'
   * @param {string} params.billingEventId - Unique event ID for idempotency
   * @returns {{ success: boolean, allocatedLots: GrantLot[], message?: string }}
   */
  allocateSubscription({ userId, planId, baseCredits, bonusCredits = 0, billingPeriod, billingEventId }) {
    if (this.processedBillingEvents.has(billingEventId)) {
      return {
        success: false,
        allocatedLots: [],
        message: `Billing event ${billingEventId} already processed (idempotency guard).`
      };
    }

    const now = new Date().toISOString();
    const allocatedLots = [];

    // Base credits lot
    if (baseCredits > 0) {
      const baseLotId = `lot_${userId}_${billingPeriod}_base_${Date.now()}`;
      const baseLot = {
        lot_id: baseLotId,
        user_id: userId,
        plan_id: planId,
        grant_type: 'base',
        original_quantity: baseCredits,
        remaining_quantity: baseCredits,
        billing_period: billingPeriod,
        granted_at: now,
        rolled_from_lot_id: null,
        billing_event_id: billingEventId
      };
      this.lots.set(baseLotId, baseLot);
      allocatedLots.push(baseLot);
    }

    // Bonus credits lot (distinct identity)
    if (bonusCredits > 0) {
      const bonusLotId = `lot_${userId}_${billingPeriod}_bonus_${Date.now()}`;
      const bonusLot = {
        lot_id: bonusLotId,
        user_id: userId,
        plan_id: planId,
        grant_type: 'bonus',
        original_quantity: bonusCredits,
        remaining_quantity: bonusCredits,
        billing_period: billingPeriod,
        granted_at: now,
        rolled_from_lot_id: null,
        billing_event_id: billingEventId
      };
      this.lots.set(bonusLotId, bonusLot);
      allocatedLots.push(bonusLot);
    }

    this.processedBillingEvents.add(billingEventId);
    return { success: true, allocatedLots };
  }

  /**
   * Perform monthly rollover:
   * Carries remaining credits forward into the new cycle while preserving original lot identity.
   * 
   * @param {string} userId
   * @param {string} previousPeriod - 'YYYY-MM'
   * @param {string} nextPeriod - 'YYYY-MM'
   * @returns {GrantLot[]} - List of rolled-over lots
   */
  rolloverUnusedCredits(userId, previousPeriod, nextPeriod) {
    const rolledLots = [];
    const now = new Date().toISOString();

    for (const lot of this.lots.values()) {
      if (lot.user_id === userId && lot.billing_period === previousPeriod && lot.remaining_quantity > 0) {
        // Roll this lot forward with a link to original predecessor
        const newLotId = `lot_${userId}_${nextPeriod}_rollover_${lot.lot_id}`;
        const newLot = {
          lot_id: newLotId,
          user_id: userId,
          plan_id: lot.plan_id,
          grant_type: lot.grant_type,
          original_quantity: lot.remaining_quantity,
          remaining_quantity: lot.remaining_quantity,
          billing_period: nextPeriod,
          granted_at: now,
          rolled_from_lot_id: lot.lot_id
        };

        // Zero out remaining in previous lot so it cannot be double counted
        lot.remaining_quantity = 0;
        this.lots.set(newLotId, newLot);
        rolledLots.push(newLot);
      }
    }

    return rolledLots;
  }

  /**
   * Consume a credit (billable event: completed_assessment_report).
   * Consumes FIFO: oldest grant lots (including rollovers) first.
   * 
   * @param {Object} params
   * @param {string} params.userId
   * @param {number} [params.amount=1]
   * @param {string} [params.reason='completed_assessment_report']
   * @param {string} [params.reportId]
   * @returns {{ success: boolean, consumedFrom: Array<{ lotId: string, amount: number }>, remainingBalance: number }}
   */
  consumeCredit({ userId, amount = 1, reason = 'completed_assessment_report', reportId = null }) {
    const availableLots = Array.from(this.lots.values())
      .filter(l => l.user_id === userId && l.remaining_quantity > 0)
      .sort((a, b) => new Date(a.granted_at).getTime() - new Date(b.granted_at).getTime());

    const totalAvailable = availableLots.reduce((sum, l) => sum + l.remaining_quantity, 0);
    if (totalAvailable < amount) {
      return {
        success: false,
        consumedFrom: [],
        remainingBalance: totalAvailable,
        error: 'Insufficient assessment credits.'
      };
    }

    let needed = amount;
    const consumedFrom = [];
    const now = new Date().toISOString();

    for (const lot of availableLots) {
      if (needed <= 0) break;
      const take = Math.min(lot.remaining_quantity, needed);
      lot.remaining_quantity -= take;
      needed -= take;

      const record = {
        consumption_id: `cons_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        user_id: userId,
        lot_id: lot.lot_id,
        amount: take,
        reason,
        timestamp: now,
        report_id: reportId
      };
      this.consumptions.push(record);
      consumedFrom.push({ lotId: lot.lot_id, amount: take });
    }

    const remainingBalance = this.getBalance(userId);
    return { success: true, consumedFrom, remainingBalance };
  }

  /**
   * Get total available credit balance for a user
   * @param {string} userId
   * @returns {number}
   */
  getBalance(userId) {
    let balance = 0;
    for (const lot of this.lots.values()) {
      if (lot.user_id === userId) {
        balance += lot.remaining_quantity;
      }
    }
    return balance;
  }

  /**
   * Get detailed breakdown of lots for a user
   * @param {string} userId
   * @returns {GrantLot[]}
   */
  getActiveLots(userId) {
    return Array.from(this.lots.values()).filter(l => l.user_id === userId && l.remaining_quantity > 0);
  }
}

/**
 * Deterministic helper to simulate the V5 specification's rollover example:
 * Starter month 1 (2026-09): 10 base + 2 bonus = 12 total.
 * 8 credits consumed -> 4 remain.
 * Month 2 renewal (2026-10): 10 base + 2 bonus = 12 new credits.
 * Total available becomes 16 (4 rollover + 12 new), NOT 20.
 */
export function simulateStarterRollover() {
  const ledger = new GrantLotLedger();
  const userId = 'user_test_starter';

  // 1. Month 1: Starter grant (10 base + 2 bonus = 12)
  ledger.allocateSubscription({
    userId,
    planId: 'monthly_small',
    baseCredits: 10,
    bonusCredits: 2,
    billingPeriod: '2026-09',
    billingEventId: 'evt_sep_sub_001'
  });

  const sepInitial = ledger.getBalance(userId); // 12

  // 2. Consume 8 credits during September
  for (let i = 0; i < 8; i++) {
    ledger.consumeCredit({ userId, amount: 1, reportId: `rep_sep_${i + 1}` });
  }

  const sepRemaining = ledger.getBalance(userId); // 4

  // 3. Month end rollover: 4 credits roll over to October
  ledger.rolloverUnusedCredits(userId, '2026-09', '2026-10');

  // 4. October renewal: 12 new credits (10 base + 2 bonus)
  ledger.allocateSubscription({
    userId,
    planId: 'monthly_small',
    baseCredits: 10,
    bonusCredits: 2,
    billingPeriod: '2026-10',
    billingEventId: 'evt_oct_sub_001'
  });

  const octTotal = ledger.getBalance(userId); // 16

  return {
    sepInitial,      // 12
    sepRemaining,    // 4
    octTotal,        // 16
    isCompliant: sepInitial === 12 && sepRemaining === 4 && octTotal === 16
  };
}
