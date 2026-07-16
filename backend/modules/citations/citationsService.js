const repo = require('./citationsRepository');

async function listForUser(query) {
  return repo.listCitations(query);
}

module.exports = { listForUser };
