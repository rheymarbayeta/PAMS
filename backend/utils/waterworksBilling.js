/**
 * Water billing calculators:
 * - progressive: flat minimum block + incremental per-m³ tiers
 * - bracket_flat: total consumption falls in one range → single flat charge
 * - per_unit_deduction: consumption × base rate minus applicable flat deduction
 */

const BILLING_MODELS = ['progressive', 'bracket_flat', 'per_unit_deduction'];

function calculateProgressiveCharge(consumption, tiers) {
  const sorted = [...tiers].sort((a, b) => a.tier_order - b.tier_order);
  const consumed = Math.max(0, parseFloat(consumption) || 0);
  const breakdown = [];
  let total = 0;
  let cursor = 0;

  if (consumed === 0) {
    const minTier = sorted.find((t) => t.charge_type === 'minimum');
    const amount = minTier ? parseFloat(minTier.rate_amount) : 0;
    if (minTier) {
      breakdown.push({
        description: minTier.description || 'Minimum charge',
        charge_type: 'minimum',
        cubic_meters: 0,
        rate: parseFloat(minTier.rate_amount),
        amount,
      });
    }
    return { total: parseFloat(amount.toFixed(2)), breakdown };
  }

  for (const tier of sorted) {
    if (consumed <= cursor) break;

    const tierTo = tier.to_m3 != null ? parseFloat(tier.to_m3) : Infinity;

    if (tier.charge_type === 'minimum') {
      const amount = parseFloat(tier.rate_amount);
      total += amount;
      breakdown.push({
        description: tier.description || `Minimum (up to ${tierTo} m³)`,
        charge_type: 'minimum',
        cubic_meters: Math.min(consumed, tierTo),
        rate: amount,
        amount,
      });
      cursor = tierTo;
      if (consumed <= cursor) break;
      continue;
    }

    if (tier.charge_type === 'per_cubic') {
      const blockEnd = Math.min(consumed, tierTo);
      const cubicInBlock = Math.max(0, blockEnd - cursor);
      if (cubicInBlock > 0) {
        const rate = parseFloat(tier.rate_amount);
        const amount = parseFloat((cubicInBlock * rate).toFixed(2));
        total += amount;
        breakdown.push({
          description: tier.description || `Block ${tier.from_m3}–${tier.to_m3 ?? '∞'} m³`,
          charge_type: 'per_cubic',
          cubic_meters: cubicInBlock,
          rate,
          amount,
        });
        cursor = blockEnd;
      }
    }
  }

  return { total: parseFloat(total.toFixed(2)), breakdown };
}

function findMatchingBracketTier(consumption, tiers) {
  const sorted = [...tiers]
    .filter((t) => t.charge_type === 'flat_bracket')
    .sort((a, b) => a.tier_order - b.tier_order);

  for (const tier of sorted) {
    const from = parseFloat(tier.from_m3);
    const to = tier.to_m3 != null ? parseFloat(tier.to_m3) : Infinity;
    if (consumption >= from && consumption <= to) {
      return tier;
    }
  }
  return null;
}

function calculateBracketFlatCharge(consumption, tiers) {
  const consumed = Math.max(0, parseFloat(consumption) || 0);
  const breakdown = [];

  if (consumed === 0) {
    return { total: 0, breakdown };
  }

  const tier = findMatchingBracketTier(consumed, tiers);
  if (!tier) {
    return { total: 0, breakdown };
  }

  const amount = parseFloat(tier.rate_amount);
  breakdown.push({
    description: tier.description || `Bracket ${tier.from_m3}–${tier.to_m3 ?? '∞'} m³`,
    charge_type: 'flat_bracket',
    cubic_meters: consumed,
    rate: amount,
    amount,
  });

  return { total: parseFloat(amount.toFixed(2)), breakdown };
}

