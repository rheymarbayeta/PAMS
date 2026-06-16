/* Shared billing statement rendering for single and bulk views */
(function (global) {
  'use strict';

  var MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  function fmt(n) {
    return Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function periodLabel(m, y) {
    var lastDay = new Date(y, m, 0).getDate();
    return MONTHS[m - 1] + ' 1-' + lastDay + ', ' + y;
  }

  function dueDateLabel(d) {
    if (!d) return '—';
    var date = new Date(d);
    var month = MONTHS[date.getMonth()].substring(0, 3) + '.';
    var day = String(date.getDate()).padStart(2, '0');
    return month + ' ' + day + ', ' + date.getFullYear();
  }

  function esc(str) {
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(str || ''));
    return d.innerHTML;
  }

  function formatUnitStalls(units) {
    if (!units || units.length === 0) return 'N/A';
    return units
      .map(function (u) {
        return u.stall_number || 'N/A';
      })
      .join(', ');
  }

  function formatFloorLevels(units) {
    if (!units || units.length === 0) return 'N/A';
    var floors = [];
    var seen = {};
    units.forEach(function (u) {
      var floor = u.floor_level && String(u.floor_level).trim();
      if (floor && !seen[floor]) {
        seen[floor] = true;
        floors.push(floor);
      }
    });
    return floors.length > 0 ? floors.join(', ') : 'N/A';
  }

  function getLogoUrl(api, url) {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    if (url.startsWith('/api/')) return api + url;
    return url;
  }

  function parseHeaderSettings(api, settings) {
    return {
      logoLeftUrl: getLogoUrl(api, settings.assessment_header_logo_left?.value),
      logoRightUrl: getLogoUrl(api, settings.assessment_header_logo_right?.value),
      logoHeight: Math.max(20, Math.min(120, parseFloat(settings.assessment_header_logo_size?.value) || 40)),
      line1: settings.assessment_header_line_1?.value || 'REPUBLIC OF THE PHILIPPINES',
      line2: settings.assessment_header_line_2?.value || 'MUNICIPALITY OF DALAGUETE',
      line3: settings.assessment_header_line_3?.value || 'PROVINCE OF CEBU',
      line4: settings.assessment_header_line_4?.value || "MUNICIPAL TREASURER'S OFFICE",
      line5: settings.assessment_header_line_5?.value || '',
      fontSize: Math.max(7, Math.min(20, parseFloat(settings.assessment_header_font_size?.value) || 9))
    };
  }

  function parseBillingSurchargeSettings(settings) {
    var enabled = settings.billing_surcharge_enabled?.value !== 'false';
    var pct = parseFloat(settings.billing_surcharge_percentage?.value);
    if (!Number.isFinite(pct)) pct = 20;
    pct = Math.max(0, Math.min(100, pct));
    return { enabled: enabled, percentage: pct };
  }

  function resolveSurchargeConfig(billing, ctx) {
    if (billing && billing.surcharge_config) return billing.surcharge_config;
    if (ctx && ctx.surchargeConfig) return ctx.surchargeConfig;
    return { enabled: true, percentage: 20 };
  }

  function formatSurchargePercent(pct) {
    return Number(pct).toLocaleString('en-PH', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
  }

  function formatSurchargeLabel(pct) {
    return 'Surcharge (' + formatSurchargePercent(pct) + '%):';
  }

  function buildSurchargeNote(surchargeConfig) {
    if (!surchargeConfig || !surchargeConfig.enabled) return '';
    return (
      '<div class="bill-note">Note: ' +
      formatSurchargePercent(surchargeConfig.percentage) +
      '% surcharge for late payments.</div>'
    );
  }

  function loadBillingContext(api, token) {
    return Promise.all([
      fetch(api + '/api/settings', { headers: { Authorization: 'Bearer ' + token } }).then(function (r) {
        return r.ok ? r.json() : {};
      }),
      fetch(api + '/api/auth/me', { headers: { Authorization: 'Bearer ' + token } }).then(function (r) {
        return r.ok ? r.json() : {};
      })
    ]).then(function (results) {
      var settings = results[0];
      var userInfo = results[1];
      return {
        headerSettings: parseHeaderSettings(api, settings),
        treasurerName: settings.municipal_treasurer_name?.value || 'Municipal Treasurer',
        treasurerPosition: settings.municipal_treasurer_position?.value || 'Municipal Treasurer',
        treasurerSignatureUrl: getLogoUrl(api, settings.municipal_treasurer_signature?.value),
        currentUserName: userInfo.name || 'System',
        surchargeConfig: parseBillingSurchargeSettings(settings)
      };
    });
  }

  function fetchBillingData(api, token, contractId, month, year) {
    return fetch(
      api + '/api/rights-and-rentals/lease-contracts/' + contractId + '/billing?month=' + month + '&year=' + year,
      { headers: { Authorization: 'Bearer ' + token } }
    ).then(function (r) {
      if (!r.ok) {
        return r.json().then(function (e) {
          throw new Error(e.error || 'Error ' + r.status);
        });
      }
      return r.json();
    });
  }

  function buildHeaderHtml(headerSettings, compact) {
    var logoH = compact ? Math.round(headerSettings.logoHeight * 0.55) : headerSettings.logoHeight;
    var fs = compact ? Math.max(6, headerSettings.fontSize - 2) : headerSettings.fontSize;
    var gap = compact ? 6 : 12;

    var html =
      '<div style="text-align:center;margin-bottom:' +
      (compact ? 2 : 6) +
      'px;display:flex;justify-content:center;align-items:center;gap:' +
      gap +
      'px;">';

    if (headerSettings.logoLeftUrl) {
      html +=
        '<img src="' +
        headerSettings.logoLeftUrl +
        '" alt="Logo" style="height:' +
        logoH +
        'px;width:auto;object-fit:contain;">';
    }

    html += '<div style="text-align:center;line-height:' + (compact ? 1.15 : 1.3) + ';">';
    if (headerSettings.line1) {
      html += '<div style="font-size:' + fs + 'pt;font-weight:bold;">' + esc(headerSettings.line1) + '</div>';
    }
    if (headerSettings.line2) {
      html += '<div style="font-size:' + fs + 'pt;font-weight:bold;">' + esc(headerSettings.line2) + '</div>';
    }
    if (headerSettings.line3) {
      html += '<div style="font-size:' + fs + 'pt;font-weight:bold;">' + esc(headerSettings.line3) + '</div>';
    }
    if (headerSettings.line4) {
      html +=
        '<div style="font-size:' +
        Math.round(fs * 1.25) +
        'pt;font-weight:bold;margin-top:1px;">' +
        esc(headerSettings.line4) +
        '</div>';
    }
    if (headerSettings.line5) {
      html +=
        '<div style="font-size:' + fs + 'pt;font-weight:bold;margin-top:1px;">' + esc(headerSettings.line5) + '</div>';
    }
    html += '</div>';

    if (headerSettings.logoRightUrl) {
      html +=
        '<img src="' +
        headerSettings.logoRightUrl +
        '" alt="Logo 2" style="height:' +
        logoH +
        'px;width:auto;object-fit:contain;">';
    }

    html += '</div>';
    return html;
  }

  function paymentDateLabel(d) {
    if (!d) return '—';
    var raw = String(d);
    var dateOnly = raw.indexOf('T') >= 0 ? raw.split('T')[0] : raw;
    var parts = dateOnly.split('-');
    if (parts.length === 3) {
      var month = MONTHS[parseInt(parts[1], 10) - 1];
      if (month) {
        return month.substring(0, 3) + '. ' + parts[2] + ', ' + parts[0];
      }
    }
    var date = new Date(d);
    if (isNaN(date.getTime())) return '—';
    var monthName = MONTHS[date.getMonth()].substring(0, 3) + '.';
    var day = String(date.getDate()).padStart(2, '0');
    return monthName + ' ' + day + ', ' + date.getFullYear();
  }

  function getLatestPayment(side) {
    if (!side) return null;
    if (side.latest_payment) return side.latest_payment;
    if (side.late_payment_amount > 0 || side.late_payment_or) {
      return {
        or_number: side.late_payment_or || null,
        payment_date: null,
        amount_paid: side.late_payment_amount || 0
      };
    }
    return null;
  }

  function orDetailValue(payment, field) {
    if (!payment) return '—';
    if (field === 'or_number') return payment.or_number ? esc(payment.or_number) : '—';
    if (field === 'payment_date') return payment.payment_date ? paymentDateLabel(payment.payment_date) : '—';
    if (field === 'amount_paid') {
      return parseFloat(payment.amount_paid) > 0 ? '₱ ' + fmt(payment.amount_paid) : '—';
    }
    return '—';
  }

  function isShowLastPaymentEnabled(value) {
    if (value === true || value === 1) return true;
    if (typeof value === 'string') {
      var normalized = value.toLowerCase();
      return normalized === '1' || normalized === 'true' || normalized === 'yes';
    }
    return false;
  }

  function buildOrDetailRows(rightsPayment, rentalPayment) {
    return (
      '<tr>' +
      '<td colspan="4" class="or-section-head">Latest Payment</td>' +
      '<td class="rental-col or-section-head">Latest Payment</td>' +
      '</tr>' +
      '<tr>' +
      '<td colspan="2" class="monthly-label">OR Number:</td>' +
      '<td colspan="2" class="num">' +
      orDetailValue(rightsPayment, 'or_number') +
      '</td>' +
      '<td class="rental-col"><div class="rental-line"><span>OR Number:</span><span class="num">' +
      orDetailValue(rentalPayment, 'or_number') +
      '</span></div></td>' +
      '</tr>' +
      '<tr>' +
      '<td colspan="2" class="monthly-label">Date:</td>' +
      '<td colspan="2" class="num">' +
      orDetailValue(rightsPayment, 'payment_date') +
      '</td>' +
      '<td class="rental-col"><div class="rental-line"><span>Date:</span><span class="num">' +
      orDetailValue(rentalPayment, 'payment_date') +
      '</span></div></td>' +
      '</tr>' +
      '<tr>' +
      '<td colspan="2" class="monthly-label">Amount:</td>' +
      '<td colspan="2" class="num or-amount">' +
      orDetailValue(rightsPayment, 'amount_paid') +
      '</td>' +
      '<td class="rental-col"><div class="rental-line"><span>Amount:</span><span class="num or-amount">' +
      orDetailValue(rentalPayment, 'amount_paid') +
      '</span></div></td>' +
      '</tr>'
    );
  }

  function buildRightsRentalTableHtml(b, r, rn, compact, showLastPayment, surchargeConfig) {
    var prevMonthIdx = b.billing_month === 1 ? 11 : b.billing_month - 2;
    var prevYear = b.billing_month === 1 ? b.billing_year - 1 : b.billing_year;
    var monthName = MONTHS[b.billing_month - 1];
    var prevMonthName = MONTHS[prevMonthIdx];
    var tableClass = compact ? 'bill-table bill-table-compact' : 'bill-table';
    var rightsPayment = getLatestPayment(r);
    var rentalPayment = getLatestPayment(rn);
    surchargeConfig = surchargeConfig || resolveSurchargeConfig(b, null);

    var html =
      '<table class="' +
      tableClass +
      '">' +
      '<colgroup><col style="width:12.5%"><col style="width:12.5%"><col style="width:12.5%"><col style="width:12.5%"><col style="width:50%"></colgroup>' +
      '<thead>' +
      '<tr><th colspan="4" class="section-head">RIGHTS</th><th class="section-head">RENTAL</th></tr>' +
      '<tr><th>PRINCIPAL</th><th>DOWNPAYMENT</th><th>TOTAL<br>AMOUNT PAID</th><th>BALANCE</th><th class="rental-col">&nbsp;</th></tr>' +
      '</thead>' +
      '<tbody>' +
      '<tr>' +
      '<td class="num">₱ ' +
      fmt(r.principal) +
      '</td>' +
      '<td class="num">₱ ' +
      fmt(r.downpayment) +
      '</td>' +
      '<td class="num">₱ ' +
      fmt(r.total_paid) +
      '</td>' +
      '<td class="num">₱ ' +
      fmt(r.balance) +
      '</td>' +
      '<td class="rental-col"><div class="rental-line">' +
      '<span>BALANCE (' +
      prevMonthName.toUpperCase() +
      ' ' +
      prevYear +
      '):</span>' +
      '<span class="num">' +
      (rn.previous_balance > 0 ? '₱ ' + fmt(rn.previous_balance) : '-') +
      '</span>' +
      '</div></td>' +
      '</tr>' +
      '<tr>' +
      '<td colspan="3" class="monthly-label">Monthly Rights:</td>' +
      '<td class="num">₱ ' +
      fmt(r.monthly_amount) +
      '</td>' +
      '<td class="rental-col">' +
      (surchargeConfig.enabled
        ? '<div class="rental-line"><span>' +
          formatSurchargeLabel(surchargeConfig.percentage) +
          '</span><span class="num">' +
          (rn.surcharge > 0 ? '₱ ' + fmt(rn.surcharge) : '-') +
          '</span></div>'
        : '&nbsp;') +
      '</td>' +
      '</tr>' +
      '<tr>' +
      '<td colspan="3" class="dues-label">Dues (' +
      monthName +
      ' ' +
      b.billing_year +
      '):</td>' +
      '<td class="num dues-amount">₱ ' +
      fmt(r.dues) +
      '</td>' +
      '<td class="rental-col"><div class="rental-line">' +
      '<span>This Month (' +
      monthName +
      ' ' +
      b.billing_year +
      '):</span>' +
      '<span class="num">₱ ' +
      fmt(rn.this_month) +
      '</span>' +
      '</div></td>' +
      '</tr>' +
      (isShowLastPaymentEnabled(showLastPayment) ? buildOrDetailRows(rightsPayment, rentalPayment) : '') +
      '<tr><td colspan="4">&nbsp;</td>' +
      '<td class="rental-col"><div class="rental-line monthly-rental-line">' +
      '<span>Monthly Rental:</span><span class="num">₱ ' +
      fmt(rn.monthly_rental) +
      '</span>' +
      '</div></td>' +
      '</tr>' +
      '<tr><td colspan="4">&nbsp;</td>' +
      '<td class="rental-col"><div class="rental-line">' +
      '<span>Dues (' +
      monthName +
      ' ' +
      b.billing_year +
      '):</span>' +
      '<span class="num dues-amount">₱ ' +
      fmt(rn.dues) +
      '</span>' +
      '</div></td>' +
      '</tr>' +
      '</tbody>' +
      '</table>';

    return html;
  }

  function buildSignatoryHtml(ctx, compact) {
    var sigH = compact ? 28 : 45;
    var html = '<div class="bill-signatory">';
    if (ctx.treasurerSignatureUrl) {
      html +=
        '<img src="' +
        ctx.treasurerSignatureUrl +
        '" alt="E-Signature" style="height:' +
        sigH +
        'px;width:auto;max-width:160px;object-fit:contain;display:block;margin:0 0 2px auto;">';
    } else {
      html += '<div class="signatory-line"></div>';
    }
    html +=
      '<div class="signatory-name">' +
      esc(ctx.treasurerName) +
      '</div>' +
      '<div class="signatory-title">' +
      esc(ctx.treasurerPosition) +
      '</div></div>';
    return html;
  }

  /**
   * Render one billing statement as an HTML string.
   * @param {object} data - API response { contract, billing }
   * @param {object} ctx - { headerSettings, treasurerName, treasurerPosition, treasurerSignatureUrl? }
   * @param {{ compact?: boolean, showLastPayment?: boolean|string }} options - compact=true for A4 half-page bulk layout
   */
  function renderBillingStatement(data, ctx, options) {
    options = options || {};
    var compact = !!options.compact;
    var showLastPayment = isShowLastPaymentEnabled(options.showLastPayment);
    var c = data.contract;
    var b = data.billing;
    var r = b.rights;
    var rn = b.rental;

    var units = c.property_units && c.property_units.length > 0 ? c.property_units : [];
    var unitNo = formatUnitStalls(units);
    var floorLevel = formatFloorLevels(units);
    var surchargeConfig = resolveSurchargeConfig(b, ctx);

    var docClass = compact ? 'billing-doc billing-doc-compact' : 'billing-doc';
    var headerHtml = buildHeaderHtml(ctx.headerSettings, compact);

    var html =
      '<div class="' +
      docClass +
      '">' +
      headerHtml +
      '<hr style="border:none;border-top:1px solid #333;margin:' +
      (compact ? 2 : 4) +
      'px 0;">' +
      '<div class="bill-header-row">' +
      '<div class="bill-property">' +
      esc(c.property_name.toUpperCase()) +
      '</div>' +
      '<div class="bill-statement-no">BILLING STATEMENT No.<br>' +
      esc(b.billing_number) +
      '</div>' +
      '</div>' +
      '<div class="bill-location">' +
      esc(c.property_address || 'Dalaguete, Cebu') +
      '</div>' +
      '<div class="bill-period">As of ' +
      periodLabel(b.billing_month, b.billing_year) +
      '</div>' +
      '<div class="bill-lessee-section">' +
      '<div>' +
      esc(c.lessee_name.toUpperCase()) +
      '</div>' +
      '<div>SPACE No: ' +
      esc(unitNo) +
      '</div>' +
      '<div>FLOOR LEVEL: ' +
      esc(floorLevel) +
      '</div>' +
      '</div>' +
      '<div class="bill-total-box">' +
      '<span class="bill-total-label">TOTAL AMOUNT DUE:</span>' +
      '<span class="bill-total-value">₱ ' +
      fmt(b.total_due) +
      '</span>' +
      '</div>' +
      '<div class="bill-due-section">' +
      '<span class="bill-due-label">PAYMENT DUE DATE:</span>' +
      '<span>' +
      dueDateLabel(b.payment_due_date) +
      '</span>' +
      '</div>' +
      buildSurchargeNote(surchargeConfig) +
      buildRightsRentalTableHtml(b, r, rn, compact, showLastPayment, surchargeConfig) +
      buildSignatoryHtml(ctx, compact) +
      '<div class="bill-footer">** This is an electronically generated statement of account.</div>' +
      '</div>';

    return html;
  }

  function renderBulkPages(statements, ctx, options) {
    options = options || {};
    var renderOptions = {
      compact: true,
      showLastPayment: options.showLastPayment
    };
    var html = '';
    for (var i = 0; i < statements.length; i += 2) {
      html += '<div class="bulk-page">';
      html +=
        '<div class="statement-wrapper">' +
        renderBillingStatement(statements[i], ctx, renderOptions) +
        '</div>';
      html += '<div class="statement-wrapper">';
      if (i + 1 < statements.length) {
        html += renderBillingStatement(statements[i + 1], ctx, renderOptions);
      }
      html += '</div></div>';
    }
    return html;
  }

  global.BillingCommon = {
    MONTHS: MONTHS,
    fmt: fmt,
    periodLabel: periodLabel,
    dueDateLabel: dueDateLabel,
    esc: esc,
    formatUnitStalls: formatUnitStalls,
    formatFloorLevels: formatFloorLevels,
    loadBillingContext: loadBillingContext,
    fetchBillingData: fetchBillingData,
    paymentDateLabel: paymentDateLabel,
    parseBillingSurchargeSettings: parseBillingSurchargeSettings,
    resolveSurchargeConfig: resolveSurchargeConfig,
    formatSurchargeLabel: formatSurchargeLabel,
    buildSurchargeNote: buildSurchargeNote,
    isShowLastPaymentEnabled: isShowLastPaymentEnabled,
    getLatestPayment: getLatestPayment,
    buildOrDetailRows: buildOrDetailRows,
    buildSignatoryHtml: buildSignatoryHtml,
    buildRightsRentalTableHtml: buildRightsRentalTableHtml,
    renderBillingStatement: renderBillingStatement,
    renderBulkPages: renderBulkPages
  };
})(typeof window !== 'undefined' ? window : this);
