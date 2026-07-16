const repo = require('./marketsRepository');

async function listRecords(query) {
  return repo.listPriceRecords(query);
}

async function listCommodities() {
  return repo.listCommodities();
}

async function listMarkets() {
  return repo.listMarkets();
}

module.exports = { listRecords, listCommodities, listMarkets };
