const { countDaysFromParameters } = require('../utils/permittedDatesQuantity');

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const cases = [
  {
    name: 'counts permitted_dates array',
    params: [{ param_name: 'permitted_dates', param_value: '["08-20-2026","08-22-2026"]' }],
    expected: 2,
  },
  {
    name: 'counts range expanded list',
    params: [
      {
        param_name: 'permitted_dates',
        param_value: JSON.stringify(['08-20-2026', '08-21-2026', '08-22-2026']),
      },
    ],
    expected: 3,
  },
  {
    name: 'returns null without permitted_dates',
    params: [{ param_name: 'Date', param_value: '20, 22 August 2026' }],
    expected: null,
  },
  {
    name: 'returns null for empty array',
    params: [{ param_name: 'permitted_dates', param_value: '[]' }],
    expected: null,
  },
  {
    name: 'returns null for invalid JSON',
    params: [{ param_name: 'permitted_dates', param_value: 'not-json' }],
    expected: null,
  },
];

let failed = 0;
for (const c of cases) {
  const got = countDaysFromParameters(c.params);
  try {
    assert(got === c.expected, `${c.name}: expected ${c.expected}, got ${got}`);
    console.log('PASS:', c.name);
  } catch (e) {
    failed += 1;
    console.error('FAIL:', e.message);
  }
}

if (failed) {
  process.exit(1);
}
console.log('All permittedDatesQuantity tests passed');
