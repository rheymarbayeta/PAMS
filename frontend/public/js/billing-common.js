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
        currentUserName: userInfo.name || 'System'
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

  /**
   * Render one billing statement as an HTML string.
   * @param {object} data - API response { contract, billing }
   * @param {object} ctx - { headerSettings, treasurerName, treasurerPosition }
   * @param {{ compact?: boolean }} options - compact=true for A4 half-page bulk layout
   */
  function renderBillingStatement(data, ctx, options) {
    options = options || {};
    var compact = !!options.compact;
    var c = data.contract;
    var b = data.billing;
    var rn = b.rental;

    var prevMonthIdx = b.billing_month === 1 ? 11 : b.billing_month - 2;
    var prevYear = b.billing_month === 1 ? b.billing_year - 1 : b.billing_year;

    var unit = c.property_units && c.property_units.length > 0 ? c.property_units[0] : null;
    var unitNo = unit ? unit.stall_number || 'N/A' : 'N/A';

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
      '<div class="bill-note">Note: 20% surcharge for late payments.</div>' +
      '<div class="bill-section-title">M O N T H L Y &nbsp;&nbsp;R E N T A L S</div>' +
      '<table class="bill-rental-table">' +
      '<tr><td class="bill-rental-label">BALANCE (' +
      MONTHS[prevMonthIdx].toUpperCase() +
      ' ' +
      prevYear +
      '):</td><td class="bill-rental-value">₱ ' +
      fmt(rn.previous_balance) +
      '</td></tr>' +
      '<tr><td class="bill-rental-label">Surcharge (20%)</td><td class="bill-rental-value">₱ ' +
      fmt(rn.surcharge) +
      '</td></tr>' +
      '<tr><td class="bill-rental-label">This Month (' +
      MONTHS[b.billing_month - 1].toUpperCase() +
      ' ' +
      b.billing_year +
      '):</td><td class="bill-rental-value">₱ ' +
      fmt(rn.this_month) +
      '</td></tr>' +
      '<tr><td class="bill-rental-label"><div style="margin-left:' +
      (compact ? 8 : 16) +
      'px;">Less: Late Payment</div></td><td class="bill-rental-value"></td></tr>';

    if (rn.late_payment_or) {
      html +=
        '<tr><td class="bill-rental-label"><div style="margin-left:' +
        (compact ? 16 : 32) +
        'px;">with OR#' +
        esc(rn.late_payment_or) +
        '</div></td><td class="bill-rental-value">₱ ' +
        fmt(rn.late_payment_amount) +
        '</td></tr>';
    }

    html +=
      '<tr><td class="bill-rental-label">Monthly Rental:</td><td class="bill-rental-value">₱ ' +
      fmt(rn.monthly_rental) +
      '</td></tr>' +
      '<tr><td class="bill-rental-label"><strong>Dues (' +
      MONTHS[b.billing_month - 1].toUpperCase() +
      ' ' +
      b.billing_year +
      '):</strong></td><td class="bill-rental-value"><strong>₱ ' +
      fmt(rn.dues) +
      '</strong></td></tr>' +
      '</table>' +
      '<div class="bill-signatory">' +
      '<div class="signatory-line"></div>' +
      '<div class="signatory-name">' +
      esc(ctx.treasurerName) +
      '</div>' +
      '<div class="signatory-title">' +
      esc(ctx.treasurerPosition) +
      '</div>' +
      '</div>' +
      '<div class="bill-footer">** This is an electronically generated statement of account.</div>' +
      '</div>';

    return html;
  }

  function renderBulkPages(statements, ctx) {
    var html = '';
    for (var i = 0; i < statements.length; i += 2) {
      html += '<div class="bulk-page">';
      html +=
        '<div class="statement-wrapper">' +
        renderBillingStatement(statements[i], ctx, { compact: true }) +
        '</div>';
      if (i + 1 < statements.length) {
        html +=
          '<div class="statement-wrapper">' +
          renderBillingStatement(statements[i + 1], ctx, { compact: true }) +
          '</div>';
      }
      html += '</div>';
    }
    return html;
  }

  global.BillingCommon = {
    MONTHS: MONTHS,
    fmt: fmt,
    periodLabel: periodLabel,
    dueDateLabel: dueDateLabel,
    esc: esc,
    loadBillingContext: loadBillingContext,
    fetchBillingData: fetchBillingData,
    renderBillingStatement: renderBillingStatement,
    renderBulkPages: renderBulkPages
  };
})(typeof window !== 'undefined' ? window : this);
