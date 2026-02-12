/* ===========================
   Tasks Page — Cross-Project Task Tracker
   Vanilla JS IIFE. AG Grid v34 (loaded via CDN in tasks.html).
   =========================== */
(function () {
  'use strict';

  // --- Constants ---
  var STATUS_ORDER = { 'in-progress': 0, 'planned': 1, 'deferred': 2, 'completed': 3 };
  var PRIORITY_ORDER = { 'high': 0, 'medium': 1, 'low': 2 };
  var STATUS_BADGE = { 'planned': 'muted', 'in-progress': 'accent', 'completed': 'success', 'deferred': 'warning' };
  var PRIORITY_BADGE = { 'high': 'error', 'medium': 'warning', 'low': 'muted' };

  // --- State ---
  var _gridApi = null;
  var _allTasks = [];
  var _saveTimers = {}; // projectId → timeout id
  var _projectPrefixes = {}; // projectId → taskPrefix
  var _selectedNodes = []; // for bulk actions
  var _isBulkUpdating = false; // flag to suppress individual auto-saves during bulk ops

  // Panel state
  var _panelOpen = false;
  var _panelRowId = null;           // composite row ID (slug::id)
  var _panelEditOriginal = null;    // original value when editing text field
  var _panelEditField = null;       // field name being edited
  var _panelCancellingEdit = false; // flag to suppress blur-save on Escape

  // --- DOM refs ---
  var gridEl = document.getElementById('tasks-grid');
  if (!gridEl) return; // bail if not on tasks page
  var loadingEl = document.getElementById('tasks-loading');
  var emptyEl = document.getElementById('tasks-empty');
  var errorEl = document.getElementById('tasks-error');
  var retryEl = document.getElementById('tasks-retry');
  var statsEl = document.getElementById('tasks-stats');
  var filterBarEl = document.getElementById('tasks-filter-bar');
  var newTaskBtn = document.getElementById('new-task-btn');

  // Filter controls
  var filterProject = document.getElementById('filter-project');
  var filterStatus = document.getElementById('filter-status');
  var filterPriority = document.getElementById('filter-priority');
  var filterOwner = document.getElementById('filter-owner');
  var filterSearch = document.getElementById('filter-search');
  var filterBadge = document.getElementById('filter-badge');
  var filterClear = document.getElementById('filter-clear');

  // Bulk Action Bar controls
  var bulkBar = document.getElementById('bulk-action-bar');
  var bulkCount = document.getElementById('bulk-count');
  var bulkStatus = document.getElementById('bulk-status');
  var bulkPriority = document.getElementById('bulk-priority');
  var bulkOwnerInput = document.getElementById('bulk-owner');
  var bulkOwnerApply = document.getElementById('bulk-owner-apply');
  var bulkDelete = document.getElementById('bulk-delete');

  // Modal
  var modalOverlay = document.getElementById('task-modal-overlay');
  var modalForm = document.getElementById('task-form');
  var modalProjectSelect = document.getElementById('task-project');
  var modalTitleInput = document.getElementById('task-title');
  var modalDescriptionInput = document.getElementById('task-description');
  var modalClose = modalOverlay.querySelector('.modal__close');
  var modalCancel = modalOverlay.querySelector('.modal__cancel');
  var modalSubmit = modalOverlay.querySelector('.modal__submit');

  // Detail panel
  var panelEl = document.getElementById('task-detail');
  var panelOverlay = document.getElementById('task-detail-overlay');
  var panelBody = document.getElementById('panel-body');
  var panelIdEl = document.getElementById('panel-task-id');
  var panelTitleDisplay = document.getElementById('panel-title-display');
  var panelTitleInput = document.getElementById('panel-title-input');
  var panelDescriptionEl = document.getElementById('panel-description');
  var panelStatusSelect = document.getElementById('panel-status');
  var panelStatusBadge = document.getElementById('panel-status-badge');
  var panelPrioritySelect = document.getElementById('panel-priority');
  var panelPriorityBadge = document.getElementById('panel-priority-badge');
  var panelOwnerInput = document.getElementById('panel-owner');
  var panelPhaseInput = document.getElementById('panel-phase');
  var panelProjectLink = document.getElementById('panel-project-link');
  var panelCreatedBy = document.getElementById('panel-created-by');
  var panelScreenshotSection = document.getElementById('panel-screenshot-section');
  var panelScreenshotImg = document.getElementById('panel-screenshot-img');
  var panelScreenshotThumb = document.getElementById('panel-screenshot-thumb');
  var panelPreviewOverlay = document.getElementById('panel-preview-overlay');
  var panelPreviewImg = document.getElementById('panel-preview-img');
  var panelPreviewClose = document.getElementById('panel-preview-close');
  var panelCloseBtn = document.getElementById('panel-close');

  // =====================
  // Badge Cell Renderer
  // =====================
  function badgeCellRenderer(params, badgeMap) {
    if (!params.value) return '';
    var variant = badgeMap[params.value] || 'muted';
    var el = document.createElement('span');
    el.className = 'thq-badge thq-badge--' + variant;
    el.textContent = params.value;
    return el;
  }

  // =====================
  // Comparators
  // =====================
  function statusComparator(a, b) {
    var oa = STATUS_ORDER[a] !== undefined ? STATUS_ORDER[a] : 99;
    var ob = STATUS_ORDER[b] !== undefined ? STATUS_ORDER[b] : 99;
    return oa - ob;
  }

  function priorityComparator(a, b) {
    var oa = PRIORITY_ORDER[a] !== undefined ? PRIORITY_ORDER[a] : 99;
    var ob = PRIORITY_ORDER[b] !== undefined ? PRIORITY_ORDER[b] : 99;
    return oa - ob;
  }

  // =====================
  // Column Definitions
  // =====================
  var columnDefs = [
    {
      headerName: '',
      headerCheckboxSelection: true,
      headerCheckboxSelectionFilteredOnly: true,
      checkboxSelection: true,
      width: 50,
      minWidth: 50,
      maxWidth: 50,
      pinned: 'left',
      lockPosition: true,
      sortable: false,
      resizable: false,
      suppressMovable: true,
      suppressHeaderMenuButton: true,
      field: '_selection', // dummy field
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' }
    },
    {
      field: 'project',
      headerName: 'Project',
      minWidth: 160,
      flex: 1,
      editable: false,
      valueGetter: function (params) { return params.data.project.name; },
      cellRenderer: function (params) {
        var el = document.createElement('span');
        el.className = 'tasks__project-link';
        el.textContent = params.value;
        return el;
      }
    },
    {
      field: 'id',
      headerName: 'ID',
      width: 80,
      editable: false,
      cellStyle: { fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-secondary)', cursor: 'pointer' }
    },
    {
      field: 'title',
      headerName: 'Title',
      flex: 2,
      editable: false,
      cellStyle: { color: 'var(--color-text-primary)', cursor: 'pointer' }
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: { values: ['planned', 'in-progress', 'completed', 'deferred'] },
      cellRenderer: function (params) { return badgeCellRenderer(params, STATUS_BADGE); },
      comparator: statusComparator
    },
    {
      field: 'priority',
      headerName: 'Priority',
      width: 110,
      editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: { values: ['high', 'medium', 'low'] },
      cellRenderer: function (params) { return badgeCellRenderer(params, PRIORITY_BADGE); },
      comparator: priorityComparator
    },
    {
      field: 'owner',
      headerName: 'Owner',
      width: 120,
      editable: true,
      cellRenderer: function (params) {
        if (!params.value) return '';
        var wrapper = document.createElement('span');
        wrapper.style.cssText = 'display:inline-flex;align-items:center;gap:6px;';
        var key = params.value.toLowerCase();
        var img = document.createElement('img');
        img.src = 'img/avatars/' + key + '.svg';
        img.alt = '';
        img.width = 20;
        img.height = 20;
        img.style.cssText = 'border-radius:50%;flex-shrink:0;';
        img.onerror = function () { img.style.display = 'none'; };
        wrapper.appendChild(img);
        var name = document.createElement('span');
        name.textContent = params.value;
        wrapper.appendChild(name);
        return wrapper;
      }
    },
    {
      field: 'phase',
      headerName: 'Phase',
      width: 80,
      editable: true,
      cellStyle: { color: 'var(--color-text-secondary)' }
    }
  ];

  // =====================
  // Grid Options
  // =====================
  var gridOptions = {
    columnDefs: columnDefs,
    rowData: [],
    autoSizeStrategy: {
      type: 'fitGridWidth',
      defaultMinWidth: 80
    },
    domLayout: 'autoHeight',
    rowHeight: 44,
    headerHeight: 40,
    animateRows: true,
    singleClickEdit: true,
    stopEditingWhenCellsLoseFocus: true,
    rowSelection: 'multiple', // Multi-row selection
    suppressRowClickSelection: true, // Only checkbox selects row
    defaultColDef: {
      sortable: true,
      resizable: false,
      suppressMovable: true
    },
    getRowId: function (params) {
      return params.data.project.slug + '::' + params.data.id;
    },
    isExternalFilterPresent: function () {
      return hasActiveFilters();
    },
    doesExternalFilterPass: function (node) {
      return passesFilters(node.data);
    },
    onSelectionChanged: handleSelectionChanged,
    onCellValueChanged: function (event) {
      if (_isBulkUpdating) return; // Skip during bulk update
      scheduleTaskSave(event.data.project.id);
      // Reverse sync: if panel is showing this task, update the panel field
      if (_panelOpen && _panelRowId === event.data.project.slug + '::' + event.data.id) {
        updatePanelField(event.colDef.field, event.newValue);
      }
    },
    onCellClicked: function (event) {
      // Editable cells → AG Grid handles inline edit
      if (event.colDef && event.colDef.editable) return;

      // Checkbox column → handled by selection logic
      if (event.colDef && event.colDef.field === '_selection') return;

      var field = event.colDef ? event.colDef.field : null;

      // ID or Title → open detail panel
      if (field === 'id' || field === 'title') {
        var compositeId = event.data.project.slug + '::' + event.data.id;
        openPanel(compositeId);
        return;
      }

      // Project → navigate to project page
      if (field === 'project') {
        window.location = 'projects.html#' + event.data.project.slug;
        return;
      }
    },
    onGridSizeChanged: function () {
      if (_gridApi) {
        _gridApi.sizeColumnsToFit();
      }
    },
    initialState: {
      sort: {
        sortModel: [
          { colId: 'status', sort: 'asc' }
        ]
      }
    }
  };

  // =====================
  // Bulk Action Logic
  // =====================
  function handleSelectionChanged() {
    _selectedNodes = _gridApi.getSelectedNodes();
    var count = _selectedNodes.length;
    
    bulkCount.textContent = count + ' selected';
    if (count > 0) {
      bulkBar.classList.add('visible');
      bulkBar.setAttribute('aria-hidden', 'false');
    } else {
      bulkBar.classList.remove('visible');
      bulkBar.setAttribute('aria-hidden', 'true');
      // Reset controls
      bulkStatus.value = "";
      bulkPriority.value = "";
      bulkOwnerInput.value = "";
    }
  }

  function executeBulkUpdate(field, value) {
    if (!_selectedNodes.length) return;

    var affectedProjectIds = new Set();
    _isBulkUpdating = true; // Suppress individual save triggers

    // 1. Update Grid UI immediately (Optimistic)
    _selectedNodes.forEach(function(node) {
      node.setDataValue(field, value);
      affectedProjectIds.add(node.data.project.id);
    });

    _isBulkUpdating = false;

    // 2. Persist Changes
    var promises = [];
    affectedProjectIds.forEach(function(projectId) {
      promises.push(saveProjectTasks(projectId, 0, true)); // true = return promise
    });

    Promise.allSettled(promises).then(function(results) {
      var failed = results.filter(function(r) { return r.status === 'rejected'; });
      if (failed.length === 0) {
        showToast('Updated ' + _selectedNodes.length + ' tasks');
        _gridApi.deselectAll();
      } else {
        showToast('Completed with errors. Failed to save ' + failed.length + ' projects.');
        // In a more complex app, we might revert UI changes here
      }
    });
  }

  function executeBulkDelete() {
    if (!_selectedNodes.length) return;

    if (!confirm('Are you sure you want to delete ' + _selectedNodes.length + ' tasks? This cannot be undone.')) {
      return;
    }

    var affectedProjectIds = new Set();
    var rowsToRemove = [];
    
    _selectedNodes.forEach(function(node) {
      affectedProjectIds.add(node.data.project.id);
      rowsToRemove.push(node.data);
    });

    // 1. Update Grid UI
    _gridApi.applyTransaction({ remove: rowsToRemove });

    // 2. Persist Changes
    var promises = [];
    affectedProjectIds.forEach(function(projectId) {
      promises.push(saveProjectTasks(projectId, 0, true));
    });

    Promise.allSettled(promises).then(function(results) {
      var failed = results.filter(function(r) { return r.status === 'rejected'; });
      if (failed.length === 0) {
        showToast('Deleted ' + rowsToRemove.length + ' tasks');
        _gridApi.deselectAll();
        updateStats(); // Update stats after delete
      } else {
        showToast('Error deleting tasks in ' + failed.length + ' projects.');
      }
    });
  }

  // Bind Bulk Actions
  bulkStatus.addEventListener('change', function() {
    if (this.value) {
      executeBulkUpdate('status', this.value);
      this.value = ""; // Reset dropdown
    }
  });

  bulkPriority.addEventListener('change', function() {
    if (this.value) {
      executeBulkUpdate('priority', this.value);
      this.value = ""; // Reset dropdown
    }
  });

  bulkOwnerInput.addEventListener('input', function() {
    bulkOwnerApply.disabled = !this.value.trim();
  });

  bulkOwnerApply.addEventListener('click', function() {
    var val = bulkOwnerInput.value.trim();
    if (val) {
      executeBulkUpdate('owner', val);
      bulkOwnerInput.value = "";
      bulkOwnerApply.disabled = true;
    }
  });
  
  // Allow Enter key in owner input
  bulkOwnerInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      var val = bulkOwnerInput.value.trim();
      if (val) {
        executeBulkUpdate('owner', val);
        bulkOwnerInput.value = "";
        bulkOwnerApply.disabled = true;
      }
    }
  });

  bulkDelete.addEventListener('click', executeBulkDelete);


  // =====================
  // Filter Logic
  // =====================
  function hasActiveFilters() {
    return filterProject.value !== '' ||
           filterStatus.value !== '' ||
           filterPriority.value !== '' ||
           filterOwner.value !== '' ||
           filterSearch.value.trim() !== '';
  }

  function passesFilters(data) {
    if (filterProject.value && data.project.slug !== filterProject.value) return false;
    if (filterStatus.value && data.status !== filterStatus.value) return false;
    if (filterPriority.value && data.priority !== filterPriority.value) return false;
    if (filterOwner.value === '__unassigned' && data.owner && data.owner.trim() !== '') return false;
    if (filterOwner.value && filterOwner.value !== '__unassigned' && data.owner !== filterOwner.value) return false;
    if (filterSearch.value.trim()) {
      var query = filterSearch.value.trim().toLowerCase();
      if ((data.title || '').toLowerCase().indexOf(query) === -1) return false;
    }
    return true;
  }

  function updateFilterUI() {
    var count = 0;
    if (filterProject.value) count++;
    if (filterStatus.value) count++;
    if (filterPriority.value) count++;
    if (filterOwner.value) count++;
    if (filterSearch.value.trim()) count++;

    toggleActive(filterProject);
    toggleActive(filterStatus);
    toggleActive(filterPriority);
    toggleActive(filterOwner);

    if (count > 0) {
      filterBadge.textContent = count + (count === 1 ? ' filter' : ' filters');
      filterBadge.hidden = false;
      filterClear.hidden = false;
    } else {
      filterBadge.hidden = true;
      filterClear.hidden = true;
    }

    if (_gridApi) {
      _gridApi.onFilterChanged();
      updateStats();
    }
  }

  function toggleActive(selectEl) {
    if (selectEl.value !== '') {
      selectEl.classList.add('tasks-filter-bar__select--active');
    } else {
      selectEl.classList.remove('tasks-filter-bar__select--active');
    }
  }

  function clearFilters() {
    filterProject.value = '';
    filterStatus.value = '';
    filterPriority.value = '';
    filterOwner.value = '';
    filterSearch.value = '';
    updateFilterUI();
  }

  function populateFilterDropdowns(tasks) {
    var projectMap = {};
    var owners = {};
    for (var i = 0; i < tasks.length; i++) {
      var t = tasks[i];
      if (t.project && t.project.slug) {
        projectMap[t.project.slug] = t.project.name;
      }
      if (t.owner && t.owner.trim()) {
        owners[t.owner] = true;
      }
    }

    var projectSlugs = Object.keys(projectMap).sort(function (a, b) {
      return projectMap[a].localeCompare(projectMap[b]);
    });
    for (var p = 0; p < projectSlugs.length; p++) {
      var opt = document.createElement('option');
      opt.value = projectSlugs[p];
      opt.textContent = projectMap[projectSlugs[p]];
      filterProject.appendChild(opt);
    }

    var ownerNames = Object.keys(owners).sort();
    for (var o = 0; o < ownerNames.length; o++) {
      var ownerOpt = document.createElement('option');
      ownerOpt.value = ownerNames[o];
      ownerOpt.textContent = ownerNames[o];
      filterOwner.appendChild(ownerOpt);
    }
  }

  // Bind filter events
  filterProject.addEventListener('change', updateFilterUI);
  filterStatus.addEventListener('change', updateFilterUI);
  filterPriority.addEventListener('change', updateFilterUI);
  filterOwner.addEventListener('change', updateFilterUI);
  filterSearch.addEventListener('input', updateFilterUI);
  filterClear.addEventListener('click', clearFilters);

  // =====================
  // Cross-Project Save
  // =====================
  function scheduleTaskSave(projectId) {
    if (_saveTimers[projectId]) clearTimeout(_saveTimers[projectId]);
    _saveTimers[projectId] = setTimeout(function () {
      delete _saveTimers[projectId];
      saveProjectTasks(projectId, 0, false);
    }, 500);
  }

  function saveProjectTasks(projectId, retryCount, returnPromise) {
    var workItems = [];
    _gridApi.forEachNode(function (node) {
      if (node.data.project.id !== projectId) return;
      workItems.push({
        id: node.data.id,
        title: node.data.title,
        description: node.data.description || '',
        status: node.data.status || 'planned',
        phase: node.data.phase || '',
        owner: node.data.owner || '',
        priority: node.data.priority || 'medium',
        createdBy: node.data.createdBy || ''
      });
    });

    var fetchPromise = fetch('/api/projects/' + encodeURIComponent(projectId) + '/work-items', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workItems: workItems })
    })
      .then(function (res) {
        if (!res.ok) throw new Error('Save failed');
        // Only flash cells if not bulk updating, to avoid UI noise
        if (!_isBulkUpdating) {
            var rowNodes = [];
            _gridApi.forEachNode(function (node) {
              if (node.data.project.id === projectId) rowNodes.push(node);
            });
            if (rowNodes.length > 0) {
              _gridApi.flashCells({ rowNodes: rowNodes, columns: ['status', 'priority', 'owner', 'phase'] });
            }
        }
      })
      .catch(function (err) {
        if (retryCount < 1 && !returnPromise) {
          showToast('Failed to save — retrying...');
          setTimeout(function () { saveProjectTasks(projectId, 1, false); }, 2000);
        } else if (!returnPromise) {
          showToast('Failed to save.');
        }
        throw err; // Propagate error for Promise.allSettled
      });

    if (returnPromise) {
      return fetchPromise;
    }
  }

  // =====================
  // Toast
  // =====================
  var _toastEl = null;
  var _toastTimeout = null;

  function showToast(message) {
    if (_toastEl) {
      _toastEl.remove();
      clearTimeout(_toastTimeout);
    }
    _toastEl = document.createElement('div');
    _toastEl.className = 'tasks-toast';
    _toastEl.textContent = message;
    document.body.appendChild(_toastEl);
    _toastTimeout = setTimeout(function () {
      if (_toastEl) {
        _toastEl.remove();
        _toastEl = null;
      }
    }, 3000);
  }

  // =====================
  // Stats
  // =====================
  function updateStats() {
    var total = _allTasks.length; // This might be stale if we deleted rows, but we usually reload or splice.
    
    // Better to count from grid rows if we want to be accurate after deletes without full reload
    // But _allTasks is used for global stats. Let's update _allTasks reference when needed.
    // For now, simpler to just recount from grid if initialized.
    
    if (_gridApi) {
        var allNodesCount = 0;
        _gridApi.forEachNode(function() { allNodesCount++; });
        // Update total if mismatch (e.g. after delete)
        if (allNodesCount !== total) {
             // Sync _allTasks with grid data roughly
             // (Not perfect but keeps stats aligned visually)
             total = allNodesCount;
        }
    }

    var displayed = 0;
    if (_gridApi) {
      _gridApi.forEachNodeAfterFilter(function () { displayed++; });
    }
    
    // Recount projects
    var projectSet = new Set();
    if (_gridApi) {
        _gridApi.forEachNode(function(node) {
            projectSet.add(node.data.project.id);
        });
    }
    var projectCount = projectSet.size;


    if (hasActiveFilters()) {
      statsEl.textContent = displayed + ' of ' + total + ' tasks across ' + projectCount + ' project' + (projectCount !== 1 ? 's' : '');
    } else {
      statsEl.textContent = total + ' task' + (total !== 1 ? 's' : '') + ' across ' + projectCount + ' project' + (projectCount !== 1 ? 's' : '');
    }
  }

  // =====================
  // Show/Hide States
  // =====================
  function showState(state) {
    loadingEl.style.display = state === 'loading' ? '' : 'none';
    emptyEl.style.display = state === 'empty' ? '' : 'none';
    errorEl.style.display = state === 'error' ? '' : 'none';
    gridEl.style.display = state === 'grid' ? '' : 'none';
    filterBarEl.style.display = state === 'grid' ? '' : 'none';
  }

  // =====================
  // New Task Modal
  // =====================
  var _modalProjects = [];

  function openModal() {
    modalOverlay.setAttribute('aria-hidden', 'false');
    modalForm.reset();
    clearModalErrors();
    removeFormError();
    modalSubmit.textContent = 'Create Task';
    modalSubmit.disabled = false;

    if (_modalProjects.length === 0) {
      fetch('/api/projects')
        .then(function (res) { return res.json(); })
        .then(function (data) {
          var projects = data.projects || data || [];
          _modalProjects = projects.filter(function (p) { return p.slug; });
          _modalProjects.sort(function (a, b) { return a.name.localeCompare(b.name); });
          populateModalProjects();
        })
        .catch(function () { /* user can't create task if projects fail to load */ });
    }

    setTimeout(function () { modalTitleInput.focus(); }, 50);
  }

  function populateModalProjects() {
    while (modalProjectSelect.options.length > 1) {
      modalProjectSelect.remove(1);
    }
    for (var i = 0; i < _modalProjects.length; i++) {
      var opt = document.createElement('option');
      opt.value = _modalProjects[i].id;
      opt.textContent = _modalProjects[i].name;
      opt.dataset.slug = _modalProjects[i].slug;
      opt.dataset.taskprefix = _projectPrefixes[_modalProjects[i].id] || '';
      modalProjectSelect.appendChild(opt);
    }
  }

  function closeModal() {
    modalOverlay.setAttribute('aria-hidden', 'true');
    newTaskBtn.focus();
  }

  function clearModalErrors() {
    var errors = modalForm.querySelectorAll('.modal__error');
    for (var i = 0; i < errors.length; i++) {
      errors[i].textContent = '';
    }
    var invalids = modalForm.querySelectorAll('.modal__input--invalid, .modal__select--invalid');
    for (var j = 0; j < invalids.length; j++) {
      invalids[j].classList.remove('modal__input--invalid', 'modal__select--invalid');
    }
  }

  function removeFormError() {
    var existing = modalForm.querySelector('.modal__form-error');
    if (existing) existing.remove();
  }

  function handleModalSubmit(e) {
    e.preventDefault();
    clearModalErrors();
    removeFormError();

    var projectId = modalProjectSelect.value;
    var title = modalTitleInput.value.trim();
    var valid = true;

    if (!projectId) {
      modalProjectSelect.classList.add('modal__select--invalid');
      modalProjectSelect.parentElement.querySelector('.modal__error').textContent = 'Please select a project.';
      valid = false;
    }
    if (!title) {
      modalTitleInput.classList.add('modal__input--invalid');
      modalTitleInput.parentElement.querySelector('.modal__error').textContent = 'Title is required.';
      valid = false;
    }

    if (!valid) return;

    var selectedOption = modalProjectSelect.options[modalProjectSelect.selectedIndex];
    var projectSlug = selectedOption.dataset.slug;
    var projectName = selectedOption.textContent;

    var maxNum = 0;
    var prefix = selectedOption.dataset.taskprefix || '';
    _gridApi.forEachNode(function (node) {
      if (node.data.project.id !== projectId) return;
      var match = node.data.id && node.data.id.match(/(\d+)$/);
      if (match) {
        var n = parseInt(match[1], 10);
        if (n > maxNum) maxNum = n;
      }
    });
    var newId = (prefix || 'TT') + '-' + (maxNum + 1);

    var newTask = {
      id: newId,
      title: title,
      description: modalDescriptionInput ? modalDescriptionInput.value : '',
      status: document.getElementById('task-status').value,
      priority: document.getElementById('task-priority').value,
      owner: document.getElementById('task-owner').value.trim(),
      phase: document.getElementById('task-phase').value.trim(),
      createdBy: 'CEO',
      project: {
        id: projectId,
        slug: projectSlug,
        name: projectName,
        taskPrefix: prefix
      }
    };

    var workItems = [];
    _gridApi.forEachNode(function (node) {
      if (node.data.project.id !== projectId) return;
      workItems.push({
        id: node.data.id,
        title: node.data.title,
        description: node.data.description || '',
        status: node.data.status || 'planned',
        phase: node.data.phase || '',
        owner: node.data.owner || '',
        priority: node.data.priority || 'medium',
        createdBy: node.data.createdBy || ''
      });
    });
    workItems.push({
      id: newTask.id,
      title: newTask.title,
      description: newTask.description,
      status: newTask.status,
      phase: newTask.phase,
      owner: newTask.owner,
      priority: newTask.priority,
      createdBy: newTask.createdBy
    });

    modalSubmit.textContent = 'Creating...';
    modalSubmit.disabled = true;

    fetch('/api/projects/' + encodeURIComponent(projectId) + '/work-items', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workItems: workItems })
    })
      .then(function (res) {
        if (!res.ok) throw new Error('Create failed');
        _allTasks.push(newTask);
        _gridApi.applyTransaction({ add: [newTask] });
        updateStats();
        if (newTask.owner && newTask.owner.trim()) {
          addOwnerToFilter(newTask.owner);
        }
        closeModal();
      })
      .catch(function () {
        modalSubmit.textContent = 'Create Task';
        modalSubmit.disabled = false;
        var actionsEl = modalForm.querySelector('.modal__actions');
        var errEl = document.createElement('p');
        errEl.className = 'modal__form-error';
        errEl.style.cssText = 'font-size:var(--text-sm);color:var(--color-status-error);margin:0 0 var(--space-3) 0;text-align:center;';
        errEl.textContent = 'Failed to create task. Please try again.';
        actionsEl.parentNode.insertBefore(errEl, actionsEl);
      });
  }

  function addOwnerToFilter(ownerName) {
    for (var i = 0; i < filterOwner.options.length; i++) {
      if (filterOwner.options[i].value === ownerName) return;
    }
    var opt = document.createElement('option');
    opt.value = ownerName;
    opt.textContent = ownerName;
    filterOwner.appendChild(opt);
  }

  // Modal event bindings
  newTaskBtn.addEventListener('click', openModal);
  modalClose.addEventListener('click', closeModal);
  modalCancel.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', function (e) {
    if (e.target === modalOverlay) closeModal();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;

    // 0. Preview overlay takes high precedence
    if (panelPreviewOverlay.classList.contains('bug-preview-overlay--visible')) {
      panelPreviewOverlay.classList.remove('bug-preview-overlay--visible');
      return;
    }

    // 1. Modal takes precedence
    if (modalOverlay.getAttribute('aria-hidden') === 'false') {
      closeModal();
      return;
    }

    // 2. If editing a panel field, cancel the edit
    if (_panelOpen && _panelEditField) {
      cancelPanelEdit();
      return;
    }

    // 3. If panel is open, close it
    if (_panelOpen) {
      closePanel();
      return;
    }
  });
  modalForm.addEventListener('submit', handleModalSubmit);

  // =====================
  // Detail Panel
  // =====================

  var STATUS_BADGE_MAP = { 'planned': 'muted', 'in-progress': 'accent', 'completed': 'success', 'deferred': 'warning' };
  var PRIORITY_BADGE_MAP = { 'high': 'error', 'medium': 'warning', 'low': 'muted' };
  var STATUS_LABELS = { 'planned': 'Planned', 'in-progress': 'In Progress', 'completed': 'Completed', 'deferred': 'Deferred' };
  var PRIORITY_LABELS = { 'high': 'High', 'medium': 'Medium', 'low': 'Low' };

  function openPanel(compositeRowId) {
    if (!_gridApi) return;
    var rowNode = _gridApi.getRowNode(compositeRowId);
    if (!rowNode) return;

    var wasOpen = _panelOpen;
    var data = rowNode.data;

    // If already open for a different task, do a crossfade transition
    if (wasOpen && _panelRowId !== compositeRowId) {
      panelBody.classList.add('task-detail__body--transitioning');
      setTimeout(function () {
        panelBody.classList.remove('task-detail__body--transitioning');
      }, 120);
    }

    _panelRowId = compositeRowId;

    // Populate fields
    panelIdEl.textContent = data.id;
    panelTitleDisplay.textContent = data.title;
    panelTitleDisplay.style.display = '';
    panelTitleInput.style.display = 'none';
    panelDescriptionEl.value = data.description || '';
    autoGrowTextarea(panelDescriptionEl);

    panelStatusSelect.value = data.status || 'planned';
    updateBadge(panelStatusBadge, data.status || 'planned', STATUS_BADGE_MAP, STATUS_LABELS);

    panelPrioritySelect.value = data.priority || 'medium';
    updateBadge(panelPriorityBadge, data.priority || 'medium', PRIORITY_BADGE_MAP, PRIORITY_LABELS);

    panelOwnerInput.value = data.owner || '';
    panelPhaseInput.value = data.phase || '';

    panelProjectLink.textContent = data.project.name;
    panelProjectLink.href = 'projects.html#' + data.project.slug;

    var cb = data.createdBy || '';
    panelCreatedBy.textContent = cb || '—';
    panelCreatedBy.className = 'task-detail__readonly' + (cb ? '' : ' task-detail__readonly--empty');

    // Screenshot
    if (data.metadata && data.metadata.screenshotPath) {
      panelScreenshotImg.src = data.metadata.screenshotPath;
      panelScreenshotSection.style.display = 'block';
    } else {
      panelScreenshotSection.style.display = 'none';
      panelScreenshotImg.src = '';
    }

    // Show panel
    if (!wasOpen) {
      panelEl.setAttribute('aria-hidden', 'false');
      panelEl.classList.add('task-detail--open');
    }
    _panelOpen = true;

    // Announce to screen readers
    var announcementEl = document.getElementById('panel-announcement');
    if (announcementEl) announcementEl.textContent = 'Task ' + data.id + ' details';

    // Focus close button on first open
    if (!wasOpen) {
      setTimeout(function () { panelCloseBtn.focus(); }, 50);
    }
  }

  function closePanel() {
    if (!_panelOpen) return;

    // Cancel any in-progress edit
    if (_panelEditField) {
      _panelCancellingEdit = true;
      var active = document.activeElement;
      if (panelEl.contains(active)) active.blur();
      _panelCancellingEdit = false;
      _panelEditField = null;
      _panelEditOriginal = null;
    }

    panelEl.classList.remove('task-detail--open');
    panelEl.setAttribute('aria-hidden', 'true');

    // Hide title input, show display
    panelTitleDisplay.style.display = '';
    panelTitleInput.style.display = 'none';

    var prevRowId = _panelRowId;
    _panelOpen = false;
    _panelRowId = null;

    // Return focus to the previously selected grid row
    if (prevRowId && _gridApi) {
      var rowNode = _gridApi.getRowNode(prevRowId);
      if (rowNode && rowNode.rowIndex != null) {
        _gridApi.ensureNodeVisible(rowNode);
        _gridApi.setFocusedCell(rowNode.rowIndex, 'title');
      } else {
        gridEl.focus();
      }
    }
  }

  function updateBadge(badgeEl, value, badgeMap, labelMap) {
    var variant = badgeMap[value] || 'muted';
    badgeEl.className = 'thq-badge thq-badge--' + variant;
    badgeEl.textContent = labelMap[value] || value;
  }

  function panelFieldChanged(field, newValue) {
    if (!_panelRowId || !_gridApi) return;
    var rowNode = _gridApi.getRowNode(_panelRowId);
    if (!rowNode) return;

    // Update row data directly and trigger save
    rowNode.setDataValue(field, newValue); // Use setDataValue to trigger onCellValueChanged
    // scheduleTaskSave is handled by onCellValueChanged
  }

  function updatePanelField(field, newValue) {
    // Reverse sync: grid edit → update panel if showing that task
    switch (field) {
      case 'status':
        panelStatusSelect.value = newValue || 'planned';
        updateBadge(panelStatusBadge, newValue || 'planned', STATUS_BADGE_MAP, STATUS_LABELS);
        break;
      case 'priority':
        panelPrioritySelect.value = newValue || 'medium';
        updateBadge(panelPriorityBadge, newValue || 'medium', PRIORITY_BADGE_MAP, PRIORITY_LABELS);
        break;
      case 'owner':
        panelOwnerInput.value = newValue || '';
        break;
      case 'phase':
        panelPhaseInput.value = newValue || '';
        break;
      case 'title':
        panelTitleDisplay.textContent = newValue || '';
        break;
    }
  }

  function cancelPanelEdit() {
    if (!_panelEditField || _panelEditOriginal === null) return;

    var field = _panelEditField;
    _panelCancellingEdit = true;

    if (field === 'title') {
      panelTitleInput.value = _panelEditOriginal;
      panelTitleInput.blur();
    } else if (field === 'description') {
      panelDescriptionEl.value = _panelEditOriginal;
      panelDescriptionEl.blur();
    } else if (field === 'owner') {
      panelOwnerInput.value = _panelEditOriginal;
      panelOwnerInput.blur();
    } else if (field === 'phase') {
      panelPhaseInput.value = _panelEditOriginal;
      panelPhaseInput.blur();
    }

    _panelCancellingEdit = false;
    _panelEditField = null;
    _panelEditOriginal = null;
  }

  function autoGrowTextarea(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 300) + 'px';
  }

  // --- Title editing (click to toggle display/input) ---
  panelTitleDisplay.addEventListener('click', function () {
    _panelEditField = 'title';
    _panelEditOriginal = panelTitleDisplay.textContent;
    panelTitleInput.value = panelTitleDisplay.textContent;
    panelTitleDisplay.style.display = 'none';
    panelTitleInput.style.display = '';
    panelTitleInput.focus();
    panelTitleInput.select();
  });

  panelTitleInput.addEventListener('blur', function () {
    if (_panelCancellingEdit) {
      panelTitleDisplay.style.display = '';
      panelTitleInput.style.display = 'none';
      return;
    }
    var val = panelTitleInput.value.trim();
    if (val && val !== _panelEditOriginal) {
      panelTitleDisplay.textContent = val;
      panelFieldChanged('title', val);
    }
    panelTitleDisplay.style.display = '';
    panelTitleInput.style.display = 'none';
    _panelEditField = null;
    _panelEditOriginal = null;
  });

  panelTitleInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      panelTitleInput.blur();
    }
  });

  // --- Description ---
  panelDescriptionEl.addEventListener('focus', function () {
    _panelEditField = 'description';
    _panelEditOriginal = panelDescriptionEl.value;
  });

  panelDescriptionEl.addEventListener('blur', function () {
    if (_panelCancellingEdit) {
      _panelEditField = null;
      _panelEditOriginal = null;
      return;
    }
    var val = panelDescriptionEl.value;
    if (val !== _panelEditOriginal) {
      panelFieldChanged('description', val);
    }
    _panelEditField = null;
    _panelEditOriginal = null;
  });

  panelDescriptionEl.addEventListener('input', function () {
    autoGrowTextarea(panelDescriptionEl);
  });

  // --- Status select (badge-over-select) ---
  panelStatusSelect.addEventListener('change', function () {
    var val = panelStatusSelect.value;
    updateBadge(panelStatusBadge, val, STATUS_BADGE_MAP, STATUS_LABELS);
    panelFieldChanged('status', val);
  });

  // --- Priority select (badge-over-select) ---
  panelPrioritySelect.addEventListener('change', function () {
    var val = panelPrioritySelect.value;
    updateBadge(panelPriorityBadge, val, PRIORITY_BADGE_MAP, PRIORITY_LABELS);
    panelFieldChanged('priority', val);
  });

  // --- Owner input ---
  panelOwnerInput.addEventListener('focus', function () {
    _panelEditField = 'owner';
    _panelEditOriginal = panelOwnerInput.value;
  });

  panelOwnerInput.addEventListener('blur', function () {
    if (_panelCancellingEdit) {
      _panelEditField = null;
      _panelEditOriginal = null;
      return;
    }
    var val = panelOwnerInput.value.trim();
    if (val !== _panelEditOriginal) {
      panelFieldChanged('owner', val);
    }
    _panelEditField = null;
    _panelEditOriginal = null;
  });

  // --- Phase input ---
  panelPhaseInput.addEventListener('focus', function () {
    _panelEditField = 'phase';
    _panelEditOriginal = panelPhaseInput.value;
  });

  panelPhaseInput.addEventListener('blur', function () {
    if (_panelCancellingEdit) {
      _panelEditField = null;
      _panelEditOriginal = null;
      return;
    }
    var val = panelPhaseInput.value.trim();
    if (val !== _panelEditOriginal) {
      panelFieldChanged('phase', val);
    }
    _panelEditField = null;
    _panelEditOriginal = null;
  });

  // --- Close button ---
  panelCloseBtn.addEventListener('click', closePanel);

  // --- Screenshot Preview ---
  panelScreenshotThumb.addEventListener('click', function () {
    var src = panelScreenshotImg.src;
    if (src) {
      panelPreviewImg.src = src;
      panelPreviewOverlay.classList.add('bug-preview-overlay--visible');
      setTimeout(function () { panelPreviewClose.focus(); }, 50);
    }
  });

  panelPreviewOverlay.addEventListener('click', function (e) {
    if (e.target === panelPreviewOverlay || e.target === panelPreviewClose) {
      panelPreviewOverlay.classList.remove('bug-preview-overlay--visible');
    }
  });

  panelPreviewClose.addEventListener('click', function () {
    panelPreviewOverlay.classList.remove('bug-preview-overlay--visible');
  });

  // --- Click-outside close (mousedown to allow grid cell clicks to pass through) ---
  document.addEventListener('mousedown', function (e) {
    if (!_panelOpen) return;
    if (panelEl.contains(e.target)) return;
    // Grid clicks are handled by onCellClicked — don't close for those
    if (gridEl.contains(e.target)) return;
    // Bulk bar interactions shouldn't close panel
    if (bulkBar.contains(e.target)) return;
    closePanel();
  });

  // =====================
  // Fetch & Initialize
  // =====================
  function loadTasks() {
    showState('loading');

    fetch('/api/tasks')
      .then(function (res) {
        if (!res.ok) throw new Error('Fetch failed');
        return res.json();
      })
      .then(function (data) {
        _allTasks = data.tasks || [];

        // Build project prefix map from task data
        for (var i = 0; i < _allTasks.length; i++) {
          var t = _allTasks[i];
          if (t.project && t.project.taskPrefix) {
            _projectPrefixes[t.project.id] = t.project.taskPrefix;
          }
        }

        if (_allTasks.length === 0) {
          showState('empty');
          statsEl.textContent = '';
          return;
        }

        showState('grid');
        populateFilterDropdowns(_allTasks);

        _gridApi = agGrid.createGrid(gridEl, gridOptions);
        _gridApi.setGridOption('rowData', _allTasks);
        _gridApi.sizeColumnsToFit();
        gridEl.setAttribute('aria-label', 'Tasks across all projects');

        updateStats();
      })
      .catch(function () {
        showState('error');
        statsEl.textContent = '';
      });
  }

  retryEl.addEventListener('click', function (e) {
    e.preventDefault();
    loadTasks();
  });

  loadTasks();

})();
