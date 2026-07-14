/**
 * Full-cost-recovery water rate computation (Rempark-style worksheet).
 */

function money(n) {
  const v = parseFloat(n);
  return Number.isFinite(v) ? v : 0;
}

function round2(n) {
  return parseFloat((money(n)).toFixed(2));
}

function round4(n) {
  return parseFloat((money(n)).toFixed(4));
}

const DEFAULT_STAFF_ROLES = [
  'Manager',
  'Plumber',
  'Meter Reader/Collector',
  'Bookkeeper',
  'Secretary',
  'Treasurer',
  'Pump Operator',
  'Tank Watchman',
];

const DEFAULT_OPEX_CATEGORIES = [
  'Honorarium',
  'Transportation',
  'Labor/Services',
  'Communication',
  'Per Diem',
  'Office Supplies',
  'Spare Parts (Chemicals)',
  'Representation',
  'Tools/Equipment/Furniture',
  'Light/Power',
  'Maintenance',
];

const OPEX_LETTERS = 'abcdefghijk'.split('');

function isHonorariumCategory(name) {
  return String(name || '').trim().toLowerCase() === 'honorarium';
}

const DEFAULT_ASSETS = [
  { component_name: 'Spring Box', service_life_years: 25, depreciable_percent: 15 },
  { component_name: 'Well and Head', service_life_years: 25, depreciable_percent: 15 },
  { component_name: 'Pump and Accessories', service_life_years: 5, depreciable_percent: 100 },
  { component_name: 'Pump Control House', service_life_years: 30, depreciable_percent: 15 },
  { component_name: 'Chlorinator', service_life_years: 3, depreciable_percent: 100 },
  { component_name: 'Transmission Pipeline', service_life_years: 25, depreciable_percent: 10 },
  { component_name: 'Water Tank', service_life_years: 50, depreciable_percent: 15 },
  { component_name: 'Distribution pipeline', service_life_years: 25, depreciable_percent: 10 },
  { component_name: 'Tapstands', service_life_years: 10, depreciable_percent: 0 },
  { component_name: 'Valves and Boxes', service_life_years: 10, depreciable_percent: 10 },
  { component_name: 'Pipe Supports', service_life_years: 15, depreciable_percent: 10 },
  { component_name: 'Tools/Equipment', service_life_years: 15, depreciable_percent: 10 },
];

function buildDefaultWorksheetPayload() {
  return {
    household_count: 0,
    avg_household_size: 5,
    liters_per_person_day: 60,
    days_per_month: 30,
    inflation_rate_percent: 10,
    amortization_monthly: 0,
    min_volume_m3: 3,
    excess_block_size_m3: 5,
    escalation_percent: 10,
    markup_tapstand_percent: 0,
    markup_residential_percent: 10,
    markup_commercial_percent: 20,
    notes: null,
    staff: DEFAULT_STAFF_ROLES.map((role_name, i) => ({
      role_name,
      headcount: 0,
      monthly_rate: 0,
      sort_order: i + 1,
    })),
    opex: DEFAULT_OPEX_CATEGORIES.map((category_name, i) => ({
      category_name,
      amount_monthly: 0,
      sort_order: i + 1,
    })),
    assets: DEFAULT_ASSETS.map((a, i) => ({
      component_name: a.component_name,
      cost: 0,
      service_life_years: a.service_life_years,
      depreciable_percent: a.depreciable_percent,
      sort_order: i + 1,
    })),
  };
}

function computeAssetDepreciation(asset) {
  const cost = money(asset.cost);
  const life = Math.max(0.01, money(asset.service_life_years));
  const pct = money(asset.depreciable_percent) / 100;
  const yearly = cost > 0 && pct > 0 ? (cost * pct) / life : 0;
  const monthly = yearly / 12;
  return {
    ...asset,
    cost: round2(cost),
    service_life_years: money(asset.service_life_years),
    depreciable_percent: money(asset.depreciable_percent),
    depreciation_yearly: round2(yearly),
    depreciation_monthly: round2(monthly),
  };
}

