/**
 * Progressive block water billing.
 * Tier 1: flat minimum for consumption up to to_m3 (typically 10 m³ = ₱100.60)
 * Tiers 2+: per m³ for each cubic meter within that block only.
 */

function calculateTieredConsumptionCharge(consumption, tiers) {
  if (!tiers || tiers.length === 0) return null;

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

function calculateBillAmounts({
  consumption,
  rate,
  minimumCharge,
  previousBalance,
  surchargeSettings,
  tiers,
}) {
  const tierResult = calculateTieredConsumptionCharge(consumption, tiers);
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

module.exports = {
  calculateTieredConsumptionCharge,
  calculateBillAmounts,
  getRateTiersForSupply,
};
