function parseMoney(value) {
  const amount = parseFloat(value);
  return Number.isFinite(amount) ? amount : 0;
}

function getNetPrincipal(contract) {
  return parseMoney(contract?.principal_amount) - parseMoney(contract?.downpayment);
}

function isLegacyAccount(contract) {
  if (!contract) return false;
  if (contract.is_legacy_account === true || contract.is_legacy_account === 1) return true;
  return (
    parseMoney(contract.opening_rights_paid) > 0 ||
    parseMoney(contract.opening_rights_balance) > 0 ||
    parseMoney(contract.opening_rental_paid) > 0
  );
}

function getRightsBalanceSnapshot(contract, historyPaid = 0) {
  const netPrincipal = getNetPrincipal(contract);
  const openingPaid = parseMoney(contract?.opening_rights_paid);
  const openingBalance = parseMoney(contract?.opening_rights_balance);
  const history = parseMoney(historyPaid);
  const totalRightsPaid = openingPaid + history;

  let rightsBalance;
  if (isLegacyAccount(contract)) {
    rightsBalance = openingBalance - history;
  } else {
    rightsBalance = netPrincipal - totalRightsPaid;
  }

  return {
    netPrincipal,
    openingPaid,
    openingBalance,
    historyPaid: history,
    totalRightsPaid: parseFloat(totalRightsPaid.toFixed(2)),
    rightsBalance: parseFloat(rightsBalance.toFixed(2)),
  };
}

function getRightsRunningBalanceStart(contract) {
  if (isLegacyAccount(contract)) {
    return parseMoney(contract?.opening_rights_balance);
  }
  return getNetPrincipal(contract);
}

function getRentalTotalCollected(contract, historyPaid = 0) {
  return parseFloat((parseMoney(contract?.opening_rental_paid) + parseMoney(historyPaid)).toFixed(2));
}

function getRentalRunningTotalStart(contract) {
  return parseMoney(contract?.opening_rental_paid);
}

function normalizeLegacyAccountInput(body) {
  const isLegacy = body.is_legacy_account === true || body.is_legacy_account === 1 || body.is_legacy_account === '1';

  if (!isLegacy) {
    return {
      is_legacy_account: 0,
      opening_rights_paid: 0,
      opening_rights_balance: 0,
      opening_rental_paid: 0,
      opening_balance_notes: null,
    };
  }

  const openingRightsPaid = parseMoney(body.opening_rights_paid);
  const openingRightsBalance =
    body.opening_rights_balance === undefined || body.opening_rights_balance === null || body.opening_rights_balance === ''
      ? null
      : parseMoney(body.opening_rights_balance);
  const openingRentalPaid = parseMoney(body.opening_rental_paid);

  if (openingRightsBalance === null) {
    return { error: 'Outstanding rights balance is required for legacy accounts' };
  }
  if (openingRightsPaid < 0 || openingRightsBalance < 0 || openingRentalPaid < 0) {
    return { error: 'Opening balance amounts cannot be negative' };
  }

  return {
    is_legacy_account: 1,
    opening_rights_paid: openingRightsPaid,
    opening_rights_balance: openingRightsBalance,
    opening_rental_paid: openingRentalPaid,
    opening_balance_notes: body.opening_balance_notes?.trim() || null,
  };
}

module.exports = {
  parseMoney,
  getNetPrincipal,
  isLegacyAccount,
  getRightsBalanceSnapshot,
  getRightsRunningBalanceStart,
  getRentalTotalCollected,
  getRentalRunningTotalStart,
  normalizeLegacyAccountInput,
};
