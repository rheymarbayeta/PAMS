'use strict';

function parseMoney(value) {
  const amount = parseFloat(value);
  return Number.isFinite(amount) ? amount : 0;
}

function parseRate(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  const rate = parseFloat(value);
  if (!Number.isFinite(rate) || rate < 0) return fallback;
  // Accept either 0.12 or 12 (percent)
  return rate > 1 ? rate / 100 : rate;
}

function toDateOnly(value) {
  if (!value) return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return value.toISOString().slice(0, 10);
  }
  const s = String(value).trim();
  if (!s) return null;
  return s.slice(0, 10);
}

/**
 * Compute VAT / total / WHT / net from basic rent and rates.
 * Free periods force all money fields to 0.
 */
function computeScheduleAmounts({ rent_type, basic_monthly_rent, vat_rate, wht_rate }) {
  const type = (rent_type || 'full').toLowerCase();
  const vatRate = parseRate(vat_rate, 0.12);
  const whtRate = parseRate(wht_rate, 0.05);

  if (type === 'free') {
    return {
      rent_type: 'free',
      basic_monthly_rent: 0,
      vat_rate: vatRate,
      wht_rate: whtRate,
      vat_amount: 0,
      total_monthly_rent: 0,
      wht_amount: 0,
      net_monthly_rent: 0,
    };
  }

  const basic = parseMoney(basic_monthly_rent);
  const vat = parseFloat((basic * vatRate).toFixed(2));
  const total = parseFloat((basic + vat).toFixed(2));
  const wht = parseFloat((basic * whtRate).toFixed(2));
  const net = parseFloat((total - wht).toFixed(2));

  return {
    rent_type: ['half', 'full', 'custom'].includes(type) ? type : 'custom',
    basic_monthly_rent: basic,
    vat_rate: vatRate,
    wht_rate: whtRate,
    vat_amount: vat,
    total_monthly_rent: total,
    wht_amount: wht,
    net_monthly_rent: net,
  };
}

/**
 * Normalize an incoming schedule row for persistence.
 * Returns { error } or a clean row object.
 */
function normalizeScheduleRow(row, index) {
  const period_label = (row.period_label || '').trim() || `Period ${index + 1}`;
  const date_from = toDateOnly(row.date_from);
  const date_to = toDateOnly(row.date_to);

  if (!date_from || !date_to) {
    return { error: `Schedule row ${index + 1}: date from and date to are required` };
  }
  if (date_to < date_from) {
    return { error: `Schedule row ${index + 1}: date to must be on or after date from` };
  }

  const amounts = computeScheduleAmounts({
    rent_type: row.rent_type,
    basic_monthly_rent: row.basic_monthly_rent,
    vat_rate: row.vat_rate,
    wht_rate: row.wht_rate,
  });

  return {
    sort_order: Number.isFinite(parseInt(row.sort_order, 10))
      ? parseInt(row.sort_order, 10)
      : index,
    period_label,
    date_from,
    date_to,
    notes: row.notes ? String(row.notes).trim().slice(0, 255) : null,
    ...amounts,
  };
}

function normalizeScheduleRows(rows) {
  if (rows == null) return { rows: null };
  if (!Array.isArray(rows)) {
    return { error: 'rental_schedule must be an array' };
  }

  const normalized = [];
  for (let i = 0; i < rows.length; i++) {
    const item = normalizeScheduleRow(rows[i] || {}, i);
    if (item.error) return { error: item.error };
    normalized.push(item);
  }
  return { rows: normalized };
}

function monthStartDate(year, month) {
  return `${year}-${String(month).padStart(2, '0')}-01`;
}