function computeDemand(worksheet) {
  const hh = Math.max(0, parseInt(worksheet.household_count, 10) || 0);
  const size = money(worksheet.avg_household_size);
  const lpd = money(worksheet.liters_per_person_day);
  const days = Math.max(1, parseInt(worksheet.days_per_month, 10) || 30);
  const persons = hh * size;
  const dailyLiters = persons * lpd;
  const monthlyLiters = dailyLiters * days;
  const monthlyM3 = monthlyLiters / 1000;
  return {
    household_count: hh,
    avg_household_size: size,
    liters_per_person_day: lpd,
    days_per_month: days,
    total_persons: round2(persons),
    projected_daily_liters: round2(dailyLiters),
    projected_monthly_liters: round2(monthlyLiters),
    projected_monthly_m3: round2(monthlyM3),
  };
}

function buildClassSchedule(baseRate, markupPercent, minVolume, blockSize, escalationPercent, blocks = 5) {
  const classRate = round2(baseRate * (1 + money(markupPercent) / 100));
  const esc = 1 + money(escalationPercent) / 100;
  const min = money(minVolume);
  const size = Math.max(0.01, money(blockSize));

  const tiers = [
    {
      label: 'Basic Rate (minimum volume)',
      from_m3: 0,
      to_m3: min,
      rate_per_m3: classRate,
      minimum_bill: round2(classRate * min),
      absolute_from_m3: 0,
      absolute_to_m3: min,
    },
  ];

  let prevRate = classRate;
  for (let i = 0; i < blocks; i += 1) {
    const rate = round2(prevRate * esc);
    const excessStart = i === 0 ? 1.0 : round2(i * size + 0.1);
    const excessEnd = i < blocks - 1 ? round2((i + 1) * size) : null;
    const absFrom = round2(min + (i === 0 ? 0.01 : i * size + 0.01));
    const absTo = excessEnd != null ? round2(min + (i + 1) * size) : null;
    tiers.push({
      label: excessEnd != null
        ? `${excessStart.toFixed(1)} – ${excessEnd.toFixed(1)} m³ (excess)`
        : `${excessStart.toFixed(1)} m³ and above (excess)`,
      from_m3: excessStart,
      to_m3: excessEnd,
      rate_per_m3: rate,
      absolute_from_m3: absFrom,
      absolute_to_m3: absTo,
    });
    prevRate = rate;
  }

  return {
    markup_percent: money(markupPercent),
    basic_rate: classRate,
    minimum_volume_m3: min,
    minimum_bill: round2(classRate * min),
    tiers,
  };
}

function unitConversions(baseRate) {
  const r = money(baseRate);
  return {
    per_cu_m: round2(r),
    per_drum_200l: round2(r * 0.2),
    per_container_20l: round2(r * 0.02),
    per_gallon_4l: round2(r * 0.004),
    per_liter: round4(r * 0.001),
  };
}

/**
 * Compute full worksheet results.
 * @param {object} worksheet - worksheet header fields
 * @param {Array} staff
 * @param {Array} opex
 * @param {Array} assets
 */
