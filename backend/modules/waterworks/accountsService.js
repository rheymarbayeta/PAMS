const repo = require('./accountsRepository');

/**
 * Waterworks domain service (Phase 4 — second module pilot after permits).
 */

async function listAccountsForUser(query) {
  return repo.listAccounts(query);
}

async function getAccount(accountId) {
  return repo.getAccountById(accountId);
}

async function listReadingsForUser(query) {
  return repo.listReadings(query);
}

module.exports = {
  listAccountsForUser,
  getAccount,
  listReadingsForUser,
  parsePagination: repo.parsePagination,
  ACCOUNT_SELECT: repo.ACCOUNT_SELECT,
  ACCOUNT_FROM: repo.ACCOUNT_FROM,
};
