(function () {
  'use strict';

  var API_BASE = '/api/docs';

  var docsContainer = document.getElementById('docs-list');
  var listView = document.getElementById('docs-list-view');
  var readerView = document.getElementById('docs-reader-view');
  var statsEl = document.getElementById('docs-stats');

  if (!docsContainer) return;

  // State
  var groups = [];
  var summary = null;
  var expandedGroup = null;

  // --- API ---

  function apiGetDocs() {
    return fetch(API_BASE)
      .then(function (res) {
        if (!res.ok) throw new Error('Failed to load docs');
        return res.json();
      });
  }

  function apiGetDoc(path) {
    return fetch(API_BASE + '/' + path.split('/').map(encodeURIComponent).join('/'))
      .then(function (res) {
        if (!res.ok) throw new Error('Failed to load doc');
        return res.text();
      });
  }

  // --- Helpers ---

  function escapeHTML(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  function escapeAttr(str) {
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function formatDateShort(dateStr) {
    if (!dateStr) return '';
    var d = new Date(dateStr);
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return months[d.getMonth()] + ' ' + d.getDate();
  }

  function formatDateLong(dateStr) {
    if (!dateStr) return '';
    var d = new Date(dateStr);
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
  }

  function badgeClass(type) {
    switch (type) {
      case 'requirements':
      case 'tech-approach':
      case 'design-spec':
      case 'research':
      case 'qa-report':
      case 'qa-findings':
      case 'backend-analysis':
      case 'adr':
        return 'doc-item__badge--' + type;
      default:
        return 'doc-item__badge--other';
    }
  }

  // --- Rendering ---

  function renderStats() {
    if (!statsEl || !summary) return;
    var totalDocs = summary.totalDocs || 0;
    var totalProjects = summary.totalProjects || 0;
    statsEl.textContent = totalDocs + ' document' + (totalDocs !== 1 ? 's' : '') +
      ' across ' + totalProjects + ' project' + (totalProjects !== 1 ? 's' : '');
  }

  function renderList() {
    if (groups.length === 0) {
      docsContainer.innerHTML =
        '<div class="docs__empty">' +
          '<p class="docs__empty-text">No docs yet.</p>' +
        '</div>';
      return;
    }

    docsContainer.innerHTML = groups.map(renderGroup).join('');

    if (expandedGroup) {
      var groupEl = docsContainer.querySelector('[data-group="' + CSS.escape(expandedGroup) + '"]');
      if (groupEl) {
        var header = groupEl.querySelector('.doc-group__header');
        var body = groupEl.querySelector('.doc-group__body');
        header.setAttribute('aria-expanded', 'true');
        body.setAttribute('aria-hidden', 'false');
      }
    }
  }

  function renderGroup(group) {
    var isAdr = group.project === 'adrs';
    var adrClass = isAdr ? ' doc-group--adr' : '';
    var docCount = group.docCount || group.docs.length;
    var countLabel = docCount + ' doc' + (docCount !== 1 ? 's' : '');

    var docsHtml = '';
    for (var i = 0; i < group.docs.length; i++) {
      docsHtml += renderDocItem(group.docs[i]);
    }

    return (
      '<div class="doc-group' + adrClass + '" data-group="' + escapeAttr(group.project) + '">' +
        '<button class="doc-group__header" type="button" aria-expanded="false">' +
          '<span class="doc-group__name">' + escapeHTML(group.label) + '</span>' +
          '<span class="doc-group__count">' + escapeHTML(countLabel) + '</span>' +
          '<span class="doc-group__chevron" aria-hidden="true"></span>' +
        '</button>' +
        '<div class="doc-group__body" aria-hidden="true">' +
          '<div class="doc-group__body-inner">' +
            '<div class="doc-group__list">' +
              docsHtml +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  function renderDocItem(doc) {
    var typeLabel = doc.typeLabel || doc.type || 'Doc';
    var authorHtml = '';
    if (doc.author) {
      authorHtml =
        '<span class="doc-item__author">' +
          '<img class="doc-item__avatar" src="' + escapeAttr(doc.author.avatar) + '" alt="" width="18" height="18">' +
          '<span class="doc-item__author-name">' + escapeHTML(doc.author.name) + '</span>' +
        '</span>';
    }

    var readingTimeHtml = '';
    if (doc.readingTime) {
      readingTimeHtml = '<span class="doc-item__reading-time">~' + doc.readingTime + ' min</span>';
    }

    return (
      '<button class="doc-item" type="button"' +
        ' data-path="' + escapeAttr(doc.path) + '"' +
        ' data-type="' + escapeAttr(doc.type) + '"' +
        ' data-title="' + escapeAttr(doc.title) + '"' +
        ' data-type-label="' + escapeAttr(typeLabel) + '"' +
        ' data-reading-time="' + (doc.readingTime || '') + '"' +
        ' data-modified="' + escapeAttr(doc.modifiedAt || '') + '"' +
        ' data-author-name="' + escapeAttr(doc.author ? doc.author.name : '') + '"' +
        ' data-author-avatar="' + escapeAttr(doc.author ? doc.author.avatar : '') + '"' +
      '>' +
        '<span class="doc-item__badge ' + badgeClass(doc.type) + '">' + escapeHTML(typeLabel) + '</span>' +
        '<span class="doc-item__title">' + escapeHTML(doc.title) + '</span>' +
        '<span class="doc-item__meta">' +
          authorHtml +
          readingTimeHtml +
          '<span class="doc-item__date">' + escapeHTML(formatDateShort(doc.modifiedAt)) + '</span>' +
        '</span>' +
      '</button>'
    );
  }

  function renderReadingView(doc, markdownHtml) {
    var metaTopHtml =
      '<span class="doc-item__badge ' + badgeClass(doc.type) + '">' + escapeHTML(doc.typeLabel) + '</span>';
    if (doc.readingTime) {
      metaTopHtml += '<span class="docs-reader__reading-time">~' + doc.readingTime + ' min read</span>';
    }

    var metaBottomHtml = '';
    if (doc.authorName) {
      metaBottomHtml +=
        '<span class="docs-reader__author">' +
          '<img class="docs-reader__author-avatar" src="' + escapeAttr(doc.authorAvatar) + '" alt="" width="20" height="20">' +
          '<span class="docs-reader__author-name">' + escapeHTML(doc.authorName) + '</span>' +
        '</span>';
      if (doc.modifiedAt) {
        metaBottomHtml += '<span class="docs-reader__meta-sep">&middot;</span>';
      }
    }
    if (doc.modifiedAt) {
      metaBottomHtml += '<span class="docs-reader__date">Last updated ' + escapeHTML(formatDateLong(doc.modifiedAt)) + '</span>';
    }

    return (
      '<div class="docs-reader">' +
        '<button class="docs-reader__back" type="button">Back to docs</button>' +
        '<div class="docs-reader__meta">' +
          '<div class="docs-reader__meta-top">' + metaTopHtml + '</div>' +
          (metaBottomHtml ? '<div class="docs-reader__meta-bottom">' + metaBottomHtml + '</div>' : '') +
        '</div>' +
        '<div class="docs-reader__content">' + markdownHtml + '</div>' +
      '</div>'
    );
  }

  // --- Expand/Collapse ---

  function toggleGroup(project) {
    if (expandedGroup === project) {
      collapseGroup(project);
      expandedGroup = null;
    } else {
      if (expandedGroup) {
        collapseGroup(expandedGroup);
      }
      expandGroup(project);
      expandedGroup = project;
    }
  }

  function expandGroup(project) {
    var groupEl = docsContainer.querySelector('[data-group="' + CSS.escape(project) + '"]');
    if (!groupEl) return;
    var header = groupEl.querySelector('.doc-group__header');
    var body = groupEl.querySelector('.doc-group__body');
    header.setAttribute('aria-expanded', 'true');
    body.setAttribute('aria-hidden', 'false');
  }

  function collapseGroup(project) {
    var groupEl = docsContainer.querySelector('[data-group="' + CSS.escape(project) + '"]');
    if (!groupEl) return;
    var header = groupEl.querySelector('.doc-group__header');
    var body = groupEl.querySelector('.doc-group__body');
    header.setAttribute('aria-expanded', 'false');
    body.setAttribute('aria-hidden', 'true');
  }

  // --- View Toggle ---

  function showListView() {
    listView.style.display = '';
    readerView.style.display = 'none';
  }

  function showReaderView() {
    listView.style.display = 'none';
    readerView.style.display = '';
  }

  // --- Reading View ---

  function openDoc(docData) {
    readerView.innerHTML = '<div class="docs__loading">Loading...</div>';
    showReaderView();

    apiGetDoc(docData.path)
      .then(function (markdown) {
        var html = marked.parse(markdown);
        readerView.innerHTML = renderReadingView(docData, html);
        window.scrollTo(0, 0);
      })
      .catch(function () {
        readerView.innerHTML =
          '<div class="docs-reader">' +
            '<button class="docs-reader__back" type="button">Back to docs</button>' +
            '<p class="docs__loading">Failed to load document.</p>' +
          '</div>';
      });
  }

  function closeReadingView() {
    showListView();
  }

  // --- Event Handlers ---

  // Delegated click on list view
  docsContainer.addEventListener('click', function (e) {
    // Doc item click
    var docItem = e.target.closest('.doc-item');
    if (docItem) {
      openDoc({
        path: docItem.getAttribute('data-path'),
        type: docItem.getAttribute('data-type'),
        title: docItem.getAttribute('data-title'),
        typeLabel: docItem.getAttribute('data-type-label'),
        readingTime: docItem.getAttribute('data-reading-time'),
        modifiedAt: docItem.getAttribute('data-modified'),
        authorName: docItem.getAttribute('data-author-name'),
        authorAvatar: docItem.getAttribute('data-author-avatar')
      });
      return;
    }

    // Group header click
    var header = e.target.closest('.doc-group__header');
    if (header) {
      var groupEl = header.closest('.doc-group');
      var project = groupEl.getAttribute('data-group');
      toggleGroup(project);
      return;
    }
  });

  // Delegated click on reader view (back button)
  readerView.addEventListener('click', function (e) {
    var backBtn = e.target.closest('.docs-reader__back');
    if (backBtn) {
      closeReadingView();
      return;
    }
  });

  // --- Init ---

  docsContainer.innerHTML = '<div class="docs__loading">Loading docs...</div>';

  apiGetDocs()
    .then(function (data) {
      summary = data.summary;
      groups = data.groups;
      renderStats();
      renderList();
    })
    .catch(function () {
      docsContainer.innerHTML = '<p class="docs__loading">Unable to load docs.</p>';
    });

})();
