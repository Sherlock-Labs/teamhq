/**
 * TeamHQSpreadsheet — adapter between TeamHQ JSON schema and AG Grid Community.
 *
 * Converts our JSON spreadsheet format (columns with key/label/type + rows as
 * key-value objects) into AG Grid columnDefs/rowData config. Provides density
 * toggling, sticky first column via CSS, and graceful CDN failure degradation.
 *
 * Depends on: AG Grid Community v34 UMD bundle (agGrid global)
 */
(function () {
  'use strict';

  // --- CDN Failure Guard ---
  if (typeof agGrid === 'undefined') {
    console.warn('AG Grid not loaded — spreadsheet features unavailable');
    window.TeamHQSpreadsheet = function () {};
    window.TeamHQSpreadsheet.prototype.destroy = function () {};
    window.TeamHQSpreadsheet.prototype.setDensity = function () {};
    window.TeamHQSpreadsheet.convertColumn = function () { return {}; };
    window.TeamHQSpreadsheet.getSavedDensity = function () { return 'comfortable'; };
    window.TeamHQSpreadsheet.saveDensity = function () {};
    return;
  }

  // --- Sort Comparators (nulls last) ---

  function numericComparator(a, b) {
    if (a == null && b == null) return 0;
    if (a == null) return 1;
    if (b == null) return -1;
    return a - b;
  }

  function textComparator(a, b) {
    if (a == null && b == null) return 0;
    if (a == null) return 1;
    if (b == null) return -1;
    return String(a).localeCompare(String(b));
  }

  function dateComparator(a, b) {
    if (a == null && b == null) return 0;
    if (a == null) return 1;
    if (b == null) return -1;
    return new Date(a).getTime() - new Date(b).getTime();
  }

  // --- Value Formatters ---

  function numberFormatter(params) {
    if (params.value == null) return '--';
    try {
      return Number(params.value).toLocaleString();
    } catch (e) {
      return String(params.value);
    }
  }

  function currencyFormatter(prefix) {
    return function (params) {
      if (params.value == null) return '--';
      try {
        return prefix + Number(params.value).toLocaleString(undefined, {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        });
      } catch (e) {
        return String(params.value);
      }
    };
  }

  function percentFormatter(params) {
    if (params.value == null) return '--';
    try {
      return Number(params.value).toFixed(1) + '%';
    } catch (e) {
      return String(params.value);
    }
  }

  function dateFormatter(params) {
    if (params.value == null) return '--';
    try {
      var d = new Date(params.value);
      var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      return months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
    } catch (e) {
      return String(params.value);
    }
  }

  // --- Badge Cell Renderer ---

  function badgeColorClass(value) {
    switch (value) {
      case 'high': case 'critical':
        return 'thq-badge--error';
      case 'medium': case 'warning':
        return 'thq-badge--warning';
      case 'low': case 'info':
        return 'thq-badge--accent';
      case 'yes': case 'true': case 'included':
        return 'thq-badge--success';
      case 'no': case 'false': case 'excluded':
        return 'thq-badge--muted';
      default:
        return 'thq-badge--neutral';
    }
  }

  function badgeCellRenderer(params) {
    if (params.value == null) return '--';
    var value = String(params.value).toLowerCase();
    var colorClass = badgeColorClass(value);
    var span = document.createElement('span');
    span.className = 'thq-badge ' + colorClass;
    span.textContent = params.value;
    return span;
  }

  // --- Null Cell Class Rules ---

  function nullCellClass(params) {
    if (params.value == null) return 'thq-cell--null';
    return '';
  }

  // --- Column Converter ---

  function convertColumn(col) {
    var def = {
      field: col.key,
      headerName: col.label,
      sortable: true,
      resizable: false,
      cellClassRules: {
        'thq-cell--null': function (params) { return params.value == null; }
      }
    };

    switch (col.type) {
      case 'number':
        def.type = 'rightAligned';
        def.valueFormatter = numberFormatter;
        def.comparator = numericComparator;
        def.cellClass = 'thq-cell--mono';
        break;

      case 'currency':
        def.type = 'rightAligned';
        def.valueFormatter = currencyFormatter(col.prefix || '$');
        def.comparator = numericComparator;
        def.cellClass = 'thq-cell--mono';
        break;

      case 'percent':
        def.type = 'rightAligned';
        def.valueFormatter = percentFormatter;
        def.comparator = numericComparator;
        def.cellClass = 'thq-cell--mono';
        break;

      case 'date':
        def.valueFormatter = dateFormatter;
        def.comparator = dateComparator;
        def.cellClass = 'thq-cell--date';
        break;

      case 'badge':
        def.cellRenderer = badgeCellRenderer;
        def.comparator = textComparator;
        break;

      case 'text':
      default:
        def.comparator = textComparator;
        break;
    }

    return def;
  }

  // --- TeamHQSpreadsheet Constructor ---

  /**
   * @param {HTMLElement} container - DOM element to mount the grid into
   * @param {Object} data - spreadsheet JSON (our schema)
   * @param {Object} [options] - optional config
   * @param {string} [options.density] - 'compact' or 'comfortable' (default)
   * @param {number} [options.height] - explicit height in px (default: auto-height)
   */
  function TeamHQSpreadsheet(container, data, options) {
    options = options || {};
    this.container = container;
    this.data = data;
    this.density = options.density || TeamHQSpreadsheet.getSavedDensity();

    // Build AG Grid config
    var columnDefs = data.columns.map(convertColumn);
    var gridOptions = {
      columnDefs: columnDefs,
      rowData: data.rows,
      defaultColDef: {
        sortable: true,
        resizable: false,
        suppressMovable: true
      },
      domLayout: options.height ? 'normal' : 'autoHeight',
      suppressHorizontalScroll: false,
      suppressColumnVirtualisation: true,
      animateRows: false,
      rowSelection: undefined,
      headerHeight: this.density === 'compact' ? 32 : 40,
      rowHeight: this.density === 'compact' ? 32 : 40,
      suppressCellFocus: true,
      enableCellTextSelection: true,
      overlayNoRowsTemplate: '<span class="thq-no-rows">No data available</span>'
    };

    // Create wrapper with theme class
    this.wrapperEl = document.createElement('div');
    this.wrapperEl.className = 'thq-spreadsheet-wrapper';

    var gridEl = document.createElement('div');
    gridEl.className = 'thq-spreadsheet ag-theme-quartz thq-density--' + this.density;
    if (options.height) {
      gridEl.style.height = options.height + 'px';
    }
    this.gridEl = gridEl;
    this.wrapperEl.appendChild(gridEl);
    container.appendChild(this.wrapperEl);

    // Create the AG Grid instance
    this.gridApi = agGrid.createGrid(gridEl, gridOptions);

    // Scroll tracking for sticky column shadow and scroll-hint
    this._onScroll = this._handleScroll.bind(this);
    this._checkOverflow();

    // Observe resize to detect overflow changes
    var self = this;
    if (typeof ResizeObserver !== 'undefined') {
      this._resizeObserver = new ResizeObserver(function () {
        self._checkOverflow();
      });
      this._resizeObserver.observe(this.wrapperEl);
    }
  }

  // --- Prototype Methods ---

  TeamHQSpreadsheet.prototype._handleScroll = function () {
    var viewport = this.gridEl.querySelector('.ag-body-horizontal-scroll-viewport, .ag-body-viewport');
    if (!viewport) return;
    var scrollLeft = viewport.scrollLeft;
    var scrollWidth = viewport.scrollWidth;
    var clientWidth = viewport.clientWidth;

    // Toggle scrolled class for sticky column shadow
    if (scrollLeft > 0) {
      this.gridEl.classList.add('thq-spreadsheet--scrolled');
    } else {
      this.gridEl.classList.remove('thq-spreadsheet--scrolled');
    }

    // Toggle overflow class for scroll-hint shadow
    if (scrollLeft + clientWidth >= scrollWidth - 1) {
      this.wrapperEl.classList.remove('thq-spreadsheet-wrapper--has-overflow');
    } else if (scrollWidth > clientWidth) {
      this.wrapperEl.classList.add('thq-spreadsheet-wrapper--has-overflow');
    }
  };

  TeamHQSpreadsheet.prototype._checkOverflow = function () {
    // Defer to allow AG Grid to finish rendering
    var self = this;
    setTimeout(function () {
      var viewport = self.gridEl.querySelector('.ag-body-horizontal-scroll-viewport, .ag-body-viewport');
      if (!viewport) return;

      // Attach scroll listener if not yet done
      if (!self._scrollBound) {
        viewport.addEventListener('scroll', self._onScroll, { passive: true });
        self._scrollBound = true;
        self._scrollViewport = viewport;
      }

      // Initial overflow check
      if (viewport.scrollWidth > viewport.clientWidth) {
        self.wrapperEl.classList.add('thq-spreadsheet-wrapper--has-overflow');
      } else {
        self.wrapperEl.classList.remove('thq-spreadsheet-wrapper--has-overflow');
      }
    }, 100);
  };

  TeamHQSpreadsheet.prototype.setDensity = function (density) {
    this.density = density;
    this.gridEl.className = 'thq-spreadsheet ag-theme-quartz thq-density--' + density;
    this.gridApi.updateGridOptions({
      rowHeight: density === 'compact' ? 32 : 40,
      headerHeight: density === 'compact' ? 32 : 40
    });
    TeamHQSpreadsheet.saveDensity(density);
  };

  TeamHQSpreadsheet.prototype.destroy = function () {
    if (this._scrollViewport) {
      this._scrollViewport.removeEventListener('scroll', this._onScroll);
    }
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
    }
    if (this.gridApi) {
      this.gridApi.destroy();
      this.gridApi = null;
    }
  };

  // --- Static Methods ---

  TeamHQSpreadsheet.convertColumn = convertColumn;

  TeamHQSpreadsheet.getSavedDensity = function () {
    try { return localStorage.getItem('thq-table-density') || 'comfortable'; }
    catch (e) { return 'comfortable'; }
  };

  TeamHQSpreadsheet.saveDensity = function (density) {
    try { localStorage.setItem('thq-table-density', density); }
    catch (e) { /* localStorage unavailable */ }
  };

  // --- Export ---

  window.TeamHQSpreadsheet = TeamHQSpreadsheet;
})();
