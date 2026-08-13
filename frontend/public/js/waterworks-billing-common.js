/* Shared waterworks billing statement rendering (single + bulk) */
(function (global) {
  'use strict';

  var MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  function resolveApiBase() {
    if (global.location.origin.includes('6070')) {
      return 'http://' + global.location.hostname + ':5040';
    }
    return global.location.origin.replace(':3000', ':5000');
  }

  function fmt(n) {
    return Number(n || 0).toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function esc(s) {
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(s == null ? '' : String(s)));
    return d.innerHTML;
  }

  function formatDMY(iso) {
    if (!iso) return '';
    var parts = String(iso).slice(0, 10).split('-');
    if (parts.length !== 3) return esc(iso);
    return parts[2] + '/' + parts[1] + '/' + parts[0];
  }

  function blank(v) {
    if (v === null || v === undefined || v === '') return '&nbsp;';
    return esc(v);
  }

  function buildRateLines(tiers, bill) {
    var lines = [];
    var list = tiers || [];
    if (!list.length && bill && bill.tier_breakdown) {
      var bd = bill.tier_breakdown;
      if (typeof bd === 'string') {
        try { bd = JSON.parse(bd); } catch (e) { bd = []; }
      }
      list = bd || [];
    }
    list.forEach(function (t) {
      var from = t.from_m3 != null ? Number(t.from_m3) : null;
      var to = t.to_m3 != null ? Number(t.to_m3) : null;
      var amount = t.rate_amount != null ? Number(t.rate_amount) : (t.rate != null ? Number(t.rate) : null);
      var qty = t.cubic_meters != null ? Number(t.cubic_meters) : null;
      var labelQty = '';

      if (t.charge_type === 'minimum' || t.charge_type === 'flat_bracket') {
        labelQty = (to != null ? to : (from != null ? from : qty != null ? qty : '')) + ' cu.m.';
      } else if (from != null || to != null) {
        if (from != null && to != null) labelQty = from + '-' + to + ' cu.m.';
        else if (to != null) labelQty = 'up to ' + to + ' cu.m.';
        else labelQty = 'over ' + from + ' cu.m.';
      } else if (qty != null) {
        labelQty = qty + ' cu.m.';
      } else {
        labelQty = t.description || 'Rate';
      }

      if (amount == null || !Number.isFinite(amount)) return;
      var prefix = (t.charge_type === 'minimum' || t.charge_type === 'flat_bracket') ? '' : 'P ';
      lines.push(
        '<div class="rate-line"><span class="qty">' + esc(labelQty) + '</span>' +
        '<span class="amt">' + prefix + fmt(amount) + '</span></div>'
      );
    });

    if (!lines.length && bill && bill.rate_applied != null) {
      lines.push(
        '<div class="rate-line"><span class="qty">' + esc(Number(bill.consumption || 0) + ' cu.m.') + '</span>' +
        '<span class="amt">P ' + fmt(bill.rate_applied) + '</span></div>'
      );
    }
    return lines.length ? lines.join('') : '&nbsp;';
  }

  function parseHeaderSettings(settings) {
    settings = settings || {};
    var officeRaw = (settings.assessment_header_line_4 && settings.assessment_header_line_4.value)
      || "MUNICIPAL TREASURER'S OFFICE";
    var officeLine = officeRaw;
    if (officeLine && !/^office\b/i.test(officeLine)) {
      officeLine = 'OFFICE OF THE ' + officeLine;
    }
    officeLine = officeLine.replace(/OFFICE OF THE\s+OFFICE OF THE/i, 'OFFICE OF THE');
    return {
      muniLine: (settings.assessment_header_line_2 && settings.assessment_header_line_2.value)
        || 'Municipality of DALAGUETE',
      officeLine: officeLine,
      treasurerName: (settings.municipal_treasurer_name && settings.municipal_treasurer_name.value)
        || 'HAIDEE D. OGOC',
      treasurerPos: (settings.municipal_treasurer_position && settings.municipal_treasurer_position.value)
        || 'Acting Municipal Treasurer'
    };
  }

  /**
   * @param {object} payload - API data from /accounts/:id/billing
   * @param {object} settings - /api/settings map
   * @param {{ compact?: boolean, billingMonth?: number, billingYear?: number }} options
   */
  function renderStatement(payload, settings, options) {
    options = options || {};
    var data = payload && payload.data ? payload.data : payload;
    var month = options.billingMonth || data.billing_month || (new Date().getMonth() + 1);
    var year = options.billingYear || data.billing_year || new Date().getFullYear();
    var header = parseHeaderSettings(settings);
    var acc = data.account || {};
    var bill = data.bill;
    var hasBill = !!bill;
    var collectionDate = data.collection_date_label || '';
    var periodFrom = formatDMY(data.period_start);
    var periodTo = formatDMY(data.period_end);
    var docClass = options.compact ? 'billing-doc billing-doc-compact' : 'billing-doc';

    return (
      '<div class="' + docClass + '">' +
        '<div class="doc-header">' +
          '<img class="logo-left" src="/dalaguete-logo.png" alt="Municipality of Dalaguete">' +
          '<div class="header-text">' +
            '<div class="muni">' + esc(header.muniLine) + '</div>' +
            '<div class="office">' + esc(header.officeLine) + '</div>' +
            '<div class="dept">Municipal Special Waterworks</div>' +
          '</div>' +
          '<div class="logo-spacer" aria-hidden="true"></div>' +
        '</div>' +
        '<table class="bill">' +
          '<colgroup>' +
            '<col style="width:14%">' +
            '<col style="width:14%">' +
            '<col style="width:12%">' +
            '<col style="width:14%">' +
            '<col style="width:14%">' +
            '<col style="width:14%">' +
            '<col style="width:18%">' +
          '</colgroup>' +
          '<tr>' +
            '<td class="lbl field-label">CONSUMER NAME:</td>' +
            '<td colspan="6" class="field-value">' + blank(acc.consumer_name) + '</td>' +
          '</tr>' +
          '<tr>' +
            '<td class="lbl field-label">ADDRESS:</td>' +
            '<td colspan="6" class="field-value">' + blank(acc.address) + '</td>' +
          '</tr>' +
          '<tr>' +
            '<td colspan="2" class="center lbl section-title">PERIOD COVERED</td>' +
            '<td class="center lbl meter-no-cell" rowspan="2">METER NO.' +
              '<div class="meter-no-value">' + blank(acc.meter_number) + '</div>' +
            '</td>' +
            '<td colspan="4" rowspan="2" class="collection-cell">' +
              '<span class="collection-label">Collection Date:</span>' +
              '<span class="collection-value">' + blank(collectionDate) + '</span>' +
            '</td>' +
          '</tr>' +
          '<tr>' +
            '<td class="center date-cell"><div class="subhead">FROM</div><div class="date-value">' + blank(periodFrom) + '</div></td>' +
            '<td class="center date-cell"><div class="subhead">TO</div><div class="date-value">' + blank(periodTo) + '</div></td>' +
          '</tr>' +
          '<tr>' +
            '<td colspan="2" class="center lbl section-title">METER READING</td>' +
            '<td class="center lbl col-head" rowspan="2">CONSUMED<br>(cum)</td>' +
            '<td class="center lbl col-head" rowspan="2">MONTHLY<br>DUES</td>' +
            '<td class="center lbl col-head" rowspan="2">UNPAID<br>DUES</td>' +
            '<td class="center lbl col-head" rowspan="2" colspan="2">TOTAL AMOUNT<br>DUE</td>' +
          '</tr>' +
          '<tr>' +
            '<td class="center lbl col-head">PREVIOUS</td>' +
            '<td class="center lbl col-head">PRESENT</td>' +
          '</tr>' +
          '<tr>' +
            '<td class="center reading-cell">' + (hasBill ? blank(bill.previous_reading) : '&nbsp;') + '</td>' +
            '<td class="center reading-cell">' + (hasBill ? blank(bill.current_reading) : '&nbsp;') + '</td>' +
            '<td class="center reading-cell">' + (hasBill ? blank(bill.consumption) : '&nbsp;') + '</td>' +
            '<td class="center amount-cell">' + (hasBill ? ('Php' + fmt(bill.amount_due)) : '&nbsp;') + '</td>' +
            '<td class="center amount-cell">' + (hasBill ? ('Php' + fmt(bill.previous_balance || 0)) : '&nbsp;') + '</td>' +
            '<td class="center amount-cell total-cell" colspan="2">' + (hasBill ? ('Php' + fmt(bill.total_due)) : '&nbsp;') + '</td>' +
          '</tr>' +
          '<tr>' +
            '<td colspan="2" class="rate-cell"><span class="rate-title">RATE</span>' + buildRateLines(data.rate_tiers, bill) + '</td>' +
            '<td colspan="5" class="note-cell">' +
              '<div class="note-line"><strong>Note:</strong> Month of ' + esc(MONTHS[month - 1]) + '</div>' +
              '<div class="sig-block">' +
                '<div class="sig-name">' + esc(header.treasurerName) + '</div>' +
                '<div class="sig-title">' + esc(header.treasurerPos) + '</div>' +
              '</div>' +
            '</td>' +
          '</tr>' +
        '</table>' +
        (!hasBill ? '<p class="no-bill-msg">No bill generated for this period.</p>' : '') +
      '</div>'
    );
  }

  function renderBulkPages(statements, settings, options) {
    options = options || {};
    var html = '';
    for (var i = 0; i < statements.length; i += 2) {
      html += '<div class="bulk-page">';
      html +=
        '<div class="statement-wrapper">' +
        renderStatement(statements[i], settings, {
          compact: true,
          billingMonth: options.billingMonth,
          billingYear: options.billingYear
        }) +
        '</div>';
      html += '<div class="statement-wrapper">';
      if (statements[i + 1]) {
        html += renderStatement(statements[i + 1], settings, {
          compact: true,
          billingMonth: options.billingMonth,
          billingYear: options.billingYear
        });
      }
      html += '</div></div>';
    }
    return html;
  }

  function fetchBillingData(api, token, accountId, month, year) {
    return fetch(
      api + '/api/waterworks/accounts/' + accountId + '/billing?month=' + month + '&year=' + year,
      { headers: { Authorization: 'Bearer ' + token } }
    ).then(function (r) {
      return r.json().then(function (d) {
        if (!r.ok) throw new Error(d.error || 'Failed');
        return d;
      });
    });
  }

  function fetchSettings(api, token) {
    return fetch(api + '/api/settings', {
      headers: { Authorization: 'Bearer ' + token }
    }).then(function (r) {
      return r.ok ? r.json() : {};
    }).catch(function () {
      return {};
    });
  }

  function fetchBillsList(api, token, params) {
    var qs = new URLSearchParams();
    Object.keys(params || {}).forEach(function (k) {
      if (params[k] !== undefined && params[k] !== null && params[k] !== '') {
        qs.set(k, String(params[k]));
      }
    });
    return fetch(api + '/api/waterworks/bills?' + qs.toString(), {
      headers: { Authorization: 'Bearer ' + token }
    }).then(function (r) {
      return r.json().then(function (d) {
        if (!r.ok) throw new Error(d.error || 'Failed to load bills');
        return d;
      });
    });
  }

  global.WaterworksBillingCommon = {
    MONTHS: MONTHS,
    resolveApiBase: resolveApiBase,
    fmt: fmt,
    esc: esc,
    renderStatement: renderStatement,
    renderBulkPages: renderBulkPages,
    fetchBillingData: fetchBillingData,
    fetchSettings: fetchSettings,
    fetchBillsList: fetchBillsList
  };
})(typeof window !== 'undefined' ? window : globalThis);
