const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
  calculateTieredConsumptionCharge,
  BILLING_MODELS,
} = require('../utils/waterworksBilling');

describe('waterworksBilling', () => {
  it('exposes billing models', () => {
    assert.ok(BILLING_MODELS.includes('progressive'));
    assert.ok(BILLING_MODELS.includes('minimum_excess'));
  });

  it('calculates progressive minimum for zero consumption', () => {
    const tiers = [
      { tier_order: 1, charge_type: 'minimum', from_m3: 0, to_m3: 10, rate_amount: 100, description: 'Min' },
      { tier_order: 2, charge_type: 'per_cubic', from_m3: 10, to_m3: 20, rate_amount: 15 },
    ];
    const result = calculateTieredConsumptionCharge(0, tiers, 'progressive');
    assert.equal(result.total, 100);
  });

  it('calculates progressive blocks', () => {
    const tiers = [
      { tier_order: 1, charge_type: 'minimum', from_m3: 0, to_m3: 10, rate_amount: 100 },
      { tier_order: 2, charge_type: 'per_cubic', from_m3: 10, to_m3: 20, rate_amount: 10 },
    ];
    const result = calculateTieredConsumptionCharge(15, tiers, 'progressive');
    // minimum 100 + 5 m³ * 10 = 150
    assert.equal(result.total, 150);
  });
});
