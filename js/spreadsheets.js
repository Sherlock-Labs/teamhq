/**
 * Spreadsheets Page — list and reader views.
 *
 * Fetches data/spreadsheets/index.json, renders grouped list,
 * handles card clicks to load individual spreadsheet data and
 * instantiate TeamHQSpreadsheet in the reader view.
 */
(function () {
  'use strict';

  var listContainer = document.getElementById('spreadsheets-list');
  var listView = document.getElementById('spreadsheets-list-view');
  var readerView = document.getElementById('spreadsheets-reader-view');
  var statsEl = document.getElementById('spreadsheets-stats');

  if (!listContainer) return;

  // State
  var indexData = null;
  var expandedGroup = null;
  var activeSpreadsheet = null; // TeamHQSpreadsheet instance in reader view

  // --- Helpers ---

  function escapeHTML(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str || ''));
    return div.innerHTML;
  }

  function escapeAttr(str) {
    return (str || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    var d = new Date(dateStr);
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
  }

  function formatProjectName(projectId) {
    return projectId
      .split('-')
      .map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1); })
      .join(' ');
  }

  var tableIconSvg =
    '<svg class="spreadsheet-item__icon" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">' +
      '<rect x="1.5" y="1.5" width="13" height="13" rx="2" stroke="currentColor" stroke-width="1.2"/>' +
      '<line x1="1.5" y1="5.5" x2="14.5" y2="5.5" stroke="currentColor" stroke-width="1.2"/>' +
      '<line x1="6" y1="1.5" x2="6" y2="14.5" stroke="currentColor" stroke-width="1.2"/>' +
    '</svg>';

  // --- Rendering ---

  function renderStats() {
    if (!statsEl || !indexData) return;
    var projectIds = Object.keys(indexData);
    var totalSpreadsheets = 0;
    for (var i = 0; i < projectIds.length; i++) {
      totalSpreadsheets += indexData[projectIds[i]].length;
    }
    statsEl.textContent = totalSpreadsheets + ' spreadsheet' + (totalSpreadsheets !== 1 ? 's' : '') +
      ' across ' + projectIds.length + ' project' + (projectIds.length !== 1 ? 's' : '');
  }

  function renderList() {
    if (!indexData) return;
    var projectIds = Object.keys(indexData);

    if (projectIds.length === 0) {
      listContainer.innerHTML = '<p class="thq-spreadsheet-error">No spreadsheets yet.</p>';
      return;
    }

    var html = '';
    for (var i = 0; i < projectIds.length; i++) {
      html += renderGroup(projectIds[i], indexData[projectIds[i]]);
    }
    listContainer.innerHTML = html;

    // Restore expanded group
    if (expandedGroup) {
      var groupEl = listContainer.querySelector('[data-group="' + CSS.escape(expandedGroup) + '"]');
      if (groupEl) {
        var header = groupEl.querySelector('.spreadsheet-group__header');
        var body = groupEl.querySelector('.spreadsheet-group__body');
        header.setAttribute('aria-expanded', 'true');
        body.setAttribute('aria-hidden', 'false');
      }
    }
  }

  function renderGroup(projectId, spreadsheets) {
    var countLabel = spreadsheets.length + ' spreadsheet' + (spreadsheets.length !== 1 ? 's' : '');

    var itemsHtml = '';
    for (var i = 0; i < spreadsheets.length; i++) {
      itemsHtml += renderItem(projectId, spreadsheets[i]);
    }

    return (
      '<div class="spreadsheet-group" data-group="' + escapeAttr(projectId) + '">' +
        '<button class="spreadsheet-group__header" type="button" aria-expanded="false">' +
          '<span class="spreadsheet-group__name">' + escapeHTML(formatProjectName(projectId)) + '</span>' +
          '<span class="spreadsheet-group__count">' + escapeHTML(countLabel) + '</span>' +
          '<span class="spreadsheet-group__chevron" aria-hidden="true"></span>' +
        '</button>' +
        '<div class="spreadsheet-group__body" aria-hidden="true">' +
          '<div class="spreadsheet-group__body-inner">' +
            '<div class="spreadsheet-group__list">' +
              itemsHtml +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  function renderItem(projectId, meta) {
    var metaText = meta.rows + ' rows, ' + meta.columns + ' cols';
    var dateText = formatDate(meta.updatedAt);

    return (
      '<button class="spreadsheet-item" type="button"' +
        ' data-project="' + escapeAttr(projectId) + '"' +
        ' data-file="' + escapeAttr(meta.file) + '"' +
        ' data-name="' + escapeAttr(meta.name) + '"' +
        ' data-description="' + escapeAttr(meta.description || '') + '"' +
        ' data-rows="' + meta.rows + '"' +
        ' data-columns="' + meta.columns + '"' +
        ' data-updated="' + escapeAttr(meta.updatedAt || '') + '"' +
      '>' +
        tableIconSvg +
        '<span class="spreadsheet-item__info">' +
          '<span class="spreadsheet-item__name">' + escapeHTML(meta.name) + '</span>' +
          (meta.description ? '<span class="spreadsheet-item__desc">' + escapeHTML(meta.description) + '</span>' : '') +
        '</span>' +
        '<span class="spreadsheet-item__meta">' +
          '<span class="spreadsheet-item__meta-row">' + escapeHTML(metaText) + '</span>' +
          '<span class="spreadsheet-item__meta-row">' + escapeHTML(dateText) + '</span>' +
        '</span>' +
      '</button>'
    );
  }

  // --- View Toggle ---

  function showListView() {
    listView.style.display = '';
    readerView.style.display = 'none';
    if (activeSpreadsheet) {
      activeSpreadsheet.destroy();
      activeSpreadsheet = null;
    }
    window.location.hash = '';
  }

  function showReaderView() {
    listView.style.display = 'none';
    readerView.style.display = '';
  }

  // --- Reader View ---

  function openSpreadsheet(projectId, file, meta) {
    readerView.innerHTML = '<p class="thq-spreadsheet-loading">Loading spreadsheet...</p>';
    showReaderView();
    window.location.hash = 'view/' + projectId + '/' + file;

    fetch('data/spreadsheets/' + projectId + '/' + file)
      .then(function (res) {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then(function (data) {
        renderReaderView(data, meta);
        window.scrollTo(0, 0);
      })
      .catch(function () {
        readerView.innerHTML =
          '<div>' +
            '<button class="spreadsheets-reader__back" type="button">&larr; Back to list</button>' +
            '<p class="thq-spreadsheet-error" role="alert">Spreadsheet not found</p>' +
          '</div>';
      });
  }

  function renderReaderView(data, meta) {
    var density = TeamHQSpreadsheet.getSavedDensity();

    // Header
    var html = '<button class="spreadsheets-reader__back" type="button">&larr; Back to list</button>';
    html += '<h2 class="spreadsheets-reader__title">' + escapeHTML(data.name) + '</h2>';
    if (data.description) {
      html += '<p class="spreadsheets-reader__desc">' + escapeHTML(data.description) + '</p>';
    }

    // Metadata row + density toggle
    var metaParts = [];
    metaParts.push(data.rows.length + ' rows');
    metaParts.push(data.columns.length + ' columns');
    if (data.createdBy) {
      metaParts.push('Created by ' + data.createdBy.charAt(0).toUpperCase() + data.createdBy.slice(1));
    }
    if (data.updatedAt) {
      metaParts.push(formatDate(data.updatedAt));
    }

    html += '<div class="spreadsheets-reader__meta-row">';
    html += '<span class="spreadsheets-reader__meta">';
    for (var i = 0; i < metaParts.length; i++) {
      if (i > 0) html += '<span class="spreadsheets-reader__meta-sep">&middot;</span>';
      html += escapeHTML(metaParts[i]);
    }
    html += '</span>';
    html += '<div class="thq-spreadsheet-header__controls" role="group" aria-label="Table density">';
    html += '<button class="thq-density-toggle' + (density === 'compact' ? ' thq-density-toggle--active' : '') + '"' +
      ' type="button" data-density="compact" aria-pressed="' + (density === 'compact') + '">Compact</button>';
    html += '<button class="thq-density-toggle' + (density === 'comfortable' ? ' thq-density-toggle--active' : '') + '"' +
      ' type="button" data-density="comfortable" aria-pressed="' + (density === 'comfortable') + '">Comfortable</button>';
    html += '</div>';
    html += '</div>';

    // Grid container
    html += '<div id="spreadsheets-grid-container"></div>';

    readerView.innerHTML = html;

    // Instantiate grid
    var gridContainer = document.getElementById('spreadsheets-grid-container');
    activeSpreadsheet = new TeamHQSpreadsheet(gridContainer, data);

    // Wire density toggle
    readerView.addEventListener('click', function (e) {
      var btn = e.target.closest('.thq-density-toggle');
      if (!btn) return;
      var newDensity = btn.getAttribute('data-density');
      activeSpreadsheet.setDensity(newDensity);

      // Update button states
      var toggles = readerView.querySelectorAll('.thq-density-toggle');
      for (var i = 0; i < toggles.length; i++) {
        var isActive = toggles[i].getAttribute('data-density') === newDensity;
        toggles[i].classList.toggle('thq-density-toggle--active', isActive);
        toggles[i].setAttribute('aria-pressed', isActive ? 'true' : 'false');
      }
    });
  }

  // --- Expand/Collapse ---

  function toggleGroup(projectId) {
    if (expandedGroup === projectId) {
      collapseGroup(projectId);
      expandedGroup = null;
    } else {
      if (expandedGroup) {
        collapseGroup(expandedGroup);
      }
      expandGroup(projectId);
      expandedGroup = projectId;
    }
  }

  function expandGroup(projectId) {
    var groupEl = listContainer.querySelector('[data-group="' + CSS.escape(projectId) + '"]');
    if (!groupEl) return;
    var header = groupEl.querySelector('.spreadsheet-group__header');
    var body = groupEl.querySelector('.spreadsheet-group__body');
    header.setAttribute('aria-expanded', 'true');
    body.setAttribute('aria-hidden', 'false');
  }

  function collapseGroup(projectId) {
    var groupEl = listContainer.querySelector('[data-group="' + CSS.escape(projectId) + '"]');
    if (!groupEl) return;
    var header = groupEl.querySelector('.spreadsheet-group__header');
    var body = groupEl.querySelector('.spreadsheet-group__body');
    header.setAttribute('aria-expanded', 'false');
    body.setAttribute('aria-hidden', 'true');
  }

  // --- Event Handlers ---

  listContainer.addEventListener('click', function (e) {
    // Spreadsheet item click
    var item = e.target.closest('.spreadsheet-item');
    if (item) {
      openSpreadsheet(
        item.getAttribute('data-project'),
        item.getAttribute('data-file'),
        {
          name: item.getAttribute('data-name'),
          description: item.getAttribute('data-description'),
          rows: item.getAttribute('data-rows'),
          columns: item.getAttribute('data-columns'),
          updatedAt: item.getAttribute('data-updated')
        }
      );
      return;
    }

    // Group header click
    var header = e.target.closest('.spreadsheet-group__header');
    if (header) {
      var group = header.closest('.spreadsheet-group');
      if (group) {
        toggleGroup(group.getAttribute('data-group'));
      }
      return;
    }
  });

  // Reader view back button (delegated on readerView)
  readerView.addEventListener('click', function (e) {
    if (e.target.closest('.spreadsheets-reader__back')) {
      showListView();
    }
  });

  // --- Hash Routing ---

  function handleHash() {
    var hash = window.location.hash;
    if (!hash || !hash.startsWith('#view/')) return false;

    var parts = hash.slice(6).split('/');
    if (parts.length < 2) return false;

    var projectId = parts[0];
    var file = parts.slice(1).join('/');

    // Find metadata from index
    if (indexData && indexData[projectId]) {
      var sheets = indexData[projectId];
      for (var i = 0; i < sheets.length; i++) {
        if (sheets[i].file === file) {
          openSpreadsheet(projectId, file, sheets[i]);
          return true;
        }
      }
    }

    // No metadata available, open anyway
    openSpreadsheet(projectId, file, {});
    return true;
  }

  window.addEventListener('hashchange', function () {
    if (!window.location.hash || window.location.hash === '#') {
      showListView();
    } else {
      handleHash();
    }
  });

  // --- Init ---

  // Show skeleton loading
  listContainer.innerHTML =
    '<div class="thq-skeleton thq-skeleton--group"></div>' +
    '<div class="thq-skeleton thq-skeleton--group"></div>';

  fetch('data/spreadsheets/index.json')
    .then(function (res) {
      if (!res.ok) throw new Error('Failed to load index');
      return res.json();
    })
    .then(function (data) {
      indexData = data;
      renderStats();
      renderList();

      // Check if URL hash points to a specific spreadsheet
      if (!handleHash()) {
        showListView();
      }
    })
    .catch(function () {
      listContainer.innerHTML = '<p class="thq-spreadsheet-error">Unable to load spreadsheets</p>';
    });
})();
