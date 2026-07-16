const repo = require('./rentalsRepository');
const balances = require('../../utils/leaseContractBalances');

/**
 * Rights & Rentals domain service (Phase 4).
 */

async function listLeaseContracts() {
  return repo.listLeaseContractsWithUnits();
}

async function listLessees() {
  return repo.listLessees();
}

module.exports = {
  listLeaseContracts,
  listLessees,
  getRightsBalanceSnapshot: balances.getRightsBalanceSnapshot,
  getRentalTotalCollected: balances.getRentalTotalCollected,
};