function monthEndDate(year, month) {
  const lastDay = new Date(year, month, 0).getDate();
  return `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
}

/**
 * Find schedule row covering a calendar month (any overlap with that month).
 * Prefers the row whose date_from is latest among overlaps.
 */
function findScheduleRowForMonth(scheduleRows, year, month) {
  if (!Array.isArray(scheduleRows) || scheduleRows.length === 0) return null;
  const mStart = monthStartDate(year, month);
  const mEnd = monthEndDate(year, month);

  const matches = scheduleRows.filter((row) => {
    const from = toDateOnly(row.date_from);
    const to = toDateOnly(row.date_to);
    if (!from || !to) return false;
    return from <= mEnd && to >= mStart;
  });

  if (matches.length === 0) return null;
  matches.sort((a, b) => String(b.date_from).localeCompare(String(a.date_from)));
  return matches[0];
}

function billableAmountFromRow(row, fallbackMonthly) {
  if (!row) return parseMoney(fallbackMonthly);
  if ((row.rent_type || '').toLowerCase() === 'free') return 0;
  return parseMoney(row.total_monthly_rent);
}

/**
 * Sum resolved monthly totals from contract effective month through throughMonth/Year.
 */
function sumScheduleDueThrough(scheduleRows, contractEffectiveDate, throughMonth, throughYear, fallbackMonthly) {
  const effective = new Date(contractEffectiveDate);
  if (Number.isNaN(effective.getTime())) return 0;

  let year = effective.getFullYear();
  let month = effective.getMonth() + 1;
  let total = 0;

  while (year < throughYear || (year === throughYear && month <= throughMonth)) {
    const row = findScheduleRowForMonth(scheduleRows, year, month);
    total += billableAmountFromRow(row, fallbackMonthly);
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }

  return parseFloat(total.toFixed(2));
}

async function fetchContractSchedule(connection, contractId) {
  try {
    const [rows] = await connection.query(
      `
      SELECT *
      FROM lease_contract_rental_schedule
      WHERE lease_contract_id = ?
      ORDER BY sort_order ASC, id ASC
    `,
      [contractId]
    );
    return rows;
  } catch (err) {
    if (err.code === 'ER_NO_SUCH_TABLE' || err.code === 'ER_BAD_FIELD_ERROR') {
      return [];
    }
    throw err;
  }
}

async function replaceContractSchedule(connection, contractId, rows) {
  await connection.query(
    'DELETE FROM lease_contract_rental_schedule WHERE lease_contract_id = ?',
    [contractId]
  );

  if (!rows || rows.length === 0) return;

  for (const row of rows) {
    await connection.query(
      `
      INSERT INTO lease_contract_rental_schedule (
        lease_contract_id,
        sort_order,
        period_label,
        date_from,
        date_to,
        rent_type,
        basic_monthly_rent,
        vat_rate,
        wht_rate,
        vat_amount,
        total_monthly_rent,
        wht_amount,
        net_monthly_rent,
        notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        contractId,
        row.sort_order,
        row.period_label,
        row.date_from,
        row.date_to,
        row.rent_type,
        row.basic_monthly_rent,
        row.vat_rate,
        row.wht_rate,
        row.vat_amount,
        row.total_monthly_rent,
        row.wht_amount,
        row.net_monthly_rent,
        row.notes,
      ]
    );
  }
}

async function resolveMonthlyRentalForPeriod(connection, contractId, month, year, fallbackMonthly) {
  const schedule = await fetchContractSchedule(connection, contractId);
  if (!schedule.length) {
    return {
      monthlyRental: parseMoney(fallbackMonthly),
      scheduleRow: null,
      hasSchedule: false,
    };
  }

  const row = findScheduleRowForMonth(schedule, year, month);
  return {
    monthlyRental: billableAmountFromRow(row, fallbackMonthly),
    scheduleRow: row,
    hasSchedule: true,
    schedule,
  };
}

async function sumRentalDueThroughPrev(connection, contract, throughMonth, throughYear) {
  const fallback = parseMoney(contract.monthly_rental_amount);
  const outstanding = parseMoney(contract.outstanding_rental_balance);
  const schedule = await fetchContractSchedule(connection, contract.id);

  let due;
  if (schedule.length > 0) {
    due = sumScheduleDueThrough(
      schedule,
      contract.contract_effective_date,
      throughMonth,
      throughYear,
      fallback
    );
  } else {
    const effective = new Date(contract.contract_effective_date);
    const em = effective.getMonth() + 1;
    const ey = effective.getFullYear();
    let months = 0;
    if (!(throughYear < ey || (throughYear === ey && throughMonth < em))) {
      months = (throughYear - ey) * 12 + (throughMonth - em) + 1;
    }
    due = parseFloat((months * fallback).toFixed(2));
  }

  return parseFloat((due + outstanding).toFixed(2));
}

module.exports = {
  parseMoney,
  parseRate,
  computeScheduleAmounts,
  normalizeScheduleRow,
  normalizeScheduleRows,
  findScheduleRowForMonth,
  billableAmountFromRow,
  sumScheduleDueThrough,
  fetchContractSchedule,
  replaceContractSchedule,
  resolveMonthlyRentalForPeriod,
  sumRentalDueThroughPrev,
  monthStartDate,
  monthEndDate,
};
