-- Copy municipal default tiers to supplies that do not yet have their own rates

INSERT INTO ww_rate_tiers (
  tier_id, supply_id, tier_order, from_m3, to_m3, charge_type, rate_amount, description
)
SELECT
  MD5(CONCAT('wwtier-backfill-', s.supply_id, '-', d.tier_order)),
  s.supply_id,
  d.tier_order,
  d.from_m3,
  d.to_m3,
  d.charge_type,
  d.rate_amount,
  d.description
FROM ww_water_supplies s
CROSS JOIN ww_rate_tiers d
WHERE d.supply_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM ww_rate_tiers t WHERE t.supply_id = s.supply_id
  );

UPDATE ww_water_supplies s
SET minimum_charge = (
  SELECT rate_amount FROM ww_rate_tiers t
  WHERE t.supply_id = s.supply_id AND t.charge_type = 'minimum'
  ORDER BY t.tier_order LIMIT 1
),
rate_per_cubic_meter = 0
WHERE EXISTS (SELECT 1 FROM ww_rate_tiers t WHERE t.supply_id = s.supply_id);
