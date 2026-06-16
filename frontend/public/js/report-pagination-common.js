/* Shared report table pagination — conservative row heights + multi-pass validation */
(function (global) {
  'use strict';

  var ROW_HEIGHT_FUDGE = 1.1;
  var DEFAULT_SAFETY_PX = 72;

  function createGeometry(opts) {
    return {
      usableH: opts.usableH,
      firstHdrH: opts.firstHdrH,
      contHdrH: opts.contHdrH,
      theadH: opts.theadH != null ? opts.theadH : 28,
      safetyPx: opts.safetyPx != null ? opts.safetyPx : DEFAULT_SAFETY_PX,
      rowFudge: opts.rowFudge != null ? opts.rowFudge : ROW_HEIGHT_FUDGE
    };
  }

  function availH(geo, isFirst, reserveH) {
    return geo.usableH
      - (isFirst ? geo.firstHdrH : geo.contHdrH)
      - geo.theadH
      - reserveH
      - geo.safetyPx;
  }

  function adjustedHeight(geo, rowHeights, idx) {
    return Math.ceil((rowHeights[idx] || 28) * geo.rowFudge) + 2;
  }

  function adjustedItemHeight(geo, h) {
    return Math.ceil((h || 28) * geo.rowFudge) + 2;
  }

  function countFitting(geo, rowHeights, startIdx, rowCount, cap) {
    var used = 0;
    var fit = 0;
    for (var j = 0; j < rowCount; j++) {
      var h = adjustedHeight(geo, rowHeights, startIdx + j);
      if (fit > 0 && used + h > cap) break;
      used += h;
      fit++;
    }
    return fit;
  }

  function splitPageAt(page, fitCount, pages, pageIndex, rowsKey) {
    rowsKey = rowsKey || 'rows';
    var rows = page[rowsKey];
    if (!rows || fitCount <= 0 || fitCount >= rows.length) return false;
    var overflow = rows.splice(fitCount);
    var newPage = { isFirst: false };
    newPage[rowsKey] = overflow;
    if (Object.prototype.hasOwnProperty.call(page, 'startIdx')) {
      newPage.startIdx = page.startIdx + fitCount;
    }
    pages.splice(pageIndex + 1, 0, newPage);
    return true;
  }

  /**
   * Paginate indexed row arrays using measured heights.
   * pages[].rows + pages[].startIdx
   */
  function paginateIndexedRows(rows, rowHeights, reserveH, geo) {
    if (rows.length === 0) return [{ isFirst: true, rows: [], startIdx: 0 }];

    var pages = [];
    var i = 0;
    while (i < rows.length) {
      var isFirst = pages.length === 0;
      var cap = availH(geo, isFirst, 0);
      var startIdx = i;
      var fit = countFitting(geo, rowHeights, startIdx, rows.length - startIdx, cap);
      if (fit === 0) fit = 1;
      pages.push({ isFirst: isFirst, rows: rows.slice(i, i + fit), startIdx: startIdx });
      i += fit;
    }

    var p = 0;
    while (p < pages.length) {
      var page = pages[p];
      if (p < pages.length - 1) {
        var pageCap = availH(geo, page.isFirst, 0);
        var pageFit = countFitting(geo, rowHeights, page.startIdx, page.rows.length, pageCap);
        if (pageFit < page.rows.length) {
          if (pageFit === 0) pageFit = 1;
          splitPageAt(page, pageFit, pages, p, 'rows');
          continue;
        }
      }
      p++;
    }

    var guard = 0;
    while (guard++ < pages.length + 10) {
      var last = pages[pages.length - 1];
      var lastCap = availH(geo, last.isFirst, reserveH);
      var lastFit = countFitting(geo, rowHeights, last.startIdx, last.rows.length, lastCap);
      if (lastFit >= last.rows.length) break;
      if (lastFit === 0) lastFit = 1;
      splitPageAt(last, lastFit, pages, pages.length - 1, 'rows');
    }

    return pages;
  }

  /**
   * Paginate flat items that expose a numeric `.h` height (grouped layouts).
   * pages[].items
   */
  function paginateFlatItems(items, reserveH, geo, orphanCheck) {
    if (items.length === 0) return [{ isFirst: true, items: [] }];

    function itemHeight(item) {
      return adjustedItemHeight(geo, item.h);
    }

    function countItemFitting(startIdx, count, cap, pageItems) {
      var used = 0;
      var fit = 0;
      for (var j = 0; j < count; j++) {
        var idx = startIdx + j;
        var item = items[idx];
        var h = itemHeight(item);
        if (orphanCheck && orphanCheck(items, idx, fit, used, cap, h, pageItems)) break;
        if (fit > 0 && used + h > cap) break;
        used += h;
        fit++;
      }
      return fit;
    }

    var pages = [];
    var i = 0;
    while (i < items.length) {
      var isFirst = pages.length === 0;
      var cap = availH(geo, isFirst, 0);
      var fit = countItemFitting(i, items.length - i, cap, []);
      if (fit === 0) fit = 1;
      pages.push({ isFirst: isFirst, items: items.slice(i, i + fit) });
      i += fit;
    }

    var p = 0;
    while (p < pages.length) {
      var page = pages[p];
      if (p < pages.length - 1) {
        var startIdx = 0;
        for (var k = 0; k < p; k++) startIdx += pages[k].items.length;
        var pageCap = availH(geo, page.isFirst, 0);
        var pageFit = countItemFitting(startIdx, page.items.length, pageCap, page.items);
        if (pageFit < page.items.length) {
          if (pageFit === 0) pageFit = 1;
          splitPageAt(page, pageFit, pages, p, 'items');
          continue;
        }
      }
      p++;
    }

    var guard = 0;
    while (guard++ < pages.length + 10) {
      var last = pages[pages.length - 1];
      var lastStart = 0;
      for (var m = 0; m < pages.length - 1; m++) lastStart += pages[m].items.length;
      var lastCap = availH(geo, last.isFirst, reserveH);
      var lastFit = countItemFitting(lastStart, last.items.length, lastCap, last.items);
      if (lastFit >= last.items.length) break;
      if (lastFit === 0) lastFit = 1;
      splitPageAt(last, lastFit, pages, pages.length - 1, 'items');
    }

    return pages;
  }

  /**
   * Measure tbody row heights in a hidden table at page content width.
   */
  function measureTableRowHeights(opts) {
    var rows = opts.rows || [];
    var tableClass = opts.tableClass || '';
    var tableWidth = opts.tableWidth || '7.5in';
    var theadHTML = opts.theadHTML || '';
    var rowHTMLFn = opts.rowHTMLFn;

    return new Promise(function (resolve) {
      if (rows.length === 0) { resolve([]); return; }

      var wrap = document.createElement('div');
      wrap.style.cssText = 'position:absolute;top:-99999px;left:0;width:' + tableWidth
        + ';visibility:hidden;pointer-events:none;';

      var tbl = document.createElement('table');
      if (tableClass) tbl.className = tableClass;
      tbl.style.width = '100%';

      if (theadHTML) {
        var thead = document.createElement('thead');
        thead.innerHTML = theadHTML;
        tbl.appendChild(thead);
      }

      var tbody = document.createElement('tbody');
      rows.forEach(function (row, i) {
        var tr = document.createElement('tr');
        tr.innerHTML = rowHTMLFn(row, i);
        tbody.appendChild(tr);
      });
      tbl.appendChild(tbody);
      wrap.appendChild(tbl);
      document.body.appendChild(wrap);

      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          var heights = Array.from(tbody.querySelectorAll('tr')).map(function (tr) {
            return tr.getBoundingClientRect().height || tr.offsetHeight || 28;
          });
          document.body.removeChild(wrap);
          resolve(heights);
        });
      });
    });
  }

  /**
   * Split overflowing document pages by moving trailing sections to continuation pages.
   */
  function paginateDocumentPages(opts) {
    opts = opts || {};
    var firstId = opts.firstPageId || 'page-1';
    var pageClass = opts.pageClass || 'page';
    var minChildren = opts.minChildren != null ? opts.minChildren : 2;
    var updateFn = opts.updatePageNumbers;

    document.querySelectorAll('.' + pageClass + ':not(#' + firstId + ')').forEach(function (p) {
      p.remove();
    });

    var guard = 0;
    while (guard++ < 100) {
      var pages = document.querySelectorAll('.' + pageClass);
      var changed = false;

      for (var pi = 0; pi < pages.length; pi++) {
        var page = pages[pi];
        if (page.scrollHeight <= page.clientHeight + 2) continue;

        var content = page.querySelector('.page-content');
        if (!content) continue;

        var movable = Array.from(content.children).filter(function (el) {
          return !el.classList.contains('continuation-header');
        });
        if (movable.length < minChildren) continue;

        var node = movable[movable.length - 1];
        var nodeHTML = node.outerHTML;
        node.remove();

        var footer = page.querySelector('.page-footer');
        var footerHTML = footer ? footer.innerHTML : '';
        var nextNum = document.querySelectorAll('.' + pageClass).length + 1;
        var existingNext = document.getElementById('page-' + nextNum);

        if (existingNext) {
          var nextContent = existingNext.querySelector('.page-content');
          if (nextContent) nextContent.insertAdjacentHTML('beforeend', nodeHTML);
        } else {
          page.insertAdjacentHTML('afterend',
            '<div class="' + pageClass + '" id="page-' + nextNum + '">' +
            '<div class="page-content">' +
            '<div class="continuation-header"><h3>— Continuation —</h3></div>' +
            nodeHTML +
            '</div>' +
            (footerHTML ? '<div class="page-footer">' + footerHTML + '</div>' : '') +
            '</div>'
          );
        }

        changed = true;
        break;
      }

      if (!changed) break;
    }

    if (typeof updateFn === 'function') updateFn();
  }

  global.ReportPaginationCommon = {
    ROW_HEIGHT_FUDGE: ROW_HEIGHT_FUDGE,
    DEFAULT_SAFETY_PX: DEFAULT_SAFETY_PX,
    createGeometry: createGeometry,
    availH: availH,
    adjustedHeight: adjustedHeight,
    adjustedItemHeight: adjustedItemHeight,
    countFitting: countFitting,
    paginateIndexedRows: paginateIndexedRows,
    paginateFlatItems: paginateFlatItems,
    measureTableRowHeights: measureTableRowHeights,
    paginateDocumentPages: paginateDocumentPages
  };
})(typeof window !== 'undefined' ? window : this);