function calculatePerUnitDeductionCharge(consumption, tiers, baseUnitRate) {
  const consumed = Math.max(0, parseFloat(consumption) || 0);
  const baseRate = parseFloat(baseUnitRate) || 0;
  const breakdown = [];
  let total = 0;

  if (consumed === 0 || baseRate <= 0) {
    return { total: 0, breakdown };
  }

  const gross = parseFloat((consumed * baseRate).toFixed(2));
  total = gross;
  breakdown.push({
    description: `${consumed} m³ @ ₱${baseRate}/m³`,
    charge_type: 'per_unit_base',
    cubic_meters: consumed,
    rate: baseRate,
    amount: gross,
  });

  const deductions = [...tiers]
    .filter((t) => t.charge_type === 'deduction')
    .sort((a, b) => b.tier_order - a.tier_order);

  for (const tier of deductions) {
    const from = parseFloat(tier.from_m3);
    const to = tier.to_m3 != null ? parseFloat(tier.to_m3) : Infinity;
    if (consumed >= from && consumed <= to) {
      const deduction = parseFloat(tier.rate_amount);
      total -= deduction;
      breakdown.push({
        description: tier.description || `Deduction (${from}–${tier.to_m3 ?? '∞'} m³)`,
        charge_type: 'deduction',
        cubic_meters: consumed,
        rate: deduction,
        amount: parseFloat((-deduction).toFixed(2)),
      });
      break;
    }
  }

  total = Math.max(0, total);
  return { total: parseFloat(total.toFixed(2)), breakdown };
}

function calculateTieredConsumptionCharge(consumption, tiers, billingModel = 'progressive', baseUnitRate = 0) {
  if (!tiers || tiers.length === 0) return null;

  const model = BILLING_MODELS.includes(billingModel) ? billingModel : 'progressive';

  if (model === 'bracket_flat') {
    return calculateBracketFlatCharge(consumption, tiers);
  }
  if (model === 'per_unit_deduction') {
    return calculatePerUnitDeductionCharge(consumption, tiers, baseUnitRate);
  }
  return calculateProgressiveCharge(consumption, tiers);
}

function calculateBillAmounts({
  consumption,
  rate,
  minimumCharge,
  previousBalance,
  surchargeSettings,
  tiers,
  billingModel = 'progressive',
}) {
  const tierResult = calculateTieredConsumptionCharge(consumption, tiers, billingModel, rate);
  let amountDue;
  let tierBreakdown = [];

  if (tierResult) {
    amountDue = tierResult.total;
    tierBreakdown = tierResult.breakdown;
  } else {
    const consumptionAmount = parseFloat((consumption * rate).toFixed(2));
    amountDue = Math.max(minimumCharge, consumptionAmount);
  }

  const surchargeAmount = surchargeSettings.enabled
    ? parseFloat((previousBalance * surchargeSettings.rate).toFixed(2))
    : 0;
  const totalDue = parseFloat((amountDue + previousBalance + surchargeAmount).toFixed(2));
  const effectiveRate =
    consumption > 0 ? parseFloat((amountDue / consumption).toFixed(4)) : 0;

  return { amountDue, surchargeAmount, totalDue, tierBreakdown, effectiveRate };
}

async function getRateTiersForSupply(connection, supplyId) {
  const [supplyTiers] = await connection.query(
    `SELECT tier_id, supply_id, tier_order, from_m3, to_m3, charge_type, rate_amount, description
     FROM ww_rate_tiers WHERE supply_id = ? ORDER BY tier_order ASC`,
    [supplyId]
  );
  if (supplyTiers.length) return supplyTiers;

  const [defaultTiers] = await connection.query(
    `SELECT tier_id, supply_id, tier_order, from_m3, to_m3, charge_type, rate_amount, description
     FROM ww_rate_tiers WHERE supply_id IS NULL ORDER BY tier_order ASC`
  );
  return defaultTiers;
}

async function getSupplyBillingConfig(connection, supplyId) {
  const [rows] = await connection.query(
    `SELECT billing_model, rate_per_cubic_meter, minimum_charge
     FROM ww_water_supplies WHERE supply_id = ?`,
    [supplyId]
  );
  const supply = rows[0] || {};
  const tiers = await getRateTiersForSupply(connection, supplyId);
  return {
    billingModel: supply.billing_model || 'progressive',
    baseUnitRate: parseFloat(supply.rate_per_cubic_meter) || 0,
    minimumCharge: parseFloat(supply.minimum_charge) || 0,
    tiers,
  };
}

module.exports = {
  BILLING_MODELS,
  calculateTieredConsumptionCharge,
  calculateBillAmounts,
  getRateTiersForSupply,
  getSupplyBillingConfig,
};