function computeRateWorksheet(worksheet, staff = [], opex = [], assets = []) {
  const demand = computeDemand(worksheet);

  const staffRows = (staff || []).map((s) => {
    const headcount = Math.max(0, parseInt(s.headcount, 10) || 0);
    // Stored as monthly_rate historically; Rempark worksheet treats this as daily rate
    const daily_rate = money(s.monthly_rate);
    return {
      ...s,
      headcount,
      monthly_rate: round2(daily_rate),
      daily_rate: round2(daily_rate),
      total: round2(headcount * daily_rate),
    };
  });
  const staffHeadcount = staffRows.reduce((sum, s) => sum + s.headcount, 0);
  const staffDailyTotal = round2(staffRows.reduce((sum, s) => sum + s.total, 0));
  const days = Math.max(1, parseInt(worksheet.days_per_month, 10) || 30);
  const honorariumMonthly = round2(staffDailyTotal * days);

  const opexRows = (opex || []).map((o, index) => {
    const name = String(o.category_name || '').trim() || `Expense ${index + 1}`;
    const amount = isHonorariumCategory(name) ? honorariumMonthly : round2(o.amount_monthly);
    return {
      ...o,
      category_name: name,
      letter: OPEX_LETTERS[index] || String(index + 1),
      amount_monthly: amount,
      is_honorarium: isHonorariumCategory(name),
    };
  });
  const opexTotal = round2(opexRows.reduce((sum, o) => sum + money(o.amount_monthly), 0));
  const operatingCost = opexTotal;

  const assetRows = (assets || []).map(computeAssetDepreciation);
  const assetsCost = round2(assetRows.reduce((sum, a) => sum + money(a.cost), 0));
  const depreciationYearly = round2(assetRows.reduce((sum, a) => sum + money(a.depreciation_yearly), 0));
  const depreciationMonthly = round2(assetRows.reduce((sum, a) => sum + money(a.depreciation_monthly), 0));

  const amortization = round2(worksheet.amortization_monthly);
  const inflationBase = round2(operatingCost + depreciationMonthly);
  const inflationRate = money(worksheet.inflation_rate_percent);
  const inflationCost = round2(inflationBase * (inflationRate / 100));
  const totalExpenses = round2(operatingCost + depreciationMonthly + inflationCost + amortization);

  const volume = money(demand.projected_monthly_m3);
  const baseRate = volume > 0 ? round2(totalExpenses / volume) : 0;

  const minVol = money(worksheet.min_volume_m3);
  const blockSize = money(worksheet.excess_block_size_m3) || 5;
  const escalation = money(worksheet.escalation_percent);

  const classifications = {
    tapstand: buildClassSchedule(
      baseRate,
      worksheet.markup_tapstand_percent,
      minVol,
      blockSize,
      escalation
    ),
    residential: buildClassSchedule(
      baseRate,
      worksheet.markup_residential_percent,
      minVol,
      blockSize,
      escalation
    ),
    commercial: buildClassSchedule(
      baseRate,
      worksheet.markup_commercial_percent,
      minVol,
      blockSize,
      escalation
    ),
  };

  return {
    demand,
    staff: {
      rows: staffRows,
      total_headcount: staffHeadcount,
      total_daily: staffDailyTotal,
      total_cost: staffDailyTotal,
      honorarium_monthly: honorariumMonthly,
      days_per_month: days,
    },
    opex: {
      rows: opexRows,
      total: opexTotal,
    },
    assets: {
      rows: assetRows,
      total_cost: assetsCost,
      total_depreciation_yearly: depreciationYearly,
      total_depreciation_monthly: depreciationMonthly,
    },
    expenses: {
      operating_cost: operatingCost,
      depreciation_cost: depreciationMonthly,
      inflation_cost: inflationCost,
      amortization_cost: amortization,
      inflation_base: inflationBase,
      inflation_rate_percent: inflationRate,
      total: totalExpenses,
    },
    base_rate: baseRate,
    unit_conversions: unitConversions(baseRate),
    classifications,
    rate_policy: {
      min_volume_m3: minVol,
      excess_block_size_m3: blockSize,
      escalation_percent: escalation,
      markup_tapstand_percent: money(worksheet.markup_tapstand_percent),
      markup_residential_percent: money(worksheet.markup_residential_percent),
      markup_commercial_percent: money(worksheet.markup_commercial_percent),
    },
  };
}

/**
 * Convert a classification schedule into PAMS progressive rate tiers.
 * Minimum = flat bill for min volume; excess brackets as per_cubic.
 */
function classificationToProgressiveTiers(classification) {
  const min = money(classification.minimum_volume_m3);
  const basic = money(classification.basic_rate);
  const tiers = [
    {
      tier_order: 1,
      from_m3: 0,
      to_m3: min,
      charge_type: 'minimum',
      rate_amount: round2(basic * min),
      description: `Minimum charge (up to ${min} m³)`,
    },
  ];

  let order = 2;
  for (const t of classification.tiers.slice(1)) {
    const from = money(t.absolute_from_m3 ?? (min + money(t.from_m3)));
    const to = t.absolute_to_m3 != null ? money(t.absolute_to_m3) : (t.to_m3 != null ? money(min + money(t.to_m3)) : null);
    tiers.push({
      tier_order: order,
      from_m3: from,
      to_m3: to,
      charge_type: 'per_cubic',
      rate_amount: money(t.rate_per_m3),
      description: t.label,
    });
    order += 1;
  }

  return tiers;
}

module.exports = {
  DEFAULT_STAFF_ROLES,
  DEFAULT_OPEX_CATEGORIES,
  DEFAULT_ASSETS,
  OPEX_LETTERS,
  isHonorariumCategory,
  buildDefaultWorksheetPayload,
  computeRateWorksheet,
  computeAssetDepreciation,
  classificationToProgressiveTiers,
  money,
  round2,
};
