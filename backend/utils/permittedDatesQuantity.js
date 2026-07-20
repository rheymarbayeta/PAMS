/**
 * Count assessment days from application_parameters (Special Cockfight).
 * Prefers `permitted_dates` JSON array of MM-DD-YYYY strings.
 */

function countDaysFromParameters(parameters) {
  if (!Array.isArray(parameters) || parameters.length === 0) return null;

  const permitted = parameters.find(
    (p) => p.param_name === 'permitted_dates' && p.param_value
  );
  if (permitted) {
    try {
      const parsed =
        typeof permitted.param_value === 'string'
          ? JSON.parse(permitted.param_value)
          : permitted.param_value;
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.length;
      }
    } catch (err) {
      console.warn('Failed to parse permitted_dates:', err.message);
    }
  }

  return null;
}

module.exports = { countDaysFromParameters };
