const pool = require('../config/database');

/**
 * Rule-based anomaly detection (Phase 3 optional AI foundation).
 * No external model required — clean API for future ML swap-in.
 */

async function detectWaterworksAnomalies({ limit = 50 } = {}) {
  const anomalies = [];
  const safeLimit = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));

  try {
    const [spikes] = await pool.execute(
      `SELECT r.reading_id, r.account_id, r.current_reading, r.previous_reading, r.consumption,
              r.reading_date, a.account_number
       FROM ww_meter_readings r
       LEFT JOIN ww_consumer_accounts a ON a.account_id = r.account_id
       WHERE r.previous_reading IS NOT NULL
         AND r.previous_reading > 0
         AND r.consumption > (r.previous_reading * 0.5)
         AND r.consumption > 50
       ORDER BY r.created_at DESC
       LIMIT ${safeLimit}`
    );
    for (const row of spikes) {
      const ratio = row.previous_reading
        ? Number(row.consumption) / Math.max(1, Number(row.previous_reading) * 0.1)
        : 0;
      anomalies.push({
        type: 'consumption_spike',
        severity: Number(row.consumption) > 200 ? 'high' : 'medium',
        module: 'waterworks',
        reference_id: row.reading_id,
        account_id: row.account_id,
        account_number: row.account_number,
        message: `Unusual consumption ${row.consumption} m³ (prev reading ${row.previous_reading})`,
        score: Math.min(1, ratio / 10),
        detected_at: new Date().toISOString(),
      });
    }
  } catch (_) { /* table may differ */ }

  try {
    const [zeros] = await pool.execute(
      `SELECT r.reading_id, r.account_id, r.current_reading, r.previous_reading, a.account_number
       FROM ww_meter_readings r
       LEFT JOIN ww_consumer_accounts a ON a.account_id = r.account_id
       WHERE r.status = 'pending'
         AND r.current_reading = r.previous_reading
       ORDER BY r.created_at DESC
       LIMIT 25`
    );
    for (const row of zeros) {
      anomalies.push({
        type: 'zero_consumption',
        severity: 'low',
        module: 'waterworks',
        reference_id: row.reading_id,
        account_id: row.account_id,
        account_number: row.account_number,
        message: 'Zero consumption reading pending verification',
        score: 0.3,
        detected_at: new Date().toISOString(),
      });
    }
  } catch (_) { /* optional */ }

  return anomalies;
}

async function detectAssessmentAnomalies({ limit = 30 } = {}) {
  const anomalies = [];
  try {
    const [rows] = await pool.execute(
      `SELECT ar.assessment_id, ar.application_id, ar.total_amount_due, a.application_number, a.permit_type
       FROM assessment_records ar
       JOIN applications a ON a.application_id = ar.application_id
       WHERE ar.total_amount_due > 100000
       ORDER BY ar.total_amount_due DESC
       LIMIT ${Math.min(100, limit)}`
    );
    for (const row of rows) {
      anomalies.push({
        type: 'high_assessment',
        severity: 'medium',
        module: 'permits',
        reference_id: row.application_id,
        message: `High assessment ₱${Number(row.total_amount_due).toLocaleString()} on ${row.application_number || row.application_id}`,
        score: 0.6,
        detected_at: new Date().toISOString(),
      });
    }
  } catch (_) { /* optional */ }
  return anomalies;
}

async function listAnomalies() {
  const [ww, assess] = await Promise.all([
    detectWaterworksAnomalies(),
    detectAssessmentAnomalies(),
  ]);
  return [...ww, ...assess].sort((a, b) => (b.score || 0) - (a.score || 0));
}

module.exports = {
  detectWaterworksAnomalies,
  detectAssessmentAnomalies,
  listAnomalies,
};
