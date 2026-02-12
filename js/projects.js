(function () {
  'use strict';

  var API_BASE = '/api/projects';
  var TOAST_DURATION = 4000;

  // --- Agent Registry & Event Classification ---

  var AGENT_REGISTRY = {
    'pm':                { name: 'Thomas', role: 'Product Manager',        avatar: 'thomas' },
    'designer':          { name: 'Robert', role: 'Product Designer',       avatar: 'robert' },
    'arch':              { name: 'Andrei', role: 'Technical Architect',    avatar: 'andrei' },
    'fe':                { name: 'Alice',  role: 'Front-End Developer',    avatar: 'alice' },
    'be':                { name: 'Jonah',  role: 'Back-End Developer',     avatar: 'jonah' },
    'qa':                { name: 'Enzo',   role: 'QA Engineer',            avatar: 'enzo' },
    'marketer':          { name: 'Priya',  role: 'Product Marketer',       avatar: 'priya' },
    'market-researcher': { name: 'Suki',   role: 'Market Researcher',      avatar: 'suki' },
    'tech-researcher':   { name: 'Marco',  role: 'Technical Researcher',   avatar: 'marco' },
    'writer':            { name: 'Nadia',  role: 'Technical Writer',       avatar: 'nadia' },
    'analyst':           { name: 'Yuki',   role: 'Data Analyst',           avatar: 'yuki' },
    'ai-engineer':       { name: 'Kai',    role: 'AI Engineer',            avatar: 'kai' },
    'mobile-1':          { name: 'Zara',   role: 'Mobile Developer',       avatar: 'zara' },
    'mobile-2':          { name: 'Leo',    role: 'Mobile Developer',       avatar: 'leo' },
  };

  var SEMANTIC_TOOLS = {
    'Task': true, 'SendMessage': true, 'TeamCreate': true,
    'TeamDelete': true, 'TaskOutput': true
  };
  var HIDDEN_TOOLS = {
    'TaskUpdate': true, 'TaskCreate': true, 'TaskList': true, 'TaskGet': true
  };
  var LOW_SIGNAL_TOOLS = { 'Read': true, 'Glob': true, 'Grep': true };

  // --- Pipeline Phase Mapping ---

  var PHASE_DEFINITIONS = [
    { id: 'research',       label: 'Research',       agents: ['market-researcher', 'tech-researcher'] },
    { id: 'scoping',        label: 'Scoping',        agents: ['pm'] },
    { id: 'architecture',   label: 'Architecture',   agents: ['arch', 'ai-engineer'] },
    { id: 'design',         label: 'Design',         agents: ['designer'] },
    { id: 'implementation', label: 'Implementation', agents: ['fe', 'be'] },
    { id: 'qa',             label: 'QA',             agents: ['qa'] },
  ];

  var AGENT_TO_PHASE = {};
  (function () {
    for (var i = 0; i < PHASE_DEFINITIONS.length; i++) {
      var phase = PHASE_DEFINITIONS[i];
      for (var j = 0; j < phase.agents.length; j++) {
        AGENT_TO_PHASE[phase.agents[j]] = phase.id;
      }
    }
  })();

  // --- File Deliverables Constants ---

  var CATEGORY_ORDER = ['docs', 'code', 'data', 'config', 'other'];
  var CATEGORY_LABELS = { docs: 'Docs', code: 'Code', data: 'Data', config: 'Config', other: 'Other' };

  function classifyEvent(event) {
    if (event.type === 'tool_result') {
      var tool = event.data && event.data.tool;
      if (tool && (SEMANTIC_TOOLS[tool] || HIDDEN_TOOLS[tool])) return 'hidden';
      if (tool && LOW_SIGNAL_TOOLS[tool]) return 'low';
      return 'high';
    }
    if (event.type !== 'tool_use') return 'high';
    var tool = event.data.tool;
    if (SEMANTIC_TOOLS[tool]) return 'semantic';
    if (HIDDEN_TOOLS[tool]) return 'hidden';
    if (LOW_SIGNAL_TOOLS[tool]) return 'low';
    return 'high';
  }

  function formatGroupSummary(tools) {
    var reads = 0, globs = 0, greps = 0;
    for (var i = 0; i < tools.length; i++) {
      if (tools[i] === 'Read') reads++;
      else if (tools[i] === 'Glob') globs++;
      else if (tools[i] === 'Grep') greps++;
    }
    var parts = [];
    if (reads > 0) parts.push('Read ' + reads + ' file' + (reads !== 1 ? 's' : ''));
    if (globs > 0) parts.push(globs + ' glob search' + (globs !== 1 ? 'es' : ''));
    if (greps > 0) parts.push(greps + ' grep search' + (greps !== 1 ? 'es' : ''));
    return parts.join(', ');
  }

  var listContainer = document.getElementById('projects-list');
  var newBtn = document.querySelector('.projects__new-btn');

  // Modal elements — create/edit
  var projectOverlay = document.getElementById('project-modal-overlay');
  var projectForm = document.getElementById('project-form');
  var modalTitle = document.getElementById('modal-title');
  var submitBtn = projectForm.querySelector('.modal__submit');
  var nameInput = document.getElementById('project-name');
  var descInput = document.getElementById('project-description');
  var goalsInput = document.getElementById('project-goals');
  var constraintsInput = document.getElementById('project-constraints');
  var briefInput = document.getElementById('project-brief');
  var statusSelect = document.getElementById('project-status');
  var nameError = nameInput.parentElement.querySelector('.modal__error');
  var advancedToggle = document.getElementById('advanced-toggle');
  var advancedFields = document.getElementById('advanced-fields');
  var advancedOpen = false;

  // Modal elements — delete
  var deleteOverlay = document.getElementById('delete-modal-overlay');
  var deleteNameEl = document.getElementById('delete-project-name');
  var deleteBtn = deleteOverlay.querySelector('.modal__delete');

  // Modal elements — kickoff
  var kickoffOverlay = document.getElementById('kickoff-modal-overlay');
  var kickoffPromptEl = document.getElementById('kickoff-prompt-text');
  var kickoffCopyBtn = kickoffOverlay.querySelector('.kickoff__copy-btn');

  // State
  var projects = [];
  var detailCache = {};  // id -> full project data (with notes, kickoffPrompt)
  var editingId = null;
  var deletingId = null;
  var expandedId = null;
  var triggerElement = null;

  // Session state
  var activeEventSource = null;       // Current SSE EventSource connection
  var activeSessionProjectId = null;  // Which project the active SSE is for
  var activeSessionId = null;         // Which session the active SSE is for
  var sessionEvents = [];             // Events for the currently displayed session
  var sessionTimerInterval = null;    // Timer interval for running sessions
  var sessionStartTime = null;        // When the displayed session started
  var viewingSessionId = null;        // Which session log is being viewed (may differ from active)
  var autoScrollEnabled = true;       // Whether to auto-scroll the session log
  var currentStreamingEvent = null;   // Current streaming text event element
  var lastEventId = -1;               // Last event ID received (for reconnection)
  var MAX_RENDERED_EVENTS = 500;      // Max events to render in the DOM
  var sessionIsLive = false;           // Whether the current session is live (affects panel defaults)
  var sessionRunnerState = 'unknown';  // 'processing' | 'idle' | 'ended' | 'unknown'

  // Work Log state
  var workLogSessions = [];             // Session metadata from work-log response (for dividers)
  var workLogTotalDuration = 0;         // Accumulated duration across all sessions (ms)

  // Agent tracking state
  var activeAgents = {};   // taskId -> agentSlug (e.g., 'pm')
  var currentAgent = null; // Most recently spawned agent slug
  var lastTaskToolName = null; // Name from the most recent Task tool_use (for taskId mapping)

  // Pipeline phase tracking
  var pipelinePhase = null;     // Current phase slug: 'research'|'scoping'|'architecture'|'design'|'implementation'|'qa'|null
  var completedPhases = {};     // { 'research': true, 'scoping': true, ... }

  // Team activity tracking
  var teamAgents = [];          // Ordered list of { slug, status, taskDescription, spawnTime }
  var teamAgentIndex = {};      // slug -> index in teamAgents (for dedup and status updates)
  var lastTaskOutputAgent = null; // Agent slug from the most recent TaskOutput tool_use

  // File deliverables tracking
  var deliverableFiles = {};    // filePath -> { path, displayPath, action, agent, agentName, time, editCount, category }
  var deliverableOrder = [];    // filePaths in order of first appearance

  // Event grouping state
  var currentGroup = null; // { tools: [], events: [], element: null } or null
  var lastToolClassification = null; // Classification of the last tool_use event

  if (!listContainer) return;

  // --- API ---

  function apiGet() {
    return fetch(API_BASE)
      .then(function (res) {
        if (!res.ok) throw new Error('Failed to load projects');
        return res.json();
      })
      .then(function (data) { return data.projects; });
  }

  function apiGetOne(id) {
    return fetch(API_BASE + '/' + encodeURIComponent(id))
      .then(function (res) {
        if (!res.ok) throw new Error('Failed to load project');
        return res.json();
      });
  }

  function apiCreate(body) {
    return fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(function (res) {
      if (!res.ok) return res.json().then(function (err) { throw err; });
      return res.json();
    });
  }

  function apiUpdate(id, body) {
    return fetch(API_BASE + '/' + encodeURIComponent(id), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(function (res) {
      if (!res.ok) return res.json().then(function (err) { throw err; });
      return res.json();
    });
  }

  function apiDelete(id) {
    return fetch(API_BASE + '/' + encodeURIComponent(id), {
      method: 'DELETE',
    }).then(function (res) {
      if (!res.ok) throw new Error('Delete failed');
    });
  }

  function apiStart(id) {
    return fetch(API_BASE + '/' + encodeURIComponent(id) + '/start', {
      method: 'POST',
    }).then(function (res) {
      if (!res.ok) return res.json().then(function (err) { throw err; });
      return res.json();
    });
  }

  function apiAddNote(projectId, content) {
    return fetch(API_BASE + '/' + encodeURIComponent(projectId) + '/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: content }),
    }).then(function (res) {
      if (!res.ok) return res.json().then(function (err) { throw err; });
      return res.json();
    });
  }

  function apiDeleteNote(projectId, noteId) {
    return fetch(API_BASE + '/' + encodeURIComponent(projectId) + '/notes/' + encodeURIComponent(noteId), {
      method: 'DELETE',
    }).then(function (res) {
      if (!res.ok) throw new Error('Delete note failed');
    });
  }

  // --- Session API ---

  function apiStartSession(projectId) {
    return fetch(API_BASE + '/' + encodeURIComponent(projectId) + '/sessions', {
      method: 'POST',
    }).then(function (res) {
      if (!res.ok) return res.json().then(function (err) { throw err; });
      return res.json();
    });
  }

  function apiStopSession(projectId, sessionId) {
    return fetch(API_BASE + '/' + encodeURIComponent(projectId) + '/sessions/' + encodeURIComponent(sessionId) + '/stop', {
      method: 'POST',
    }).then(function (res) {
      if (!res.ok) return res.json().then(function (err) { throw err; });
      return res.json();
    });
  }

  function apiSendMessage(projectId, sessionId, message) {
    return fetch(
      API_BASE + '/' + encodeURIComponent(projectId) +
      '/sessions/' + encodeURIComponent(sessionId) + '/message',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message }),
      }
    ).then(function (res) {
      if (!res.ok) return res.json().then(function (err) { throw err; });
      return res.json();
    });
  }

  function apiGetWorkLog(projectId, offset) {
    var url = API_BASE + '/' + encodeURIComponent(projectId) + '/work-log';
    if (offset) url += '?offset=' + offset;
    return fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error('Failed to load work log');
        return res.json();
      });
  }

  // --- Rendering ---

  function renderList() {
    if (projects.length === 0) {
      listContainer.innerHTML =
        '<div class="projects__empty">' +
          '<p class="projects__empty-text">No projects yet.</p>' +
          '<p class="projects__empty-hint">Click "New Project" to get started.</p>' +
        '</div>';
      renderPipelineStatsRow([]);
      return;
    }
    listContainer.innerHTML = projects.map(renderCard).join('');
    renderPipelineStatsRow(projects);

    // Re-expand if a card was expanded
    if (expandedId) {
      var card = listContainer.querySelector('[data-project-id="' + CSS.escape(expandedId) + '"]');
      if (card) {
        var header = card.querySelector('.project-card__header');
        var details = card.querySelector('.project-card__details');
        header.setAttribute('aria-expanded', 'true');
        details.setAttribute('aria-hidden', 'false');
        if (detailCache[expandedId]) {
          renderDetailView(expandedId);
          loadWorkLog(expandedId);
        }
      }
    }
  }

  function renderCard(project) {
    var statusLabel = formatStatus(project.status);
    var dateStr = formatDate(project);

    // Pipeline data for card enhancements
    var pl = project.pipeline;
    var taskCount = pipelineGetTaskCount(pl);
    var hasPipeline = taskCount > 0;

    // Avatar cluster (max 5 + overflow)
    var avatarsHTML = '';
    if (hasPipeline) {
      var agents = pipelineGetAgents(pl);
      var maxAvatars = 5;
      var shown = agents.slice(0, maxAvatars);
      var overflow = agents.length - maxAvatars;

      shown.forEach(function (name) {
        avatarsHTML += '<img class="project-card__avatar" src="img/avatars/' + name + '.svg" alt="" width="24" height="24">';
      });
      if (overflow > 0) {
        avatarsHTML += '<span class="project-card__avatar-overflow">+' + overflow + '</span>';
      }
      avatarsHTML = '<div class="project-card__avatars">' + avatarsHTML + '</div>';
    }

    // Pipeline stat counts
    var pipelineStatsHTML = '';
    if (hasPipeline) {
      var fileCount = pipelineGetFileCount(pl);
      pipelineStatsHTML = '<span class="project-card__pipeline-stats">' + taskCount + ' tasks  ' + fileCount + ' files</span>';
    }

    return (
      '<article class="project-card" data-project-id="' + escapeAttr(project.id) + '">' +
        '<div class="project-card__header-row">' +
          '<button class="project-card__header" type="button" aria-expanded="false">' +
            '<div class="project-card__summary">' +
              '<h3 class="project-card__name">' + escapeHTML(project.name) + '</h3>' +
              '<p class="project-card__desc">' + escapeHTML(project.description || '') + '</p>' +
            '</div>' +
            '<div class="project-card__meta">' +
              avatarsHTML +
              pipelineStatsHTML +
              (project.activeSessionId ? '<span class="project-card__running-indicator" title="Working"></span>' : '') +
              '<span class="project-card__badge" data-status="' + escapeAttr(project.status) + '">' + statusLabel + '</span>' +
              '<span class="project-card__date">' + escapeHTML(dateStr) + '</span>' +
            '</div>' +
            '<span class="project-card__chevron" aria-hidden="true"></span>' +
          '</button>' +
          '<div class="project-card__actions">' +
            '<button class="project-card__action-btn project-card__action-btn--edit" type="button" aria-label="Edit project" title="Edit">Edit</button>' +
            '<button class="project-card__action-btn project-card__action-btn--delete" type="button" aria-label="Delete project" title="Delete">Delete</button>' +
          '</div>' +
        '</div>' +
        '<div class="project-card__details" aria-hidden="true">' +
          '<div class="project-card__details-inner"></div>' +
        '</div>' +
      '</article>'
    );
  }

  function renderDetailViewAndWorkLog(id) {
    renderDetailView(id);
    loadWorkLog(id);
  }

  function renderDetailView(id) {
    var card = listContainer.querySelector('[data-project-id="' + CSS.escape(id) + '"]');
    if (!card) return;
    var inner = card.querySelector('.project-card__details-inner');
    var project = detailCache[id];
    if (!project) return;

    var hasGoals = project.goals && project.goals.trim();
    var hasConstraints = project.constraints && project.constraints.trim();
    var hasBrief = project.brief && project.brief.trim();
    var allEmpty = !hasGoals && !hasConstraints && !hasBrief;

    var html = '';

    // Detail fields
    if (allEmpty) {
      html +=
        '<div class="detail__fields-empty">' +
          '<p class="detail__fields-empty-text">No project details yet.</p>' +
          '<button class="detail__fields-empty-action" type="button" data-action="edit-details">Add goals, constraints, and brief</button>' +
        '</div>';
    } else {
      html += '<div class="detail__fields">';
      html += renderDetailField('Goals', project.goals, 'No goals set');
      html += renderDetailField('Constraints', project.constraints, 'No constraints set');
      html += renderDetailField('Brief', project.brief, 'No brief written');
      html += '</div>';
    }

    // Dates
    html += '<div class="detail__dates">';
    html += '<span class="detail__date">Created ' + formatDateLong(project.createdAt) + '</span>';
    html += '<span class="detail__date">Updated ' + formatDateLong(project.updatedAt) + '</span>';
    if (project.completedAt) {
      html += '<span class="detail__date">Completed ' + formatDateLong(project.completedAt) + '</span>';
    }
    html += '</div>';

    // Action area
    html += '<div class="detail__action-area">';
    if (project.status === 'planned') {
      html += '<button class="detail__start-btn" type="button">Start Work</button>';
    } else if (project.status === 'in-progress' || project.status === 'completed') {
      html += renderWorkControls(project);
    }
    html += '</div>';

    // Work Log placeholder (populated by loadWorkLog)
    html += '<div class="session-log-container" data-project-id="' + escapeAttr(id) + '"></div>';

    // Pipeline section (conditional — only when pipeline tasks exist)
    if (project.pipeline && project.pipeline.tasks && project.pipeline.tasks.length > 0) {
      html += renderPipelineSection(project.pipeline.tasks);
    }

    // Work items section placeholder (rendered async after innerHTML set)
    if (project.slug) {
      html += '<div class="detail__work-items-container" data-project-id="' + escapeAttr(id) + '"></div>';
    }

    // Progress notes
    if (project.status === 'in-progress' || project.status === 'completed') {
      var readonlyClass = project.status === 'completed' ? ' detail__notes--readonly' : '';
      html += '<div class="detail__notes' + readonlyClass + '">';
      html += '<div class="detail__notes-header"><span class="detail__label">Progress Notes</span></div>';

      if (project.status === 'in-progress') {
        html +=
          '<div class="detail__notes-form">' +
            '<input class="detail__notes-input" type="text" placeholder="Add a progress note..." autocomplete="off">' +
            '<button class="detail__notes-add-btn" type="button">Add</button>' +
          '</div>';
      }

      var notes = project.notes || [];
      if (notes.length > 0) {
        html += '<div class="detail__notes-list">';
        for (var i = 0; i < notes.length; i++) {
          html += renderNote(notes[i]);
        }
        html += '</div>';
      } else {
        html += '<p class="detail__notes-empty">No progress notes yet.</p>';
      }

      html += '</div>';
    }

    inner.innerHTML = html;

    // Render spreadsheet data section (after Progress Notes)
    renderDataSection(id, inner);

    // Render work items section (after Pipeline, before Progress Notes)
    if (project.slug) {
      var wiContainer = inner.querySelector('.detail__work-items-container[data-project-id="' + CSS.escape(id) + '"]');
      if (wiContainer) {
        renderWorkItemsSection(id, project.slug, wiContainer);
      }
    }
  }

  // ===================================================================
  // Pipeline Rendering (ported from portfolio.js)
  // ===================================================================

  // --- Pipeline Stats Row ---

  function computePipelineStats(projectList) {
    var totalProjects = projectList.length;
    var completedProjects = 0;
    var agentsSet = {};
    var totalTasks = 0;
    var totalFiles = 0;
    var totalDecisions = 0;

    projectList.forEach(function (p) {
      if (p.status === 'completed') completedProjects++;
      var pl = p.pipeline;
      if (!pl) return;
      // List endpoint returns flat stats: taskCount, fileCount, decisionCount, agents[]
      if (typeof pl.taskCount === 'number') {
        totalTasks += pl.taskCount;
        totalFiles += pl.fileCount || 0;
        totalDecisions += pl.decisionCount || 0;
        if (pl.agents) {
          pl.agents.forEach(function (a) { agentsSet[a.toLowerCase()] = true; });
        }
      } else if (pl.tasks && pl.tasks.length > 0) {
        // Fallback: full tasks array (e.g. from detail cache)
        pl.tasks.forEach(function (t) {
          totalTasks++;
          agentsSet[t.agent.toLowerCase()] = true;
          if (t.filesChanged) totalFiles += t.filesChanged.length;
          if (t.decisions) totalDecisions += t.decisions.length;
        });
      }
    });

    return {
      totalProjects: totalProjects,
      completedProjects: completedProjects,
      uniqueAgents: Object.keys(agentsSet).length,
      totalTasks: totalTasks,
      totalFiles: totalFiles,
      totalDecisions: totalDecisions
    };
  }

  function renderPipelineStatsRow(projectList) {
    var statsContainer = document.getElementById('projects-stats');
    if (!statsContainer) return;

    if (projectList.length === 0) {
      statsContainer.innerHTML = '';
      return;
    }

    var stats = computePipelineStats(projectList);
    var items = [
      { value: stats.totalProjects, label: 'Projects' },
      { value: stats.completedProjects, label: 'Completed' },
      { value: stats.uniqueAgents, label: 'Agents' },
      { value: stats.totalTasks, label: 'Tasks' },
      { value: stats.totalFiles, label: 'Files' },
      { value: stats.totalDecisions, label: 'Decisions' }
    ];

    statsContainer.innerHTML = items.map(function (item) {
      return (
        '<div class="projects__stat">' +
          '<div class="projects__stat-value">' + item.value + '</div>' +
          '<div class="projects__stat-label">' + item.label + '</div>' +
        '</div>'
      );
    }).join('');
  }

  // --- Pipeline Card Helpers ---

  function pipelineGetAgents(pipeline) {
    if (!pipeline) return [];
    // List endpoint: agents is a flat array
    if (pipeline.agents) return pipeline.agents;
    // Full tasks array fallback
    if (!pipeline.tasks) return [];
    var seen = {};
    var agents = [];
    pipeline.tasks.forEach(function (t) {
      var key = t.agent.toLowerCase();
      if (!seen[key]) {
        seen[key] = true;
        agents.push(key);
      }
    });
    return agents;
  }

  function pipelineGetTaskCount(pipeline) {
    if (!pipeline) return 0;
    if (typeof pipeline.taskCount === 'number') return pipeline.taskCount;
    return pipeline.tasks ? pipeline.tasks.length : 0;
  }

  function pipelineGetFileCount(pipeline) {
    if (!pipeline) return 0;
    if (typeof pipeline.fileCount === 'number') return pipeline.fileCount;
    if (!pipeline.tasks) return 0;
    var count = 0;
    pipeline.tasks.forEach(function (t) {
      if (t.filesChanged) count += t.filesChanged.length;
    });
    return count;
  }

  // --- Pipeline Detail Rendering ---

  function pipelineGetContributors(tasks) {
    var map = {};
    if (!tasks) return [];
    tasks.forEach(function (t) {
      var key = t.agent.toLowerCase();
      if (!map[key]) {
        map[key] = { name: t.agent, subtasks: 0, files: 0 };
      }
      if (t.subtasks) map[key].subtasks += t.subtasks.length;
      if (t.filesChanged) map[key].files += t.filesChanged.length;
    });
    var contributors = Object.keys(map).map(function (k) { return map[k]; });
    contributors.sort(function (a, b) { return b.subtasks - a.subtasks; });
    return contributors;
  }

  function pipelineGetAllDecisions(tasks) {
    var decisions = [];
    if (!tasks) return decisions;
    tasks.forEach(function (t) {
      if (t.decisions && t.decisions.length > 0) {
        t.decisions.forEach(function (d) {
          decisions.push({ agent: t.agent, text: d });
        });
      }
    });
    return decisions;
  }

  function pipelineHasDetails(task) {
    return (task.subtasks && task.subtasks.length > 0) ||
           (task.filesChanged && task.filesChanged.length > 0) ||
           (task.decisions && task.decisions.length > 0);
  }

  function pipelineFormatStatus(status) {
    switch (status) {
      case 'completed': return 'Completed';
      case 'in-progress': return 'In Progress';
      case 'planned': return 'Planned';
      case 'blocked': return 'Blocked';
      case 'skipped': return 'Skipped';
      case 'pending': return 'Pending';
      default: return status;
    }
  }

  function renderPipelineTaskItem(task) {
    var agentKey = task.agent.toLowerCase();
    var expandable = pipelineHasDetails(task);
    var detailsHTML = expandable ? renderPipelineTaskDetails(task) : '';
    var chevronHTML = expandable
      ? '<span class="task-item__chevron" aria-hidden="true"></span>'
      : '';

    var headerTag = expandable ? 'button' : 'div';
    var ariaAttrs = expandable ? ' aria-expanded="false" type="button"' : '';
    var expandableClass = expandable ? ' task-item--expandable' : '';

    // Handle multi-agent rows (e.g. "Nina, Soren, Amara")
    var names = task.agent.split(',');
    var avatarHTML;
    if (names.length > 1) {
      avatarHTML = '<div class="task-item__avatar task-item__avatar--group" aria-hidden="true">';
      for (var i = 0; i < names.length; i++) {
        var name = names[i].trim().toLowerCase();
        avatarHTML += '<img class="task-item__avatar-stacked" src="img/avatars/' + name + '.svg" alt="" width="20" height="20">';
      }
      avatarHTML += '</div>';
    } else {
      avatarHTML = '<div class="task-item__avatar" aria-hidden="true">' +
        '<img src="img/avatars/' + agentKey + '.svg" alt="" width="32" height="32" style="width:100%;height:100%;border-radius:50%;">' +
      '</div>';
    }

    return (
      '<div class="task-item' + expandableClass + '">' +
        '<' + headerTag + ' class="task-item__header"' + ariaAttrs + '>' +
          avatarHTML +
          '<div class="task-item__content">' +
            '<div class="task-item__agent-line">' +
              '<span class="task-item__agent">' + escapeHTML(task.agent) + '</span>' +
              '<span class="task-item__role">' + escapeHTML(task.role) + '</span>' +
            '</div>' +
            '<p class="task-item__title">' + escapeHTML(task.title) + '</p>' +
          '</div>' +
          '<span class="task-item__status" data-status="' + task.status + '" aria-label="' + pipelineFormatStatus(task.status) + '"></span>' +
          chevronHTML +
        '</' + headerTag + '>' +
        detailsHTML +
      '</div>'
    );
  }

  function renderPipelineTaskDetails(task) {
    var sections = [];

    if (task.subtasks && task.subtasks.length > 0) {
      var items = task.subtasks.map(function (s) {
        return '<li>' + escapeHTML(s) + '</li>';
      }).join('');
      sections.push(
        '<div class="task-item__subtasks">' +
          '<ul>' + items + '</ul>' +
        '</div>'
      );
    }

    if (task.filesChanged && task.filesChanged.length > 0) {
      var pills = task.filesChanged.map(function (f) {
        return '<span class="task-item__file-pill">' + escapeHTML(f) + '</span>';
      }).join('');
      sections.push(
        '<div class="task-item__files">' +
          '<span class="task-item__detail-label">Files changed</span>' +
          '<div class="task-item__file-list">' + pills + '</div>' +
        '</div>'
      );
    }

    if (task.decisions && task.decisions.length > 0) {
      var decItems = task.decisions.map(function (d) {
        return '<li>' + escapeHTML(d) + '</li>';
      }).join('');
      sections.push(
        '<div class="task-item__decisions">' +
          '<span class="task-item__detail-label">Decisions</span>' +
          '<ul>' + decItems + '</ul>' +
        '</div>'
      );
    }

    if (task.metadata && task.metadata.screenshotPath) {
      sections.push(
        '<div class="task-item__screenshot">' +
          '<span class="task-item__detail-label">Screenshot</span>' +
          '<div class="task-item__screenshot-thumb">' +
            '<img src="' + escapeHTML(task.metadata.screenshotPath) + '" alt="Bug screenshot" loading="lazy">' +
          '</div>' +
        '</div>'
      );
    }

    return (
      '<div class="task-item__details" aria-hidden="true">' +
        '<div class="task-item__details-inner">' +
          sections.join('') +
        '</div>' +
      '</div>'
    );
  }

  function renderPipelineContributors(tasks) {
    var contributors = pipelineGetContributors(tasks);
    if (contributors.length === 0) return '';

    // Hide contributors if all have zero subtasks and zero files
    var hasAnyContent = false;
    for (var i = 0; i < contributors.length; i++) {
      if (contributors[i].subtasks > 0 || contributors[i].files > 0) {
        hasAnyContent = true;
        break;
      }
    }
    if (!hasAnyContent) return '';

    var items = contributors.map(function (c) {
      var key = c.name.toLowerCase();
      var summary = c.subtasks + ' subtask' + (c.subtasks !== 1 ? 's' : '') +
                    ', ' + c.files + ' file' + (c.files !== 1 ? 's' : '');
      return (
        '<div class="pipeline__contributor">' +
          '<img class="pipeline__contributor-avatar" src="img/avatars/' + key + '.svg" alt="" width="20" height="20">' +
          '<span class="pipeline__contributor-name">' + escapeHTML(c.name) + '</span>' +
          '<span class="pipeline__contributor-summary">' + summary + '</span>' +
        '</div>'
      );
    }).join('');

    return (
      '<div class="pipeline__contributors">' +
        '<span class="task-item__detail-label">Contributors</span>' +
        '<div class="pipeline__contributors-list">' + items + '</div>' +
      '</div>'
    );
  }

  function renderPipelineDecisions(tasks) {
    var allDecisions = pipelineGetAllDecisions(tasks);
    if (allDecisions.length === 0) return '';

    var items = allDecisions.map(function (d) {
      return (
        '<li>' +
          '<strong class="pipeline__decision-agent">' + escapeHTML(d.agent) + '</strong> — ' +
          escapeHTML(d.text) +
        '</li>'
      );
    }).join('');

    return (
      '<div class="pipeline__decisions-rollup">' +
        '<button class="pipeline__decisions-toggle" type="button" aria-expanded="false">' +
          '<span class="pipeline__decisions-toggle-text">Key Decisions (' + allDecisions.length + ')</span>' +
          '<span class="pipeline__decisions-toggle-chevron" aria-hidden="true"></span>' +
        '</button>' +
        '<div class="pipeline__decisions-content" aria-hidden="true">' +
          '<div class="pipeline__decisions-content-inner">' +
            '<ul class="pipeline__decisions-list">' + items + '</ul>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  function renderPipelineSection(pipelineTasks) {
    if (!pipelineTasks || pipelineTasks.length === 0) return '';

    var taskCount = pipelineTasks.length;
    var fileCount = 0;
    var decisionCount = 0;
    pipelineTasks.forEach(function (t) {
      if (t.filesChanged) fileCount += t.filesChanged.length;
      if (t.decisions) decisionCount += t.decisions.length;
    });

    var metricsHTML =
      '<div class="pipeline__metrics">' +
        '<div class="pipeline__metric">' +
          '<span class="pipeline__metric-value">' + taskCount + '</span>' +
          '<span class="pipeline__metric-label">tasks</span>' +
        '</div>' +
        '<div class="pipeline__metric">' +
          '<span class="pipeline__metric-value">' + fileCount + '</span>' +
          '<span class="pipeline__metric-label">files</span>' +
        '</div>' +
        '<div class="pipeline__metric">' +
          '<span class="pipeline__metric-value">' + decisionCount + '</span>' +
          '<span class="pipeline__metric-label">decisions</span>' +
        '</div>' +
      '</div>';

    var tasksHTML = pipelineTasks.map(renderPipelineTaskItem).join('');
    var contributorsHTML = renderPipelineContributors(pipelineTasks);
    var decisionsHTML = renderPipelineDecisions(pipelineTasks);

    return (
      '<div class="pipeline__section">' +
        '<span class="detail__label">Pipeline</span>' +
        metricsHTML +
        '<div class="pipeline__task-list">' + tasksHTML + '</div>' +
        contributorsHTML +
        decisionsHTML +
      '</div>'
    );
  }

  // ===================================================================
  // End Pipeline Rendering
  // ===================================================================

  // --- Spreadsheet Data Section ---

  var _spreadsheetInstances = {}; // projectId -> [TeamHQSpreadsheet]
  var _workItemGrids = {};         // projectId -> agGrid API instance
  var _workItemPrefixes = {};      // projectId -> taskPrefix string

  function renderDataSection(projectId, containerEl) {
    // Clean up previous instances for this project
    if (_spreadsheetInstances[projectId]) {
      for (var k = 0; k < _spreadsheetInstances[projectId].length; k++) {
        _spreadsheetInstances[projectId][k].destroy();
      }
    }
    _spreadsheetInstances[projectId] = [];

    // Guard: if TeamHQSpreadsheet is not available, skip
    if (typeof TeamHQSpreadsheet === 'undefined' || typeof agGrid === 'undefined') return;

    fetch('data/spreadsheets/index.json')
      .then(function (res) {
        if (!res.ok) return null;
        return res.json();
      })
      .then(function (index) {
        if (!index || !index[projectId] || index[projectId].length === 0) return;

        var files = index[projectId];
        var sectionEl = document.createElement('div');
        sectionEl.className = 'detail__section detail__data-section';
        sectionEl.innerHTML = '<h4 class="detail__label">Data</h4>';
        containerEl.appendChild(sectionEl);

        files.forEach(function (meta) {
          var filename = meta.file || meta;
          fetch('data/spreadsheets/' + projectId + '/' + filename)
            .then(function (res) { return res.json(); })
            .then(function (data) {
              var wrapper = document.createElement('div');
              wrapper.className = 'detail__spreadsheet';

              // Header: name + density toggle
              var density = TeamHQSpreadsheet.getSavedDensity();
              var header = document.createElement('div');
              header.className = 'thq-spreadsheet-header';
              header.innerHTML =
                '<div class="thq-spreadsheet-header__info">' +
                  '<h5 class="thq-spreadsheet-header__name">' + escapeHTML(data.name) + '</h5>' +
                  (data.description ? '<p class="thq-spreadsheet-header__desc">' + escapeHTML(data.description) + '</p>' : '') +
                '</div>' +
                '<div class="thq-spreadsheet-header__controls" role="group" aria-label="Table density">' +
                  '<button class="thq-density-toggle' + (density === 'compact' ? ' thq-density-toggle--active' : '') + '"' +
                    ' type="button" data-density="compact" aria-pressed="' + (density === 'compact') + '">Compact</button>' +
                  '<button class="thq-density-toggle' + (density === 'comfortable' ? ' thq-density-toggle--active' : '') + '"' +
                    ' type="button" data-density="comfortable" aria-pressed="' + (density === 'comfortable') + '">Comfortable</button>' +
                '</div>';
              wrapper.appendChild(header);

              // Grid container
              var gridContainer = document.createElement('div');
              wrapper.appendChild(gridContainer);
              sectionEl.appendChild(wrapper);

              var table = new TeamHQSpreadsheet(gridContainer, data);
              _spreadsheetInstances[projectId] = _spreadsheetInstances[projectId] || [];
              _spreadsheetInstances[projectId].push(table);

              // Density toggle wiring
              header.addEventListener('click', function (e) {
                var btn = e.target.closest('.thq-density-toggle');
                if (!btn) return;
                var newDensity = btn.getAttribute('data-density');
                table.setDensity(newDensity);

                // Update button states within this header
                var toggles = header.querySelectorAll('.thq-density-toggle');
                for (var i = 0; i < toggles.length; i++) {
                  var isActive = toggles[i].getAttribute('data-density') === newDensity;
                  toggles[i].classList.toggle('thq-density-toggle--active', isActive);
                  toggles[i].setAttribute('aria-pressed', isActive ? 'true' : 'false');
                }
              });
            })
            .catch(function () { /* silently skip failed loads */ });
        });
      })
      .catch(function () { /* no index file — no data section */ });
  }

  function renderDetailField(label, value, placeholder) {
    var hasValue = value && value.trim();
    var cls = hasValue ? 'detail__value' : 'detail__value detail__value--empty';
    var text = hasValue ? escapeHTML(value) : placeholder;
    return (
      '<div class="detail__field">' +
        '<span class="detail__label">' + label + '</span>' +
        '<p class="' + cls + '">' + text + '</p>' +
      '</div>'
    );
  }

  function renderNote(note) {
    return (
      '<div class="detail__note" data-note-id="' + escapeAttr(note.id) + '">' +
        '<div class="detail__note-content">' +
          '<p class="detail__note-text">' + escapeHTML(note.content) + '</p>' +
          '<span class="detail__note-time">' + formatRelativeTime(note.createdAt) + '</span>' +
        '</div>' +
        '<button class="detail__note-delete" type="button" aria-label="Delete note">&times;</button>' +
      '</div>'
    );
  }

  // --- Session Rendering ---

  function renderWorkControls(project) {
    var hasActiveSession = !!project.activeSessionId;
    var hasPastSessions = workLogSessions.length > 0;
    var html = '<div class="detail__session-controls">';

    if (hasActiveSession) {
      html +=
        '<div class="detail__session-status">' +
          '<span class="detail__session-indicator detail__session-indicator--running"></span>' +
          '<span class="detail__session-status-text">Working</span>' +
        '</div>' +
        '<button class="detail__stop-btn" type="button" data-session-id="' + escapeAttr(project.activeSessionId) + '">Stop</button>';
    } else {
      var label = 'Continue Work';
      html += '<button class="detail__run-btn" type="button">' + label + '</button>';
    }

    if (project.kickoffPrompt) {
      html += '<button class="detail__kickoff-view-btn" type="button">View Prompt</button>';
    }

    html += '</div>';
    return html;
  }

  function renderWorkLogContainer(options) {
    // options: { totalDurationMs, isLive, loading, empty, error }
    var opts = options || {};
    var timerClass = opts.isLive ? ' session-log__timer--live' : '';
    var timerText = '';
    if (opts.totalDurationMs) {
      timerText = formatDurationShort(opts.totalDurationMs);
    } else if (opts.isLive) {
      timerText = '0:00';
    }

    var bodyContent = '';
    if (opts.loading) {
      bodyContent =
        '<div class="session-log__loading">' +
          '<span class="session-log__loading-text">Loading work log...</span>' +
        '</div>';
    } else if (opts.error) {
      bodyContent =
        '<div class="session-log__error">' +
          '<p class="session-log__error-text">Failed to load work log.</p>' +
        '</div>';
    } else if (opts.empty) {
      bodyContent =
        '<div class="session-log__empty">' +
          '<p class="session-log__empty-text">No work logged yet.</p>' +
          '<p class="session-log__empty-subtext">Start work to begin tracking progress.</p>' +
        '</div>';
    } else {
      bodyContent =
        '<div class="session-log__events"></div>' +
        '<div class="session-log__jump" aria-hidden="true">' +
          '<button class="session-log__jump-btn" type="button">Jump to latest</button>' +
        '</div>';
    }

    var panelsHtml = (!opts.loading && !opts.error && !opts.empty)
      ? '<div class="session-panels">' +
          '<div class="pipeline-indicator" aria-label="Pipeline progress"></div>' +
          '<div class="team-activity" aria-hidden="true"></div>' +
          '<div class="file-deliverables" aria-hidden="true"></div>' +
        '</div>'
      : '';

    var inputBarHtml = (!opts.loading && !opts.error && !opts.empty)
      ? '<div class="session-log__input-bar" aria-hidden="true">' +
          '<input class="session-log__input" type="text" placeholder="Reply to the team..." autocomplete="off" maxlength="10000" aria-label="Reply to the session">' +
          '<button class="session-log__send-btn" type="button" disabled>Send</button>' +
          '<span class="session-log__input-error" role="alert" aria-hidden="true"></span>' +
        '</div>'
      : '';

    return (
      '<div class="session-log" aria-label="Work Log">' +
        '<div class="session-log__header">' +
          '<span class="session-log__title">Work Log</span>' +
          '<span class="session-log__timer' + timerClass + '">' + timerText + '</span>' +
        '</div>' +
        panelsHtml +
        '<div class="session-log__body" role="log" aria-live="polite">' +
          bodyContent +
        '</div>' +
        inputBarHtml +
      '</div>'
    );
  }

  function renderSessionDivider(sessionMeta) {
    var dateStr = formatSessionDate(sessionMeta.startedAt);
    var durationStr = sessionMeta.durationMs ? formatDurationShort(sessionMeta.durationMs) : '';
    var ariaLabel = 'Work block started ' + dateStr;
    if (durationStr) ariaLabel += ', duration ' + durationStr;

    var labelContent = '<span class="session-divider__date">' + escapeHTML(dateStr) + '</span>';
    if (durationStr) {
      labelContent +=
        '<span class="session-divider__dot" aria-hidden="true"></span>' +
        '<span class="session-divider__duration">' + escapeHTML(durationStr) + '</span>';
    }

    return (
      '<div class="session-divider" role="separator" aria-label="' + escapeAttr(ariaLabel) + '">' +
        '<div class="session-divider__line"></div>' +
        '<div class="session-divider__label">' +
          labelContent +
        '</div>' +
        '<div class="session-divider__line"></div>' +
      '</div>'
    );
  }

  function renderSessionEvent(event) {
    var timeStr = formatRelativeSessionTime(event.timestamp);

    // Semantic tool_use events get special rendering
    if (event.type === 'tool_use') {
      var tool = event.data.tool;
      if (tool === 'Task') return renderAgentBanner(event, timeStr);
      if (tool === 'SendMessage') return renderMessageCard(event, timeStr);
      if (tool === 'TeamCreate' || tool === 'TeamDelete') return renderTeamLifecycle(event, timeStr);
      if (tool === 'TaskOutput') return renderWaitingIndicator(event, timeStr);
      if (HIDDEN_TOOLS[tool]) return '';
    }

    switch (event.type) {
      case 'assistant_text':
        return renderAssistantTextEvent(event, timeStr);
      case 'tool_use':
        return renderToolUseEvent(event, timeStr);
      case 'tool_result':
        return renderToolResultEvent(event, timeStr);
      case 'system':
        return renderSystemEvent(event, timeStr);
      case 'error':
        return renderErrorEvent(event, timeStr);
      case 'waiting_for_input':
        return renderWaitingForInputEvent(event, timeStr);
      case 'user_message':
        return renderUserMessageEvent(event, timeStr);
      default:
        return '';
    }
  }

  function renderAssistantTextEvent(event, timeStr) {
    var isDelta = event.data && event.data.delta;
    var streamClass = isDelta ? ' session-event--streaming' : '';
    return (
      '<div class="session-event session-event--text' + streamClass + '" data-event-id="' + event.id + '">' +
        '<span class="session-event__time">' + timeStr + '</span>' +
        '<div class="session-event__body">' +
          '<div class="session-event__content session-event__prose">' + renderMarkdown(event.data.text || '') + '</div>' +
        '</div>' +
      '</div>'
    );
  }

  function renderToolUseEvent(event, timeStr) {
    var toolName = event.data.tool || 'Unknown';
    var inputSummary = getToolInputSummary(event.data.tool, event.data.input);
    return (
      '<div class="session-event session-event--tool-use" data-event-id="' + event.id + '">' +
        '<span class="session-event__time">' + timeStr + '</span>' +
        '<div class="session-event__body">' +
          '<span class="session-event__tool-icon" aria-hidden="true"></span>' +
          '<span class="session-event__tool-name">' + escapeHTML(toolName) + '</span>' +
          '<span class="session-event__tool-input">' + escapeHTML(inputSummary) + '</span>' +
        '</div>' +
      '</div>'
    );
  }

  function renderToolResultEvent(event, timeStr) {
    var toolName = event.data.tool || '';
    var isTruncated = event.data.truncated;
    var truncatedClass = isTruncated ? ' session-event__result-truncated--visible' : '';
    var output = event.data.output || '';
    return (
      '<div class="session-event session-event--tool-result" data-event-id="' + event.id + '">' +
        '<span class="session-event__time">' + timeStr + '</span>' +
        '<div class="session-event__body">' +
          '<button class="session-event__result-toggle" type="button" aria-expanded="false">' +
            '<span class="session-event__result-chevron" aria-hidden="true"></span>' +
            '<span class="session-event__tool-name session-event__tool-name--result">' + escapeHTML(toolName) + '</span>' +
            '<span class="session-event__result-label">result</span>' +
            '<span class="session-event__result-truncated' + truncatedClass + '">(truncated)</span>' +
          '</button>' +
          '<div class="session-event__result-content" aria-hidden="true">' +
            '<pre class="session-event__result-output"><code>' + escapeHTML(output) + '</code></pre>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  function renderSystemEvent(event, timeStr) {
    var msg = (event.data && event.data.message) || '';
    var isCompleted = msg.toLowerCase().indexOf('completed') !== -1;
    var extraClass = isCompleted ? ' session-event--system-completed' : '';
    return (
      '<div class="session-event session-event--system' + extraClass + '" data-event-id="' + event.id + '">' +
        '<span class="session-event__time">' + timeStr + '</span>' +
        '<div class="session-event__body">' +
          '<span class="session-event__system-text">' + escapeHTML(msg) + '</span>' +
        '</div>' +
      '</div>'
    );
  }

  function renderErrorEvent(event, timeStr) {
    var msg = (event.data && event.data.message) || 'Unknown error';
    return (
      '<div class="session-event session-event--error" data-event-id="' + event.id + '">' +
        '<span class="session-event__time">' + timeStr + '</span>' +
        '<div class="session-event__body">' +
          '<span class="session-event__error-text">' + escapeHTML(msg) + '</span>' +
        '</div>' +
      '</div>'
    );
  }

  // --- Semantic Event Renderers ---

  function renderAgentBanner(event, timeStr) {
    var input = event.data.input || {};
    var agentSlug = input.name || '';
    var agent = AGENT_REGISTRY[agentSlug];
    var name = agent ? agent.name : agentSlug;
    var role = agent ? agent.role : 'Agent';
    var avatarHtml = agent
      ? '<img class="session-event__agent-avatar" src="img/avatars/' + escapeAttr(agent.avatar) + '.svg" alt="' + escapeAttr(name) + '" width="28" height="28">'
      : '';
    var taskDesc = input.description || input.prompt || '';
    if (taskDesc.length > 120) taskDesc = taskDesc.substring(0, 120) + '...';
    var unknownClass = agent ? '' : ' session-event--agent-unknown';

    return (
      '<div class="session-event session-event--agent-spawn' + unknownClass + '" data-event-id="' + event.id + '">' +
        '<span class="session-event__time">' + timeStr + '</span>' +
        '<div class="session-event__body">' +
          avatarHtml +
          '<div class="session-event__agent-info">' +
            '<span class="session-event__agent-name">' + escapeHTML(name) + '</span>' +
            '<span class="session-event__agent-role">' + escapeHTML(role) + '</span>' +
          '</div>' +
          (taskDesc ? '<span class="session-event__agent-task">' + escapeHTML(taskDesc) + '</span>' : '') +
        '</div>' +
      '</div>'
    );
  }

  function renderMessageCard(event, timeStr) {
    var input = event.data.input || {};
    var recipientSlug = input.recipient || '';
    var recipientAgent = AGENT_REGISTRY[recipientSlug];
    var recipientName = recipientAgent ? recipientAgent.name : recipientSlug;
    var isBroadcast = input.type === 'broadcast';

    // Sender: use currentAgent (most recently spawned agent)
    var senderAgent = currentAgent ? AGENT_REGISTRY[currentAgent] : null;
    var senderName = senderAgent ? senderAgent.name : 'Team Lead';
    var senderAvatarHtml = senderAgent
      ? '<img class="session-event__message-avatar" src="img/avatars/' + escapeAttr(senderAgent.avatar) + '.svg" alt="' + escapeAttr(senderName) + '" width="20" height="20">'
      : '';

    var content = input.summary || input.content || '';
    if (content.length > 200) content = content.substring(0, 200) + '...';

    var recipientClass = isBroadcast ? ' session-event__message-recipient--broadcast' : '';
    var recipientDisplay = isBroadcast ? 'all' : recipientName;

    return (
      '<div class="session-event session-event--message" data-event-id="' + event.id + '">' +
        '<span class="session-event__time">' + timeStr + '</span>' +
        '<div class="session-event__body">' +
          '<div class="session-event__message-header">' +
            senderAvatarHtml +
            '<span class="session-event__message-sender">' + escapeHTML(senderName) + '</span>' +
            '<span class="session-event__message-arrow">-&gt;</span>' +
            '<span class="session-event__message-recipient' + recipientClass + '">' + escapeHTML(recipientDisplay) + '</span>' +
          '</div>' +
          '<p class="session-event__message-content">' + escapeHTML(content) + '</p>' +
        '</div>' +
      '</div>'
    );
  }

  function renderTeamLifecycle(event, timeStr) {
    var tool = event.data.tool;
    var text = tool === 'TeamCreate' ? 'Team created' : 'Team disbanded';

    return (
      '<div class="session-event session-event--lifecycle" data-event-id="' + event.id + '">' +
        '<span class="session-event__time">' + timeStr + '</span>' +
        '<div class="session-event__body">' +
          '<span class="session-event__lifecycle-text">' + escapeHTML(text) + '</span>' +
        '</div>' +
      '</div>'
    );
  }

  function renderWaitingIndicator(event, timeStr) {
    var input = event.data.input || {};
    var taskId = input.taskId || '';
    var agentSlug = activeAgents[taskId];
    var agent = agentSlug ? AGENT_REGISTRY[agentSlug] : null;
    var agentName = agent ? agent.name : 'agent';

    return (
      '<div class="session-event session-event--waiting" data-event-id="' + event.id + '">' +
        '<span class="session-event__time">' + timeStr + '</span>' +
        '<div class="session-event__body">' +
          '<span class="session-event__waiting-text">Waiting for ' + escapeHTML(agentName) + '...</span>' +
          '<span class="session-event__waiting-spinner"></span>' +
        '</div>' +
      '</div>'
    );
  }

  function renderWaitingForInputEvent(event, timeStr) {
    return (
      '<div class="session-event session-event--input-needed" data-event-id="' + event.id + '">' +
        '<span class="session-event__time">' + timeStr + '</span>' +
        '<div class="session-event__body">' +
          '<span class="session-event__input-needed-text">Waiting for your input</span>' +
        '</div>' +
      '</div>'
    );
  }

  function renderUserMessageEvent(event, timeStr) {
    var msg = (event.data && event.data.message) || '';
    return (
      '<div class="session-event session-event--user-message" data-event-id="' + event.id + '">' +
        '<span class="session-event__time">' + timeStr + '</span>' +
        '<div class="session-event__body">' +
          '<span class="session-event__user-label">You</span>' +
          '<p class="session-event__user-text">' + escapeHTML(msg) + '</p>' +
        '</div>' +
      '</div>'
    );
  }

  function renderEventGroup(group) {
    var timeStr = group.events.length > 0 ? formatRelativeSessionTime(group.events[0].timestamp) : '+0:00';
    var summaryText = formatGroupSummary(group.tools);

    // Render individual events for the expandable content
    var innerHtml = '';
    for (var i = 0; i < group.events.length; i++) {
      var evt = group.events[i];
      var evtTime = formatRelativeSessionTime(evt.timestamp);
      innerHtml += renderToolUseEvent(evt, evtTime);
    }

    return (
      '<div class="session-event session-event--group" data-event-id="' + (group.events[0] ? group.events[0].id : '') + '">' +
        '<span class="session-event__time">' + timeStr + '</span>' +
        '<div class="session-event__body">' +
          '<button class="session-event__group-toggle" type="button" aria-expanded="false">' +
            '<span class="session-event__group-chevron" aria-hidden="true"></span>' +
            '<span class="session-event__group-summary">' + escapeHTML(summaryText) + '</span>' +
          '</button>' +
          '<div class="session-event__group-content" aria-hidden="true">' +
            '<div>' + innerHtml + '</div>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  function getToolInputSummary(toolName, input) {
    if (!input) return '';
    switch (toolName) {
      case 'Read':
      case 'Edit':
      case 'Write':
        return input.file_path ? truncateStr(input.file_path, 80) : '';
      case 'Bash':
        return input.command ? truncateStr(input.command, 80) : '';
      case 'Grep':
        return input.pattern ? truncateStr(input.pattern, 80) : '';
      case 'Glob':
        return input.pattern ? truncateStr(input.pattern, 80) : '';
      case 'WebFetch':
        return input.url ? truncateStr(input.url, 80) : '';
      case 'Task':
        return input.name ? ('Spawning ' + (AGENT_REGISTRY[input.name] ? AGENT_REGISTRY[input.name].name : input.name)) : '';
      case 'SendMessage':
        return input.summary || (input.recipient ? ('Message to ' + input.recipient) : '');
      default:
        return '';
    }
  }

  function truncateStr(str, max) {
    if (str.length <= max) return str;
    return str.substring(0, max) + '...';
  }

  // --- Session SSE ---

  function connectWorkLogSSE(projectId, sessionId, offset) {
    // Close any existing SSE (but don't reset state)
    if (activeEventSource) {
      activeEventSource.close();
      activeEventSource = null;
    }

    activeSessionProjectId = projectId;
    activeSessionId = sessionId;
    sessionRunnerState = 'processing';

    var url = API_BASE + '/' + encodeURIComponent(projectId) + '/sessions/' + encodeURIComponent(sessionId) + '/events';
    if (offset > 0) url += '?offset=' + offset;
    activeEventSource = new EventSource(url);

    activeEventSource.addEventListener('session_event', function (e) {
      var event = JSON.parse(e.data);
      lastEventId = event.id;
      appendSessionEvent(projectId, event);
    });

    activeEventSource.addEventListener('session_done', function (e) {
      var data = JSON.parse(e.data);
      handleSessionDone(projectId, data.status, data.durationMs);
      activeEventSource.close();
      activeEventSource = null;
    });

    activeEventSource.onerror = function () {
      // EventSource will auto-reconnect
    };
  }

  function disconnectSession() {
    if (activeEventSource) {
      activeEventSource.close();
      activeEventSource = null;
    }
    stopSessionTimer();
    activeSessionProjectId = null;
    activeSessionId = null;
    viewingSessionId = null;
    sessionEvents = [];
    currentStreamingEvent = null;
    autoScrollEnabled = true;

    // Reset agent tracking and grouping state
    activeAgents = {};
    currentAgent = null;
    lastTaskToolName = null;
    currentGroup = null;
    lastToolClassification = null;
    sessionRunnerState = 'unknown';

    // Reset Phase 2-3 panel state
    sessionIsLive = false;
    pipelinePhase = null;
    completedPhases = {};
    teamAgents = [];
    teamAgentIndex = {};
    lastTaskOutputAgent = null;
    deliverableFiles = {};
    deliverableOrder = [];

    // Reset work log state
    workLogSessions = [];
    workLogTotalDuration = 0;
  }

  function flushGroup(eventsContainer) {
    if (!currentGroup) return;
    if (currentGroup.events.length === 1) {
      // Single event — render as normal tool_use, no group wrapper
      var evt = currentGroup.events[0];
      var div = document.createElement('div');
      div.innerHTML = renderToolUseEvent(evt, formatRelativeSessionTime(evt.timestamp));
      var el = div.firstChild;
      if (el) eventsContainer.appendChild(el);
    } else if (currentGroup.events.length > 1) {
      // Multi-event group — render as collapsed group
      var div = document.createElement('div');
      div.innerHTML = renderEventGroup(currentGroup);
      var el = div.firstChild;
      if (el) eventsContainer.appendChild(el);
    }
    currentGroup = null;
  }

  function appendSessionEvent(projectId, event) {
    sessionEvents.push(event);

    // Set sessionStartTime from the first event's timestamp (fixes historical session timestamps)
    if (sessionStartTime === null && event.timestamp) {
      sessionStartTime = new Date(event.timestamp).getTime();
    }

    // --- Runner state tracking ---
    if (event.type === 'turn_start') {
      sessionRunnerState = 'processing';
      hideInputBar(projectId);
    }
    if (event.type === 'waiting_for_input') {
      sessionRunnerState = 'idle';
      if (sessionIsLive) showInputBar(projectId);
    }

    var eventsContainer = getEventsContainer(projectId);
    if (!eventsContainer) return;

    // Track agent state from Task tool_use events
    if (event.type === 'tool_use' && event.data.tool === 'Task') {
      var agentName = event.data.input && event.data.input.name;
      if (agentName) {
        currentAgent = agentName;
        lastTaskToolName = agentName;
      }
    }

    // Map taskId to agent when we get a tool_result for a Task tool_use
    if (event.type === 'tool_result' && event.data.tool === 'Task' && lastTaskToolName) {
      // Try to extract a task ID from the result
      var output = event.data.output || '';
      // TaskOutput's input has taskId, but Task results may contain an ID
      // Store the mapping using the event ID as a reasonable proxy
      if (event.data.taskId) {
        activeAgents[event.data.taskId] = lastTaskToolName;
      }
      lastTaskToolName = null;
    }

    // --- Phase 2-3: Pipeline, Team Activity, Deliverables State Updates ---

    // Pipeline phase update
    if (event.type === 'tool_use' && event.data.tool === 'Task') {
      var taskAgentName = event.data.input && event.data.input.name;
      if (taskAgentName && AGENT_TO_PHASE[taskAgentName]) {
        var newPhase = AGENT_TO_PHASE[taskAgentName];
        if (pipelinePhase && pipelinePhase !== newPhase) {
          completedPhases[pipelinePhase] = true;
        }
        completedPhases[newPhase] = true;
        pipelinePhase = newPhase;
        updatePipelineIndicator(projectId);
      }
    }

    // Team activity: agent spawned
    if (event.type === 'tool_use' && event.data.tool === 'Task') {
      var agentSlug = event.data.input && event.data.input.name;
      if (agentSlug) {
        var taskDesc = event.data.input.description || event.data.input.prompt || '';
        if (taskDesc.length > 80) taskDesc = taskDesc.substring(0, 80) + '...';

        if (teamAgentIndex.hasOwnProperty(agentSlug)) {
          var idx = teamAgentIndex[agentSlug];
          teamAgents[idx].status = 'working';
          teamAgents[idx].taskDescription = taskDesc;
        } else {
          teamAgentIndex[agentSlug] = teamAgents.length;
          teamAgents.push({
            slug: agentSlug,
            status: 'working',
            taskDescription: taskDesc,
            spawnTime: event.timestamp
          });
        }
        updateTeamActivityPanel(projectId);
      }
    }

    // Team activity: track TaskOutput tool_use to know which agent
    if (event.type === 'tool_use' && event.data.tool === 'TaskOutput') {
      var taskId = event.data.input && event.data.input.taskId;
      if (taskId && activeAgents[taskId]) {
        lastTaskOutputAgent = activeAgents[taskId];
      }
    }

    // Team activity: agent done (TaskOutput result received)
    if (event.type === 'tool_result' && event.data.tool === 'TaskOutput') {
      if (lastTaskOutputAgent && teamAgentIndex.hasOwnProperty(lastTaskOutputAgent)) {
        var idx = teamAgentIndex[lastTaskOutputAgent];
        teamAgents[idx].status = 'done';
        updateTeamActivityPanel(projectId);
      }
      lastTaskOutputAgent = null;
    }

    // File deliverables tracking
    if (event.type === 'tool_use' && (event.data.tool === 'Write' || event.data.tool === 'Edit')) {
      var filePath = event.data.input && event.data.input.file_path;
      if (filePath) {
        var displayPath = formatDeliverablePath(filePath);
        var category = categorizeFile(filePath);
        var agentSlug = currentAgent;
        var agentInfo = agentSlug ? AGENT_REGISTRY[agentSlug] : null;
        var agentDisplayName = agentInfo ? agentInfo.name : 'Team Lead';

        if (deliverableFiles[filePath]) {
          deliverableFiles[filePath].editCount++;
          deliverableFiles[filePath].agent = agentSlug;
          deliverableFiles[filePath].agentName = agentDisplayName;
          deliverableFiles[filePath].time = event.timestamp;
          if (deliverableFiles[filePath].action === 'created' && event.data.tool === 'Edit') {
            deliverableFiles[filePath].action = 'modified';
          }
        } else {
          deliverableFiles[filePath] = {
            path: filePath,
            displayPath: displayPath,
            action: event.data.tool === 'Write' ? 'created' : 'modified',
            agent: agentSlug,
            agentName: agentDisplayName,
            time: event.timestamp,
            editCount: 1,
            category: category
          };
          deliverableOrder.push(filePath);
        }
        updateDeliverablesPanel(projectId);
      }
    }

    // --- End Phase 2-3 state updates ---

    // Classify the event
    var classification = classifyEvent(event);

    // Track classification for tool_result handling
    if (event.type === 'tool_use') {
      lastToolClassification = classification;
    }

    // Handle delta streaming for assistant_text
    if (event.type === 'assistant_text' && event.data && event.data.delta) {
      // Flush any pending group before streaming text
      flushGroup(eventsContainer);

      if (currentStreamingEvent) {
        // Append to existing streaming element
        var contentEl = currentStreamingEvent.querySelector('.session-event__content');
        if (contentEl) {
          contentEl.textContent += event.data.text || '';
        }
      } else {
        // Create new streaming element
        var div = document.createElement('div');
        div.innerHTML = renderAssistantTextEvent(event, formatRelativeSessionTime(event.timestamp));
        var el = div.firstChild;
        eventsContainer.appendChild(el);
        currentStreamingEvent = el;
      }
    } else {
      // End any current streaming block
      if (currentStreamingEvent) {
        // Re-render accumulated text as markdown
        var contentEl = currentStreamingEvent.querySelector('.session-event__content');
        if (contentEl) {
          contentEl.innerHTML = renderMarkdown(contentEl.textContent || '');
          contentEl.classList.add('session-event__prose');
        }
        currentStreamingEvent.classList.remove('session-event--streaming');
        currentStreamingEvent = null;
      }

      // For non-delta assistant_text, skip if we already streamed it
      if (event.type === 'assistant_text' && !event.data.delta) {
        var lastRendered = eventsContainer.lastElementChild;
        if (lastRendered && lastRendered.classList.contains('session-event--text')) {
          doAutoScroll(projectId);
          return;
        }
      }

      // Hidden events — skip rendering entirely
      if (classification === 'hidden') {
        doAutoScroll(projectId);
        return;
      }

      // tool_result for low-signal tools — absorbed into group, don't render
      if (event.type === 'tool_result' && classification === 'low') {
        doAutoScroll(projectId);
        return;
      }

      // Low-signal tool_use — buffer into group
      if (classification === 'low' && event.type === 'tool_use') {
        if (currentGroup) {
          currentGroup.tools.push(event.data.tool);
          currentGroup.events.push(event);
          // Update group element summary if it's already in the DOM
          if (currentGroup.element) {
            var summaryEl = currentGroup.element.querySelector('.session-event__group-summary');
            if (summaryEl) summaryEl.textContent = formatGroupSummary(currentGroup.tools);
          }
        } else {
          currentGroup = {
            tools: [event.data.tool],
            events: [event],
            element: null
          };
        }
        doAutoScroll(projectId);
        return;
      }

      // High-signal or semantic event — flush any pending group first
      flushGroup(eventsContainer);

      // Trim excess events from DOM
      while (eventsContainer.children.length >= MAX_RENDERED_EVENTS) {
        eventsContainer.removeChild(eventsContainer.firstChild);
      }

      var div = document.createElement('div');
      div.innerHTML = renderSessionEvent(event);
      var el = div.firstChild;
      if (el) {
        eventsContainer.appendChild(el);
      }
    }

    doAutoScroll(projectId);
  }

  function handleSessionDone(projectId, status, durationMs) {
    stopSessionTimer();
    sessionRunnerState = 'ended';
    sessionIsLive = false;
    hideInputBar(projectId);

    // Update work log total duration with the completed session
    if (durationMs) {
      workLogTotalDuration += durationMs;
    }

    // Update timer display
    var logEl = getLogContainer(projectId);
    if (logEl) {
      var timerEl = logEl.querySelector('.session-log__timer');
      if (timerEl) {
        timerEl.classList.remove('session-log__timer--live');
        timerEl.textContent = workLogTotalDuration ? formatDurationShort(workLogTotalDuration) : '';
      }
    }

    // End any streaming block
    if (currentStreamingEvent) {
      currentStreamingEvent.classList.remove('session-event--streaming');
      currentStreamingEvent = null;
    }

    // Update project state
    var project = findProject(projectId);
    if (project) {
      project.activeSessionId = null;
    }
    var cached = detailCache[projectId];
    if (cached) {
      cached.activeSessionId = null;
    }

    activeSessionId = null;

    // Re-render controls and card (remove running indicator)
    // renderList() handles renderDetailView + loadWorkLog for expanded card
    renderList();
  }

  // --- Session Log Helpers ---

  function getLogContainer(projectId) {
    return listContainer.querySelector('.session-log-container[data-project-id="' + CSS.escape(projectId) + '"]');
  }

  function getEventsContainer(projectId) {
    var logContainer = getLogContainer(projectId);
    if (!logContainer) return null;
    return logContainer.querySelector('.session-log__events');
  }

  function getPipelineContainer(projectId) {
    var logContainer = getLogContainer(projectId);
    if (!logContainer) return null;
    return logContainer.querySelector('.pipeline-indicator');
  }

  function getTeamActivityContainer(projectId) {
    var logContainer = getLogContainer(projectId);
    if (!logContainer) return null;
    return logContainer.querySelector('.team-activity');
  }

  function getDeliverablesContainer(projectId) {
    var logContainer = getLogContainer(projectId);
    if (!logContainer) return null;
    return logContainer.querySelector('.file-deliverables');
  }

  function formatDeliverablePath(fullPath) {
    var markers = ['/teamhq/', '/Projects/'];
    for (var i = 0; i < markers.length; i++) {
      var idx = fullPath.lastIndexOf(markers[i]);
      if (idx !== -1) {
        return fullPath.substring(idx + markers[i].length);
      }
    }
    if (fullPath.length > 60) {
      return '...' + fullPath.substring(fullPath.length - 57);
    }
    return fullPath;
  }

  function categorizeFile(filePath) {
    var lower = filePath.toLowerCase();
    if (lower.indexOf('/docs/') !== -1 || (lower.endsWith('.md') && lower.indexOf('/data/') === -1)) return 'docs';
    if (lower.indexOf('/data/') !== -1) return 'data';
    if (lower.endsWith('package.json') || lower.endsWith('tsconfig.json') ||
        lower.endsWith('.config.js') || lower.endsWith('.config.ts') ||
        lower.endsWith('vite.config.ts')) return 'config';
    if (lower.endsWith('.js') || lower.endsWith('.ts') || lower.endsWith('.tsx') ||
        lower.endsWith('.jsx') || lower.endsWith('.css') || lower.endsWith('.html') ||
        lower.endsWith('.svg')) return 'code';
    return 'other';
  }

  // --- Panel Render/Update Functions ---

  function renderPipelineIndicator(projectId) {
    var container = getPipelineContainer(projectId);
    if (!container) return;

    var html = '<div class="pipeline-indicator__steps">';
    for (var i = 0; i < PHASE_DEFINITIONS.length; i++) {
      var phase = PHASE_DEFINITIONS[i];
      var stateClass = 'pipeline-indicator__step--upcoming';
      html +=
        '<div class="pipeline-indicator__step ' + stateClass + '" data-phase="' + phase.id + '">' +
          '<span class="pipeline-indicator__dot"></span>' +
          '<span class="pipeline-indicator__label">' + escapeHTML(phase.label) + '</span>' +
        '</div>';
      if (i < PHASE_DEFINITIONS.length - 1) {
        html += '<span class="pipeline-indicator__connector"></span>';
      }
    }
    html += '</div>';
    container.innerHTML = html;
  }

  function updatePipelineIndicator(projectId) {
    var container = getPipelineContainer(projectId);
    if (!container) return;

    var steps = container.querySelectorAll('.pipeline-indicator__step');
    for (var i = 0; i < steps.length; i++) {
      var phaseId = steps[i].getAttribute('data-phase');
      steps[i].classList.remove(
        'pipeline-indicator__step--upcoming',
        'pipeline-indicator__step--current',
        'pipeline-indicator__step--completed'
      );
      if (phaseId === pipelinePhase) {
        steps[i].classList.add('pipeline-indicator__step--current');
      } else if (completedPhases[phaseId]) {
        steps[i].classList.add('pipeline-indicator__step--completed');
      } else {
        steps[i].classList.add('pipeline-indicator__step--upcoming');
      }
    }

    var connectors = container.querySelectorAll('.pipeline-indicator__connector');
    for (var i = 0; i < connectors.length; i++) {
      var nextPhase = PHASE_DEFINITIONS[i + 1];
      if (nextPhase && completedPhases[nextPhase.id]) {
        connectors[i].classList.add('pipeline-indicator__connector--active');
      } else {
        connectors[i].classList.remove('pipeline-indicator__connector--active');
      }
    }
  }

  function updateTeamActivityPanel(projectId) {
    var container = getTeamActivityContainer(projectId);
    if (!container) return;

    if (teamAgents.length === 0) {
      container.setAttribute('aria-hidden', 'true');
      container.innerHTML = '';
      return;
    }

    container.setAttribute('aria-hidden', 'false');

    var list = container.querySelector('.team-activity__list');
    if (!list) {
      var defaultExpanded = sessionIsLive;
      container.innerHTML =
        '<div class="team-activity__header">' +
          '<button class="team-activity__toggle" type="button" aria-expanded="' + defaultExpanded + '">' +
            '<span class="team-activity__toggle-chevron" aria-hidden="true"></span>' +
            '<span class="team-activity__title">Team Activity</span>' +
            '<span class="team-activity__count">' + teamAgents.length + '</span>' +
          '</button>' +
        '</div>' +
        '<div class="team-activity__list" aria-hidden="' + !defaultExpanded + '"></div>';
      list = container.querySelector('.team-activity__list');
    }

    var countEl = container.querySelector('.team-activity__count');
    if (countEl) countEl.textContent = teamAgents.length;

    var html = '';
    for (var i = 0; i < teamAgents.length; i++) {
      var ta = teamAgents[i];
      var agent = AGENT_REGISTRY[ta.slug];
      var name = agent ? agent.name : ta.slug;
      var role = agent ? agent.role : 'Agent';
      var avatarHtml = agent
        ? '<img class="team-activity__avatar" src="img/avatars/' + escapeAttr(agent.avatar) + '.svg" alt="' + escapeAttr(name) + '" width="20" height="20">'
        : '<span class="team-activity__avatar team-activity__avatar--placeholder"></span>';
      var statusClass = ta.status === 'done' ? 'team-activity__status--done' : 'team-activity__status--working';

      html +=
        '<div class="team-activity__agent" data-agent="' + escapeAttr(ta.slug) + '">' +
          avatarHtml +
          '<div class="team-activity__agent-info">' +
            '<span class="team-activity__agent-name">' + escapeHTML(name) + '</span>' +
            '<span class="team-activity__agent-role">' + escapeHTML(role) + '</span>' +
          '</div>' +
          '<span class="team-activity__agent-task">' + escapeHTML(ta.taskDescription) + '</span>' +
          '<span class="team-activity__status ' + statusClass + '"></span>' +
        '</div>';
    }
    list.innerHTML = html;
  }

  function updateDeliverablesPanel(projectId) {
    var container = getDeliverablesContainer(projectId);
    if (!container) return;

    var fileCount = deliverableOrder.length;
    if (fileCount === 0) {
      container.setAttribute('aria-hidden', 'true');
      container.innerHTML = '';
      return;
    }

    container.setAttribute('aria-hidden', 'false');

    var byCategory = {};
    for (var i = 0; i < CATEGORY_ORDER.length; i++) {
      byCategory[CATEGORY_ORDER[i]] = [];
    }
    for (var i = 0; i < deliverableOrder.length; i++) {
      var file = deliverableFiles[deliverableOrder[i]];
      if (!byCategory[file.category]) byCategory[file.category] = [];
      byCategory[file.category].push(file);
    }

    for (var cat in byCategory) {
      byCategory[cat].sort(function (a, b) {
        return new Date(b.time).getTime() - new Date(a.time).getTime();
      });
    }

    var list = container.querySelector('.file-deliverables__list');
    if (!list) {
      container.innerHTML =
        '<div class="file-deliverables__header">' +
          '<button class="file-deliverables__toggle" type="button" aria-expanded="false">' +
            '<span class="file-deliverables__toggle-chevron" aria-hidden="true"></span>' +
            '<span class="file-deliverables__title">Deliverables</span>' +
            '<span class="file-deliverables__count">' + fileCount + ' file' + (fileCount !== 1 ? 's' : '') + '</span>' +
          '</button>' +
        '</div>' +
        '<div class="file-deliverables__list" aria-hidden="true"></div>';
      list = container.querySelector('.file-deliverables__list');
    }

    var countEl = container.querySelector('.file-deliverables__count');
    if (countEl) countEl.textContent = fileCount + ' file' + (fileCount !== 1 ? 's' : '');

    var html = '';
    var rendered = 0;
    var MAX_SHOWN = 20;
    var hasMore = fileCount > MAX_SHOWN;

    for (var ci = 0; ci < CATEGORY_ORDER.length; ci++) {
      var cat = CATEGORY_ORDER[ci];
      var files = byCategory[cat];
      if (files.length === 0) continue;

      html += '<div class="file-deliverables__category">';
      html += '<span class="file-deliverables__category-label">' + CATEGORY_LABELS[cat] + '</span>';

      for (var fi = 0; fi < files.length; fi++) {
        if (rendered >= MAX_SHOWN && !container.classList.contains('file-deliverables--show-all')) break;
        var f = files[fi];
        var actionClass = f.action === 'created' ? 'file-deliverables__action--created' : 'file-deliverables__action--modified';
        var editBadge = f.editCount > 1 ? '<span class="file-deliverables__edit-count">' + f.editCount + 'x</span>' : '';

        html +=
          '<div class="file-deliverables__file">' +
            '<span class="file-deliverables__action ' + actionClass + '">' + f.action + '</span>' +
            '<span class="file-deliverables__path" title="' + escapeAttr(f.path) + '">' + escapeHTML(f.displayPath) + '</span>' +
            editBadge +
            '<span class="file-deliverables__agent">' + escapeHTML(f.agentName) + '</span>' +
          '</div>';
        rendered++;
      }

      html += '</div>';
    }

    if (hasMore && !container.classList.contains('file-deliverables--show-all')) {
      html += '<button class="file-deliverables__show-all-btn" type="button">Show all ' + fileCount + ' files</button>';
    }

    list.innerHTML = html;
  }

  function setupAutoScroll(projectId) {
    var logContainer = getLogContainer(projectId);
    if (!logContainer) return;
    var body = logContainer.querySelector('.session-log__body');
    if (!body) return;

    body.addEventListener('scroll', function () {
      var atBottom = body.scrollHeight - body.scrollTop - body.clientHeight < 50;
      autoScrollEnabled = atBottom;

      var jumpEl = logContainer.querySelector('.session-log__jump');
      if (jumpEl) {
        jumpEl.setAttribute('aria-hidden', atBottom ? 'true' : 'false');
      }
    });
  }

  function doAutoScroll(projectId) {
    if (!autoScrollEnabled) return;
    var logContainer = getLogContainer(projectId);
    if (!logContainer) return;
    var body = logContainer.querySelector('.session-log__body');
    if (!body) return;
    body.scrollTop = body.scrollHeight;
  }

  function jumpToLatest(projectId) {
    autoScrollEnabled = true;
    var logContainer = getLogContainer(projectId);
    if (!logContainer) return;
    var body = logContainer.querySelector('.session-log__body');
    if (body) body.scrollTop = body.scrollHeight;
    var jumpEl = logContainer.querySelector('.session-log__jump');
    if (jumpEl) jumpEl.setAttribute('aria-hidden', 'true');
  }

  // --- Input Bar ---

  function showInputBar(projectId) {
    var logContainer = getLogContainer(projectId);
    if (!logContainer) return;
    var bar = logContainer.querySelector('.session-log__input-bar');
    if (bar) {
      bar.setAttribute('aria-hidden', 'false');
      var input = bar.querySelector('.session-log__input');
      var sendBtn = bar.querySelector('.session-log__send-btn');
      if (input) { input.disabled = false; input.value = ''; }
      if (sendBtn) sendBtn.disabled = true;
      clearInputError(projectId);
    }
  }

  function hideInputBar(projectId) {
    var logContainer = getLogContainer(projectId);
    if (!logContainer) return;
    var bar = logContainer.querySelector('.session-log__input-bar');
    if (bar) bar.setAttribute('aria-hidden', 'true');
  }

  function clearInputError(projectId) {
    var logContainer = getLogContainer(projectId);
    if (!logContainer) return;
    var errorEl = logContainer.querySelector('.session-log__input-error');
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.setAttribute('aria-hidden', 'true');
    }
  }

  function handleSendMessage(projectId) {
    var logContainer = getLogContainer(projectId);
    if (!logContainer) return;

    var input = logContainer.querySelector('.session-log__input');
    var sendBtn = logContainer.querySelector('.session-log__send-btn');
    if (!input || !sendBtn) return;

    var message = input.value.trim();
    if (!message) return;

    // Disable input and button immediately (prevents double-send)
    input.disabled = true;
    sendBtn.disabled = true;
    clearInputError(projectId);

    apiSendMessage(activeSessionProjectId, activeSessionId, message)
      .then(function () {
        // Success: clear input. The SSE events (user_message, turn_start)
        // will hide the input bar and render the message.
        input.value = '';
      })
      .catch(function (err) {
        // Re-enable input so the user can retry
        input.disabled = false;
        sendBtn.disabled = false;

        var msg = 'Failed to send message';
        if (err && err.error) {
          msg = err.error;
        }
        var errorEl = logContainer.querySelector('.session-log__input-error');
        if (errorEl) {
          errorEl.textContent = msg;
          errorEl.setAttribute('aria-hidden', 'false');
        }
        // Do NOT clear the input — preserve the user's text for retry
      });
  }

  // --- Session Timer ---

  function startWorkLogTimer(projectId, liveSessionStartMs) {
    stopSessionTimer();

    // Use provided session start time or current time
    var timerStart = liveSessionStartMs || Date.now();

    sessionTimerInterval = setInterval(function () {
      var elapsed = Date.now() - timerStart;
      var total = workLogTotalDuration + elapsed;
      var logContainer = getLogContainer(projectId);
      if (!logContainer) { stopSessionTimer(); return; }
      var timerEl = logContainer.querySelector('.session-log__timer');
      if (timerEl) {
        timerEl.textContent = formatDurationShort(total);
      }
    }, 1000);
  }

  function stopSessionTimer() {
    if (sessionTimerInterval) {
      clearInterval(sessionTimerInterval);
      sessionTimerInterval = null;
    }
    sessionStartTime = null;
  }

  // --- Session Actions ---

  function handleRunSession(projectId) {
    var card = listContainer.querySelector('[data-project-id="' + CSS.escape(projectId) + '"]');
    if (!card) return;
    var runBtn = card.querySelector('.detail__run-btn');
    if (runBtn) {
      runBtn.textContent = 'Starting...';
      runBtn.disabled = true;
    }

    apiStartSession(projectId)
      .then(function (session) {
        // Update project state
        var project = findProject(projectId);
        if (project) {
          project.activeSessionId = session.id;
          if (project.status === 'planned') project.status = 'in-progress';
        }
        var cached = detailCache[projectId];
        if (cached) {
          cached.activeSessionId = session.id;
          if (cached.status === 'planned') cached.status = 'in-progress';
        }

        // Re-render card list (shows running indicator)
        // renderList() handles renderDetailView + loadWorkLog for expanded card
        renderList();
      })
      .catch(function (err) {
        if (runBtn) {
          runBtn.textContent = 'Continue Work';
          runBtn.disabled = false;
        }
        var msg = (err && err.error) || 'Failed to start work';
        showToast(msg, true);
      });
  }

  function handleStopSession(projectId, sessionId) {
    var card = listContainer.querySelector('[data-project-id="' + CSS.escape(projectId) + '"]');
    if (!card) return;
    var stopBtn = card.querySelector('.detail__stop-btn');
    if (stopBtn) {
      stopBtn.textContent = 'Stopping...';
      stopBtn.disabled = true;
    }

    apiStopSession(projectId, sessionId)
      .then(function () {
        // The SSE session_done event will handle UI updates
      })
      .catch(function () {
        if (stopBtn) {
          stopBtn.textContent = 'Stop';
          stopBtn.disabled = false;
        }
        showToast('Failed to stop work', true);
      });
  }

  // --- Session Format Helpers ---

  function formatDurationShort(ms) {
    if (!ms) return '--';
    var totalSeconds = Math.floor(ms / 1000);
    var hours = Math.floor(totalSeconds / 3600);
    var minutes = Math.floor((totalSeconds % 3600) / 60);
    var seconds = totalSeconds % 60;
    if (hours > 0) return hours + 'h ' + minutes + 'm ' + seconds + 's';
    if (minutes > 0) return minutes + 'm ' + seconds + 's';
    return seconds + 's';
  }

  function formatSessionDate(dateStr) {
    if (!dateStr) return '';
    var d = new Date(dateStr);
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var hours = d.getHours();
    var ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    if (hours === 0) hours = 12;
    var mins = d.getMinutes();
    var minsStr = mins < 10 ? '0' + mins : '' + mins;
    return months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear() + ' at ' + hours + ':' + minsStr + ' ' + ampm;
  }

  function formatRelativeSessionTime(timestamp) {
    if (!sessionStartTime || !timestamp) return '+0:00';
    var eventTime = new Date(timestamp).getTime();
    var elapsed = eventTime - sessionStartTime;
    if (elapsed < 0) elapsed = 0;
    var totalSeconds = Math.floor(elapsed / 1000);
    var minutes = Math.floor(totalSeconds / 60);
    var seconds = totalSeconds % 60;
    return '+' + minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
  }

  function formatStatus(status) {
    switch (status) {
      case 'completed': return 'Completed';
      case 'in-progress': return 'In Progress';
      case 'planned': return 'Planned';
      default: return status;
    }
  }

  function formatDate(project) {
    var dateStr = project.status === 'completed' && project.completedAt
      ? project.completedAt
      : project.createdAt;
    if (!dateStr) return '';
    return formatDateLong(dateStr);
  }

  function formatDateLong(dateStr) {
    if (!dateStr) return '';
    var d = new Date(dateStr);
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return months[d.getMonth()] + ' ' + d.getFullYear();
  }

  function formatRelativeTime(dateStr) {
    if (!dateStr) return '';
    var now = Date.now();
    var then = new Date(dateStr).getTime();
    var diff = now - then;
    var seconds = Math.floor(diff / 1000);
    var minutes = Math.floor(seconds / 60);
    var hours = Math.floor(minutes / 60);
    var days = Math.floor(hours / 24);

    if (seconds < 60) return 'Just now';
    if (minutes < 60) return minutes + ' min ago';
    if (hours < 24) return hours + ' hour' + (hours !== 1 ? 's' : '') + ' ago';
    if (days < 7) return days + ' day' + (days !== 1 ? 's' : '') + ' ago';

    var d = new Date(dateStr);
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
  }

  function renderMarkdown(str) {
    if (typeof marked !== 'undefined' && marked.parse) {
      try { return marked.parse(str); } catch (e) { /* fall through */ }
    }
    return escapeHTML(str);
  }

  function escapeHTML(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  function escapeAttr(str) {
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function findProject(id) {
    for (var i = 0; i < projects.length; i++) {
      if (projects[i].id === id) return projects[i];
    }
    return null;
  }

  function findProjectIndex(id) {
    for (var i = 0; i < projects.length; i++) {
      if (projects[i].id === id) return i;
    }
    return -1;
  }

  // --- Expand/Collapse ---

  function expandCard(id) {
    // Collapse previous
    if (expandedId && expandedId !== id) {
      collapseCard(expandedId);
    }

    expandedId = id;
    var card = listContainer.querySelector('[data-project-id="' + CSS.escape(id) + '"]');
    if (!card) return;

    var header = card.querySelector('.project-card__header');
    var details = card.querySelector('.project-card__details');
    header.setAttribute('aria-expanded', 'true');
    details.setAttribute('aria-hidden', 'false');

    if (detailCache[id]) {
      renderDetailView(id);
      loadWorkLog(id);
    } else {
      // Show loading
      var inner = card.querySelector('.project-card__details-inner');
      inner.innerHTML =
        '<div class="detail__loading"><span class="detail__loading-text">Loading...</span></div>';

      apiGetOne(id)
        .then(function (project) {
          detailCache[id] = project;
          // Update local project data too
          var idx = findProjectIndex(id);
          if (idx !== -1) {
            projects[idx] = mergeProjectSummary(projects[idx], project);
          }
          if (expandedId === id) {
            renderDetailView(id);
            loadWorkLog(id);
          }
        })
        .catch(function () {
          if (expandedId === id) {
            inner.innerHTML =
              '<div class="detail__loading"><span class="detail__loading-text">Failed to load details.</span></div>';
          }
        });
    }
  }

  function collapseCard(id) {
    // Clean up SSE connection if we're collapsing the project with active SSE
    if (activeSessionProjectId === id) {
      disconnectSession();
    }

    // Clean up work items grid
    destroyWorkItemGrid(id);

    var card = listContainer.querySelector('[data-project-id="' + CSS.escape(id) + '"]');
    if (card) {
      var header = card.querySelector('.project-card__header');
      var details = card.querySelector('.project-card__details');
      header.setAttribute('aria-expanded', 'false');
      details.setAttribute('aria-hidden', 'true');
    }
    if (expandedId === id) expandedId = null;
  }

  function loadWorkLog(projectId) {
    var project = detailCache[projectId] || findProject(projectId);
    if (!project) return;

    // Only show work log for in-progress or completed projects
    if (project.status !== 'in-progress' && project.status !== 'completed') return;

    // Reset SSE connection (don't reset panel state yet — loadWorkLog will rebuild)
    if (activeEventSource) {
      activeEventSource.close();
      activeEventSource = null;
    }
    stopSessionTimer();
    activeSessionProjectId = projectId;
    activeSessionId = null;
    sessionEvents = [];
    lastEventId = -1;
    autoScrollEnabled = true;
    currentStreamingEvent = null;

    // Reset tracking state
    activeAgents = {};
    currentAgent = null;
    lastTaskToolName = null;
    currentGroup = null;
    lastToolClassification = null;
    sessionRunnerState = 'unknown';

    // Reset panel state
    sessionIsLive = !!project.activeSessionId;
    pipelinePhase = null;
    completedPhases = {};
    teamAgents = [];
    teamAgentIndex = {};
    lastTaskOutputAgent = null;
    deliverableFiles = {};
    deliverableOrder = [];

    // Reset work log state
    workLogSessions = [];
    workLogTotalDuration = 0;

    var logContainer = getLogContainer(projectId);
    if (!logContainer) return;

    // Show loading state
    logContainer.innerHTML = renderWorkLogContainer({ loading: true });

    apiGetWorkLog(projectId)
      .then(function (data) {
        if (expandedId !== projectId) return; // project collapsed during fetch

        workLogSessions = data.sessions || [];
        workLogTotalDuration = 0;
        for (var i = 0; i < workLogSessions.length; i++) {
          if (workLogSessions[i].durationMs) {
            workLogTotalDuration += workLogSessions[i].durationMs;
          }
        }

        var events = data.events || [];
        var isLive = !!project.activeSessionId;

        if (events.length === 0 && !isLive) {
          // Empty state
          logContainer.innerHTML = renderWorkLogContainer({ empty: true });
          return;
        }

        // Render work log container
        sessionIsLive = isLive;
        logContainer.innerHTML = renderWorkLogContainer({
          totalDurationMs: workLogTotalDuration,
          isLive: isLive
        });
        renderPipelineIndicator(projectId);

        // Find live session start time for timer
        var liveSessionStartMs = null;
        if (isLive) {
          for (var i = 0; i < workLogSessions.length; i++) {
            if (workLogSessions[i].id === project.activeSessionId) {
              liveSessionStartMs = new Date(workLogSessions[i].startedAt).getTime();
              break;
            }
          }
          startWorkLogTimer(projectId, liveSessionStartMs);
        }

        // Process historical events with session dividers
        var lastSessionIndex = -1;
        sessionStartTime = events.length > 0 ? new Date(events[0].timestamp).getTime() : null;

        var eventsContainer = getEventsContainer(projectId);
        for (var i = 0; i < events.length; i++) {
          var event = events[i];

          // Insert session divider when session changes
          if (event.sessionIndex !== lastSessionIndex) {
            var sessionMeta = workLogSessions[event.sessionIndex];
            if (sessionMeta && eventsContainer) {
              var div = document.createElement('div');
              div.innerHTML = renderSessionDivider(sessionMeta);
              var el = div.firstChild;
              if (el) eventsContainer.appendChild(el);
            }
            lastSessionIndex = event.sessionIndex;
          }

          // Process event through panel updaters and render
          appendSessionEvent(projectId, event);
        }

        // Flush any pending group
        if (eventsContainer) flushGroup(eventsContainer);

        // Connect SSE for active session
        if (isLive && project.activeSessionId) {
          var activeSessionReplayOffset = 0;
          for (var i = events.length - 1; i >= 0; i--) {
            if (events[i].sessionId === project.activeSessionId) {
              activeSessionReplayOffset = events[i].id + 1;
              break;
            }
          }

          // If no events from active session yet, insert a divider for it
          if (activeSessionReplayOffset === 0 && eventsContainer) {
            for (var j = 0; j < workLogSessions.length; j++) {
              if (workLogSessions[j].id === project.activeSessionId) {
                var div = document.createElement('div');
                div.innerHTML = renderSessionDivider(workLogSessions[j]);
                var el = div.firstChild;
                if (el) eventsContainer.appendChild(el);
                break;
              }
            }
          }

          connectWorkLogSSE(projectId, project.activeSessionId, activeSessionReplayOffset);
        }

        setupAutoScroll(projectId);

        // Scroll to bottom for live sessions, top for historical
        if (isLive) {
          doAutoScroll(projectId);
        }
      })
      .catch(function () {
        if (expandedId !== projectId) return;
        logContainer.innerHTML = renderWorkLogContainer({ error: true });
      });
  }

  function mergeProjectSummary(summary, full) {
    // Keep summary-level fields updated from full detail
    summary.name = full.name;
    summary.description = full.description;
    summary.status = full.status;
    summary.createdAt = full.createdAt;
    summary.updatedAt = full.updatedAt;
    summary.completedAt = full.completedAt;
    summary.goals = full.goals;
    summary.constraints = full.constraints;
    summary.brief = full.brief;
    summary.activeSessionId = full.activeSessionId || null;
    if (full.pipeline) summary.pipeline = full.pipeline;
    return summary;
  }

  // --- Modal Management ---

  function openModal(overlay) {
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    trapFocus(overlay);
  }

  function closeModal(overlay) {
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    releaseFocusTrap(overlay);
    if (triggerElement) {
      triggerElement.focus();
      triggerElement = null;
    }
  }

  function setAdvancedOpen(open) {
    advancedOpen = open;
    advancedFields.setAttribute('aria-hidden', open ? 'false' : 'true');
    advancedToggle.querySelector('.modal__advanced-chevron').classList.toggle('modal__advanced-chevron--open', open);
  }

  function openCreateModal() {
    editingId = null;
    modalTitle.textContent = 'New Project';
    submitBtn.textContent = 'Create Project';
    nameInput.value = '';
    descInput.value = '';
    goalsInput.value = '';
    constraintsInput.value = '';
    briefInput.value = '';
    statusSelect.value = 'planned';
    setAdvancedOpen(false);
    clearValidation();
    openModal(projectOverlay);
    nameInput.focus();
  }

  function openEditModal(project) {
    editingId = project.id;
    modalTitle.textContent = 'Edit Project';
    submitBtn.textContent = 'Save Changes';
    nameInput.value = project.name;
    descInput.value = project.description || '';
    var detail = detailCache[project.id];
    goalsInput.value = (detail && detail.goals) || project.goals || '';
    constraintsInput.value = (detail && detail.constraints) || project.constraints || '';
    briefInput.value = (detail && detail.brief) || project.brief || '';
    statusSelect.value = project.status;
    // Auto-expand advanced if any advanced field has content
    var hasAdvanced = descInput.value || goalsInput.value || constraintsInput.value || statusSelect.value !== 'planned';
    setAdvancedOpen(hasAdvanced);
    clearValidation();
    openModal(projectOverlay);
    nameInput.focus();
  }

  function openDeleteModal(project) {
    deletingId = project.id;
    deleteNameEl.textContent = project.name;
    openModal(deleteOverlay);
    deleteOverlay.querySelector('.modal__cancel').focus();
  }

  function openKickoffModal(promptText) {
    kickoffPromptEl.textContent = promptText;
    kickoffCopyBtn.textContent = 'Copy to Clipboard';
    kickoffCopyBtn.classList.remove('kickoff__copy-btn--copied');
    openModal(kickoffOverlay);
    kickoffCopyBtn.focus();
  }

  function clearValidation() {
    nameInput.classList.remove('modal__input--invalid');
    nameError.textContent = '';
  }

  // --- Focus Trap ---

  function trapFocus(overlay) {
    var focusable = overlay.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length === 0) return;

    var first = focusable[0];
    var last = focusable[focusable.length - 1];

    overlay._trapHandler = function (e) {
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    overlay.addEventListener('keydown', overlay._trapHandler);
  }

  function releaseFocusTrap(overlay) {
    if (overlay._trapHandler) {
      overlay.removeEventListener('keydown', overlay._trapHandler);
      overlay._trapHandler = null;
    }
  }

  // --- Toast ---

  function showToast(message, isError) {
    var existing = document.querySelector('.toast');
    if (existing) existing.remove();

    var toast = document.createElement('div');
    toast.className = 'toast' + (isError ? ' toast--error' : '');
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.innerHTML = '<p class="toast__message">' + escapeHTML(message) + '</p>';
    document.body.appendChild(toast);

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        toast.classList.add('toast--visible');
      });
    });

    setTimeout(function () {
      toast.classList.remove('toast--visible');
      setTimeout(function () { toast.remove(); }, 300);
    }, TOAST_DURATION);
  }

  // --- Card Animations ---

  function animateCardEnter(id) {
    var card = listContainer.querySelector('[data-project-id="' + CSS.escape(id) + '"]');
    if (card) {
      card.classList.add('project-card--entering');
      card.addEventListener('animationend', function () {
        card.classList.remove('project-card--entering');
      }, { once: true });
    }
  }

  function animateCardLeave(id, callback) {
    var card = listContainer.querySelector('[data-project-id="' + CSS.escape(id) + '"]');
    if (card) {
      card.classList.add('project-card--leaving');
      card.addEventListener('animationend', function () {
        callback();
      }, { once: true });
    } else {
      callback();
    }
  }

  // --- CRUD Operations ---

  function handleCreate(formData) {
    submitBtn.textContent = 'Creating...';
    submitBtn.disabled = true;

    var tempProject = {
      id: 'temp-' + Date.now(),
      name: formData.name,
      description: formData.description,
      status: formData.status,
      goals: formData.goals,
      constraints: formData.constraints,
      brief: formData.brief,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: null,
    };
    projects.unshift(tempProject);
    renderList();
    animateCardEnter(tempProject.id);
    closeModal(projectOverlay);

    apiCreate(formData)
      .then(function (created) {
        var idx = findProjectIndex(tempProject.id);
        if (idx !== -1) {
          projects[idx] = created;
        }
        renderList();
      })
      .catch(function () {
        var idx = findProjectIndex(tempProject.id);
        if (idx !== -1) projects.splice(idx, 1);
        renderList();
        showToast('Failed to create project. Please try again.', true);
      })
      .finally(function () {
        submitBtn.textContent = 'Create Project';
        submitBtn.disabled = false;
      });
  }

  function handleEdit(formData) {
    submitBtn.textContent = 'Saving...';
    submitBtn.disabled = true;

    var project = findProject(editingId);
    if (!project) return;

    var prev = {
      name: project.name,
      description: project.description,
      status: project.status,
      goals: project.goals,
      constraints: project.constraints,
      brief: project.brief,
    };

    project.name = formData.name;
    project.description = formData.description;
    project.status = formData.status;
    project.goals = formData.goals;
    project.constraints = formData.constraints;
    project.brief = formData.brief;

    // Clear detail cache so next expand re-fetches
    delete detailCache[editingId];

    renderList();
    closeModal(projectOverlay);

    apiUpdate(editingId, formData)
      .then(function (updated) {
        var idx = findProjectIndex(editingId);
        if (idx !== -1) projects[idx] = updated;
        renderList();
      })
      .catch(function () {
        project.name = prev.name;
        project.description = prev.description;
        project.status = prev.status;
        project.goals = prev.goals;
        project.constraints = prev.constraints;
        project.brief = prev.brief;
        renderList();
        showToast('Failed to save changes. Please try again.', true);
      })
      .finally(function () {
        submitBtn.textContent = 'Save Changes';
        submitBtn.disabled = false;
        editingId = null;
      });
  }

  function handleDelete() {
    var id = deletingId;
    var project = findProject(id);
    var idx = findProjectIndex(id);
    if (idx === -1) return;

    closeModal(deleteOverlay);

    if (expandedId === id) expandedId = null;
    delete detailCache[id];

    animateCardLeave(id, function () {
      projects.splice(idx, 1);
      renderList();
    });

    apiDelete(id)
      .catch(function () {
        if (findProjectIndex(id) === -1) {
          projects.splice(idx, 0, project);
          renderList();
        }
        showToast('Failed to delete project. Please try again.', true);
      })
      .finally(function () {
        deletingId = null;
      });
  }

  // --- Start Work ---

  function handleStartWork(id) {
    var project = detailCache[id] || findProject(id);
    if (!project) return;

    var goalsEmpty = !project.goals || !project.goals.trim();
    var briefEmpty = !project.brief || !project.brief.trim();

    if (goalsEmpty && briefEmpty) {
      showStartWarning(id);
      return;
    }

    doStart(id);
  }

  function showStartWarning(id) {
    var card = listContainer.querySelector('[data-project-id="' + CSS.escape(id) + '"]');
    if (!card) return;
    var actionArea = card.querySelector('.detail__action-area');
    if (!actionArea) return;

    actionArea.innerHTML =
      '<div class="detail__start-warning">' +
        '<p class="detail__start-warning-text">' +
          'This project has no goals or brief. Thomas will have limited context.' +
        '</p>' +
        '<div class="detail__start-warning-actions">' +
          '<button class="detail__start-warning-fill" type="button">Fill in Details</button>' +
          '<button class="detail__start-warning-proceed" type="button">Start Anyway</button>' +
        '</div>' +
      '</div>';
  }

  function doStart(id) {
    var card = listContainer.querySelector('[data-project-id="' + CSS.escape(id) + '"]');
    if (!card) return;
    var actionArea = card.querySelector('.detail__action-area');
    if (!actionArea) return;

    actionArea.innerHTML =
      '<button class="detail__start-btn" type="button" disabled>Starting...</button>';

    apiStartSession(id)
      .then(function (session) {
        // Update project state
        var project = findProject(id);
        if (project) {
          project.activeSessionId = session.id;
          project.status = 'in-progress';
        }
        var cached = detailCache[id];
        if (cached) {
          cached.activeSessionId = session.id;
          cached.status = 'in-progress';
        }

        // Re-render card list (shows running indicator, in-progress badge)
        // renderList() handles renderDetailView + loadWorkLog for expanded card
        renderList();
      })
      .catch(function (err) {
        // Restore the Start Work button
        if (actionArea) {
          actionArea.innerHTML =
            '<button class="detail__start-btn" type="button">Start Work</button>';
        }
        var msg = (err && (err.detail || err.error)) || 'Failed to start project. Please try again.';
        showToast(msg, true);
      });
  }

  // --- Notes ---

  function handleAddNote(projectId) {
    var card = listContainer.querySelector('[data-project-id="' + CSS.escape(projectId) + '"]');
    if (!card) return;
    var input = card.querySelector('.detail__notes-input');
    if (!input) return;

    var content = input.value.trim();
    if (!content) return;

    var tempNote = {
      id: 'temp-' + Date.now(),
      content: content,
      createdAt: new Date().toISOString(),
    };

    // Optimistic
    var cached = detailCache[projectId];
    if (cached) {
      if (!cached.notes) cached.notes = [];
      cached.notes.unshift(tempNote);
    }
    input.value = '';
    renderDetailViewAndWorkLog(projectId);

    apiAddNote(projectId, content)
      .then(function (note) {
        if (cached) {
          var idx = cached.notes.indexOf(tempNote);
          if (idx !== -1) cached.notes[idx] = note;
        }
        renderDetailViewAndWorkLog(projectId);
      })
      .catch(function () {
        if (cached) {
          var idx = cached.notes.indexOf(tempNote);
          if (idx !== -1) cached.notes.splice(idx, 1);
        }
        renderDetailViewAndWorkLog(projectId);
        showToast('Failed to add note. Please try again.', true);
      });
  }

  function handleDeleteNote(projectId, noteId) {
    var cached = detailCache[projectId];
    if (!cached || !cached.notes) return;

    var noteIdx = -1;
    var note = null;
    for (var i = 0; i < cached.notes.length; i++) {
      if (cached.notes[i].id === noteId) {
        noteIdx = i;
        note = cached.notes[i];
        break;
      }
    }
    if (noteIdx === -1) return;

    // Optimistic
    cached.notes.splice(noteIdx, 1);
    renderDetailViewAndWorkLog(projectId);

    apiDeleteNote(projectId, noteId)
      .catch(function () {
        cached.notes.splice(noteIdx, 0, note);
        renderDetailViewAndWorkLog(projectId);
        showToast('Failed to delete note. Please try again.', true);
      });
  }

  // --- Copy to Clipboard ---

  function handleCopy() {
    var text = kickoffPromptEl.textContent;
    navigator.clipboard.writeText(text)
      .then(function () {
        kickoffCopyBtn.textContent = 'Copied!';
        kickoffCopyBtn.classList.add('kickoff__copy-btn--copied');
        setTimeout(function () {
          kickoffCopyBtn.textContent = 'Copy to Clipboard';
          kickoffCopyBtn.classList.remove('kickoff__copy-btn--copied');
        }, 2000);
      })
      .catch(function () {
        kickoffCopyBtn.textContent = 'Copy failed';
        setTimeout(function () {
          kickoffCopyBtn.textContent = 'Copy to Clipboard';
        }, 2000);
        // Fallback: select the text
        var range = document.createRange();
        range.selectNodeContents(kickoffPromptEl);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      });
  }

  // --- Event Handlers ---

  // New Project button
  newBtn.addEventListener('click', function () {
    triggerElement = newBtn;
    openCreateModal();
  });

  // Advanced toggle
  advancedToggle.addEventListener('click', function () {
    setAdvancedOpen(!advancedOpen);
  });

  // Delegated events on project list
  listContainer.addEventListener('click', function (e) {
    // Edit button
    var editBtn = e.target.closest('.project-card__action-btn--edit');
    if (editBtn) {
      var card = editBtn.closest('.project-card');
      var id = card.getAttribute('data-project-id');
      var project = findProject(id);
      if (project) {
        triggerElement = editBtn;
        openEditModal(project);
      }
      return;
    }

    // Delete button
    var delBtn = e.target.closest('.project-card__action-btn--delete');
    if (delBtn) {
      var card = delBtn.closest('.project-card');
      var id = card.getAttribute('data-project-id');
      var project = findProject(id);
      if (project) {
        triggerElement = delBtn;
        openDeleteModal(project);
      }
      return;
    }

    // Card header (expand/collapse)
    var header = e.target.closest('.project-card__header');
    if (header && !e.target.closest('.project-card__actions')) {
      var card = header.closest('.project-card');
      var id = card.getAttribute('data-project-id');
      var isExpanded = header.getAttribute('aria-expanded') === 'true';
      if (isExpanded) {
        collapseCard(id);
      } else {
        expandCard(id);
      }
      return;
    }

    // Start Work button
    var startBtn = e.target.closest('.detail__start-btn');
    if (startBtn && !startBtn.disabled) {
      var card = startBtn.closest('.project-card');
      var id = card.getAttribute('data-project-id');
      handleStartWork(id);
      return;
    }

    // Warning: Fill in Details
    var fillBtn = e.target.closest('.detail__start-warning-fill');
    if (fillBtn) {
      var card = fillBtn.closest('.project-card');
      var id = card.getAttribute('data-project-id');
      var project = findProject(id);
      if (project) {
        triggerElement = fillBtn;
        openEditModal(project);
      }
      return;
    }

    // Warning: Start Anyway
    var proceedBtn = e.target.closest('.detail__start-warning-proceed');
    if (proceedBtn) {
      var card = proceedBtn.closest('.project-card');
      var id = card.getAttribute('data-project-id');
      doStart(id);
      return;
    }

    // View Prompt link
    var viewBtn = e.target.closest('.detail__kickoff-view-btn');
    if (viewBtn) {
      var card = viewBtn.closest('.project-card');
      var id = card.getAttribute('data-project-id');
      var cached = detailCache[id];
      if (cached && cached.kickoffPrompt) {
        triggerElement = viewBtn;
        openKickoffModal(cached.kickoffPrompt);
      }
      return;
    }

    // "Add goals, constraints, and brief" link
    var editDetailsBtn = e.target.closest('[data-action="edit-details"]');
    if (editDetailsBtn) {
      var card = editDetailsBtn.closest('.project-card');
      var id = card.getAttribute('data-project-id');
      var project = findProject(id);
      if (project) {
        triggerElement = editDetailsBtn;
        openEditModal(project);
      }
      return;
    }

    // Run Session button
    var runBtn = e.target.closest('.detail__run-btn');
    if (runBtn && !runBtn.disabled) {
      var card = runBtn.closest('.project-card');
      var id = card.getAttribute('data-project-id');
      handleRunSession(id);
      return;
    }

    // Stop Session button
    var stopBtn = e.target.closest('.detail__stop-btn');
    if (stopBtn && !stopBtn.disabled) {
      var card = stopBtn.closest('.project-card');
      var id = card.getAttribute('data-project-id');
      var sessionId = stopBtn.getAttribute('data-session-id');
      handleStopSession(id, sessionId);
      return;
    }

    // Jump to latest button
    var jumpBtn = e.target.closest('.session-log__jump-btn');
    if (jumpBtn) {
      var logContainer = jumpBtn.closest('.session-log-container') || jumpBtn.closest('.session-log');
      if (logContainer) {
        var projectId = logContainer.getAttribute('data-project-id') ||
                        logContainer.closest('.project-card').getAttribute('data-project-id');
        jumpToLatest(projectId);
      }
      return;
    }

    // Tool result toggle
    var resultToggle = e.target.closest('.session-event__result-toggle');
    if (resultToggle) {
      var isExpanded = resultToggle.getAttribute('aria-expanded') === 'true';
      resultToggle.setAttribute('aria-expanded', isExpanded ? 'false' : 'true');
      var content = resultToggle.nextElementSibling;
      if (content) {
        content.setAttribute('aria-hidden', isExpanded ? 'true' : 'false');
      }
      return;
    }

    // Event group toggle
    var groupToggle = e.target.closest('.session-event__group-toggle');
    if (groupToggle) {
      var isExpanded = groupToggle.getAttribute('aria-expanded') === 'true';
      groupToggle.setAttribute('aria-expanded', !isExpanded);
      var content = groupToggle.nextElementSibling;
      if (content) {
        content.setAttribute('aria-hidden', isExpanded);
      }
      return;
    }

    // Team activity toggle
    var teamToggle = e.target.closest('.team-activity__toggle');
    if (teamToggle) {
      var isExpanded = teamToggle.getAttribute('aria-expanded') === 'true';
      teamToggle.setAttribute('aria-expanded', !isExpanded);
      var list = teamToggle.closest('.team-activity').querySelector('.team-activity__list');
      if (list) list.setAttribute('aria-hidden', isExpanded ? 'true' : 'false');
      return;
    }

    // File deliverables toggle
    var deliverablesToggle = e.target.closest('.file-deliverables__toggle');
    if (deliverablesToggle) {
      var isExpanded = deliverablesToggle.getAttribute('aria-expanded') === 'true';
      deliverablesToggle.setAttribute('aria-expanded', !isExpanded);
      var list = deliverablesToggle.closest('.file-deliverables').querySelector('.file-deliverables__list');
      if (list) list.setAttribute('aria-hidden', isExpanded ? 'true' : 'false');
      return;
    }

    // Show all deliverables
    var showAllBtn = e.target.closest('.file-deliverables__show-all-btn');
    if (showAllBtn) {
      var delContainer = showAllBtn.closest('.file-deliverables');
      if (delContainer) {
        delContainer.classList.add('file-deliverables--show-all');
        var card = delContainer.closest('.project-card');
        var projectId = card ? card.getAttribute('data-project-id') : activeSessionProjectId;
        updateDeliverablesPanel(projectId);
      }
      return;
    }

    // Pipeline decisions toggle
    var pipelineDecToggle = e.target.closest('.pipeline__decisions-toggle');
    if (pipelineDecToggle) {
      var isExpanded = pipelineDecToggle.getAttribute('aria-expanded') === 'true';
      pipelineDecToggle.setAttribute('aria-expanded', String(!isExpanded));
      var content = pipelineDecToggle.nextElementSibling;
      if (content) {
        content.setAttribute('aria-hidden', String(isExpanded));
      }
      return;
    }

    // Pipeline task item expand/collapse (nested accordion, independent)
    var pipelineTaskHeader = e.target.closest('.pipeline__section .task-item__header');
    if (pipelineTaskHeader && pipelineTaskHeader.hasAttribute('aria-expanded')) {
      var taskItem = pipelineTaskHeader.closest('.task-item');
      var taskDetails = taskItem.querySelector('.task-item__details');
      if (!taskDetails) return;

      var isTaskExpanded = pipelineTaskHeader.getAttribute('aria-expanded') === 'true';
      pipelineTaskHeader.setAttribute('aria-expanded', String(!isTaskExpanded));
      taskDetails.setAttribute('aria-hidden', String(isTaskExpanded));
      return;
    }

    // Send message button (CEO response input)
    var sendBtn = e.target.closest('.session-log__send-btn');
    if (sendBtn && !sendBtn.disabled) {
      var card = sendBtn.closest('.project-card');
      var id = card.getAttribute('data-project-id');
      handleSendMessage(id);
      return;
    }

    // Add note button
    var addNoteBtn = e.target.closest('.detail__notes-add-btn');
    if (addNoteBtn) {
      var card = addNoteBtn.closest('.project-card');
      var id = card.getAttribute('data-project-id');
      handleAddNote(id);
      return;
    }

    // Delete note button
    var noteDelBtn = e.target.closest('.detail__note-delete');
    if (noteDelBtn) {
      var noteEl = noteDelBtn.closest('.detail__note');
      var noteId = noteEl.getAttribute('data-note-id');
      var card = noteDelBtn.closest('.project-card');
      var projectId = card.getAttribute('data-project-id');
      handleDeleteNote(projectId, noteId);
      return;
    }
  });

  // Enter key on notes input and session message input
  listContainer.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target.classList.contains('detail__notes-input')) {
      e.preventDefault();
      var card = e.target.closest('.project-card');
      var id = card.getAttribute('data-project-id');
      handleAddNote(id);
    }
    if (e.key === 'Enter' && e.target.classList.contains('session-log__input')) {
      e.preventDefault();
      var card = e.target.closest('.project-card');
      var id = card.getAttribute('data-project-id');
      handleSendMessage(id);
    }
  });

  // Enable/disable send button based on input content
  listContainer.addEventListener('input', function (e) {
    if (e.target.classList.contains('session-log__input')) {
      var card = e.target.closest('.project-card');
      if (!card) return;
      var sendBtn = card.querySelector('.session-log__send-btn');
      if (sendBtn) {
        sendBtn.disabled = !e.target.value.trim();
      }
    }
  });

  // Form submit
  projectForm.addEventListener('submit', function (e) {
    e.preventDefault();

    var name = nameInput.value.trim();
    if (!name) {
      nameInput.classList.add('modal__input--invalid');
      nameError.textContent = 'Project name is required';
      nameInput.focus();
      return;
    }
    clearValidation();

    var formData = {
      name: name,
      description: descInput.value.trim(),
      goals: goalsInput.value.trim(),
      constraints: constraintsInput.value.trim(),
      brief: briefInput.value.trim(),
      status: statusSelect.value,
    };

    if (editingId) {
      handleEdit(formData);
    } else {
      handleCreate(formData);
    }
  });

  // Name input — clear validation on typing
  nameInput.addEventListener('input', function () {
    if (nameInput.classList.contains('modal__input--invalid')) {
      clearValidation();
    }
  });

  // Delete confirm
  deleteBtn.addEventListener('click', handleDelete);

  // Copy to clipboard
  kickoffCopyBtn.addEventListener('click', handleCopy);

  // Modal close handlers
  function setupModalClose(overlay) {
    overlay.querySelector('.modal__close').addEventListener('click', function () {
      closeModal(overlay);
    });

    var cancelBtn = overlay.querySelector('.modal__cancel');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', function () {
        closeModal(overlay);
      });
    }

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) {
        closeModal(overlay);
      }
    });
  }

  setupModalClose(projectOverlay);
  setupModalClose(deleteOverlay);
  setupModalClose(kickoffOverlay);

  // Escape key
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (projectOverlay.getAttribute('aria-hidden') === 'false') {
        closeModal(projectOverlay);
      }
      if (deleteOverlay.getAttribute('aria-hidden') === 'false') {
        closeModal(deleteOverlay);
      }
      if (kickoffOverlay.getAttribute('aria-hidden') === 'false') {
        closeModal(kickoffOverlay);
      }
    }
  });

  // --- Init ---

  apiGet()
    .then(function (data) {
      projects = data;
      renderList();
    })
    .catch(function () {
      listContainer.innerHTML =
        '<p class="projects__error">Unable to load projects.</p>';
    });

  // Listen for projects created externally (e.g. from meetings action items)
  document.addEventListener('projects:refresh', function () {
    apiGet()
      .then(function (data) {
        projects = data;
        renderList();
      });
  });

  // ===================================================================
  // Work Items Section
  // ===================================================================

  var _agGridLoaded = false;
  var _agGridLoading = null;
  var _wiSaveTimers = {};        // projectId -> timeout id
  var _wiImportOverlay = null;   // single shared import modal element
  var _wiDeleteTimers = {};      // rowId -> timeout id (auto-dismiss confirm)

  var WI_STATUS_ORDER = { 'in-progress': 0, 'planned': 1, 'deferred': 2, 'completed': 3 };
  var WI_STATUS_BADGE = { 'planned': 'muted', 'in-progress': 'accent', 'completed': 'success', 'deferred': 'warning' };
  var WI_PRIORITY_BADGE = { 'high': 'error', 'medium': 'warning', 'low': 'muted' };

  function ensureAgGrid() {
    if (_agGridLoaded || typeof agGrid !== 'undefined') {
      _agGridLoaded = true;
      return Promise.resolve();
    }
    if (_agGridLoading) return _agGridLoading;
    _agGridLoading = new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/ag-grid-community@34/dist/ag-grid-community.min.js';
      script.onload = function () { _agGridLoaded = true; resolve(); };
      script.onerror = function () { _agGridLoading = null; reject(new Error('AG Grid failed to load')); };
      document.head.appendChild(script);
    });
    return _agGridLoading;
  }

  function destroyWorkItemGrid(projectId) {
    if (_workItemGrids[projectId]) {
      _workItemGrids[projectId].destroy();
      delete _workItemGrids[projectId];
    }
    if (_wiSaveTimers[projectId]) {
      clearTimeout(_wiSaveTimers[projectId]);
      delete _wiSaveTimers[projectId];
    }
  }

  function wiStatusComparator(a, b) {
    var oa = WI_STATUS_ORDER[a] !== undefined ? WI_STATUS_ORDER[a] : 99;
    var ob = WI_STATUS_ORDER[b] !== undefined ? WI_STATUS_ORDER[b] : 99;
    return oa - ob;
  }

  function wiBadgeCellRenderer(params, badgeMap) {
    if (!params.value) return '';
    var variant = badgeMap[params.value] || 'muted';
    var el = document.createElement('span');
    el.className = 'thq-badge thq-badge--' + variant;
    el.textContent = params.value;
    return el;
  }

  function wiActionCellRenderer(params) {
    var btn = document.createElement('button');
    btn.className = 'wi-action-delete';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Delete work item');
    btn.textContent = '\u00d7';
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var rowNode = params.node;
      var data = rowNode.data;
      if (data.title && data.title.trim()) {
        wiShowDeleteConfirm(params);
      } else {
        wiDeleteRow(params);
      }
    });
    return btn;
  }

  function wiShowDeleteConfirm(params) {
    var rowNode = params.node;
    var rowId = rowNode.data.id;
    var api = params.api;

    // Find the AG Grid row DOM element and append an overlay
    var rowEl = document.querySelector('.detail__work-items-grid .ag-row[row-id="' + CSS.escape(rowId) + '"]');
    if (!rowEl) return;

    // Remove any existing overlay
    var existing = rowEl.querySelector('.wi-delete-confirm');
    if (existing) existing.remove();

    var wrapper = document.createElement('div');
    wrapper.className = 'wi-delete-confirm';

    var text = document.createElement('span');
    text.className = 'wi-delete-confirm__text';
    text.textContent = 'Delete this item?';

    var deleteBtn = document.createElement('button');
    deleteBtn.className = 'wi-delete-confirm__btn wi-delete-confirm__btn--delete';
    deleteBtn.type = 'button';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', function () {
      wiDeleteRow(params);
    });

    var cancelBtn = document.createElement('button');
    cancelBtn.className = 'wi-delete-confirm__btn wi-delete-confirm__btn--cancel';
    cancelBtn.type = 'button';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', function () {
      wrapper.remove();
    });

    wrapper.appendChild(text);
    wrapper.appendChild(deleteBtn);
    wrapper.appendChild(cancelBtn);
    rowEl.appendChild(wrapper);

    // Auto-dismiss after 5 seconds
    if (_wiDeleteTimers[rowId]) clearTimeout(_wiDeleteTimers[rowId]);
    _wiDeleteTimers[rowId] = setTimeout(function () {
      wrapper.remove();
      delete _wiDeleteTimers[rowId];
    }, 5000);
  }

  function wiDeleteRow(params) {
    var api = params.api;
    var rowNode = params.node;
    var rowId = rowNode.data.id;
    if (_wiDeleteTimers[rowId]) {
      clearTimeout(_wiDeleteTimers[rowId]);
      delete _wiDeleteTimers[rowId];
    }
    api.applyTransaction({ remove: [rowNode.data] });
    wiScheduleSave(params.context.projectId);
    // Check if grid is now empty
    if (api.getDisplayedRowCount() === 0) {
      var container = params.context.containerEl;
      if (container) wiShowEmptyState(params.context.projectId, params.context.slug, container);
    }
  }

  // Full-row renderer for delete confirmation
  function wiFullWidthCellRenderer(params) {
    var wrapper = document.createElement('div');
    wrapper.className = 'wi-delete-confirm';

    var text = document.createElement('span');
    text.className = 'wi-delete-confirm__text';
    text.textContent = 'Delete this item?';

    var deleteBtn = document.createElement('button');
    deleteBtn.className = 'wi-delete-confirm__btn wi-delete-confirm__btn--delete';
    deleteBtn.type = 'button';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', function () {
      wiDeleteRow(params);
    });

    var cancelBtn = document.createElement('button');
    cancelBtn.className = 'wi-delete-confirm__btn wi-delete-confirm__btn--cancel';
    cancelBtn.type = 'button';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', function () {
      delete params.node.data._confirmDelete;
      params.api.refreshCells({ rowNodes: [params.node], force: true });
    });

    wrapper.appendChild(text);
    wrapper.appendChild(deleteBtn);
    wrapper.appendChild(cancelBtn);
    return wrapper;
  }

  function wiGetNextId(api, prefix) {
    var maxNum = 0;
    api.forEachNode(function (node) {
      var match = node.data.id && node.data.id.match(/(\d+)$/);
      if (match) {
        var n = parseInt(match[1], 10);
        if (n > maxNum) maxNum = n;
      }
    });
    var pfx = prefix || 'WI';
    return pfx + '-' + (maxNum + 1);
  }

  function wiScheduleSave(projectId) {
    if (_wiSaveTimers[projectId]) clearTimeout(_wiSaveTimers[projectId]);
    _wiSaveTimers[projectId] = setTimeout(function () {
      delete _wiSaveTimers[projectId];
      wiSave(projectId);
    }, 500);
  }

  function wiSave(projectId, retryCount) {
    retryCount = retryCount || 0;
    var api = _workItemGrids[projectId];
    if (!api) return;

    var workItems = [];
    api.forEachNode(function (node) {
      var d = node.data;
      workItems.push({
        id: d.id || '',
        title: d.title || '',
        status: d.status || 'planned',
        phase: d.phase || '',
        owner: d.owner || '',
        priority: d.priority || 'medium'
      });
    });

    fetch(API_BASE + '/' + encodeURIComponent(projectId) + '/work-items', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workItems: workItems })
    })
      .then(function (res) {
        if (!res.ok) throw new Error('Save failed');
        return res.json();
      })
      .then(function () {
        // Flash saved cells
        if (api && api.getDisplayedRowCount() > 0) {
          api.flashCells({});
        }
      })
      .catch(function () {
        if (retryCount < 1) {
          showToast('Failed to save work items — retrying...', true);
          setTimeout(function () { wiSave(projectId, retryCount + 1); }, 2000);
        } else {
          showToast('Failed to save work items.', true);
        }
      });
  }

  function wiParseMarkdownTable(text) {
    var lines = text.trim().split('\n');
    var items = [];
    if (lines.length < 2) return items;

    // Find header row — look for a line containing 'ID' and 'Title'
    var headerIdx = -1;
    var headers = [];
    for (var i = 0; i < lines.length; i++) {
      if (lines[i].indexOf('|') === -1) continue;
      var cells = lines[i].split('|').map(function (c) { return c.trim(); }).filter(function (c) { return c; });
      var lower = cells.map(function (c) { return c.toLowerCase(); });
      if (lower.indexOf('id') !== -1 && lower.indexOf('title') !== -1) {
        headerIdx = i;
        headers = lower;
        break;
      }
    }

    if (headerIdx === -1) return items;

    var idCol = headers.indexOf('id');
    var titleCol = headers.indexOf('title');
    var phaseCol = headers.indexOf('phase');

    // Skip separator row (usually headerIdx + 1 with dashes)
    var startRow = headerIdx + 1;
    if (startRow < lines.length && lines[startRow].match(/^\s*\|[\s\-|:]+\|\s*$/)) {
      startRow++;
    }

    for (var r = startRow; r < lines.length; r++) {
      if (lines[r].indexOf('|') === -1) continue;
      var cells = lines[r].split('|').map(function (c) { return c.trim(); }).filter(function (c) { return c; });
      var id = (idCol >= 0 && idCol < cells.length) ? cells[idCol] : '';
      var title = (titleCol >= 0 && titleCol < cells.length) ? cells[titleCol] : '';
      if (!id && !title) continue;
      var phase = (phaseCol >= 0 && phaseCol < cells.length) ? cells[phaseCol] : '';
      items.push({
        id: id,
        title: title,
        status: 'planned',
        phase: phase,
        owner: '',
        priority: 'medium'
      });
    }

    return items;
  }

  function wiShowEmptyState(projectId, slug, containerEl) {
    // Destroy existing grid
    destroyWorkItemGrid(projectId);

    containerEl.innerHTML =
      '<div class="detail__work-items">' +
        '<div class="detail__work-items-header">' +
          '<span class="detail__label">Work Items</span>' +
        '</div>' +
        '<div class="detail__work-items-empty">' +
          '<p class="detail__work-items-empty-text">No work items tracked yet.</p>' +
          '<div class="detail__work-items-empty-actions">' +
            '<button class="detail__btn--secondary" type="button" data-wi-action="add">+ Add Work Item</button>' +
            '<button class="detail__btn--ghost" type="button" data-wi-action="import">Import from Requirements</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    containerEl.addEventListener('click', function onEmptyClick(e) {
      var target = e.target.closest('[data-wi-action]');
      if (!target) return;
      containerEl.removeEventListener('click', onEmptyClick);
      var action = target.getAttribute('data-wi-action');
      if (action === 'add') {
        wiCreateGridWithItems(projectId, slug, containerEl, []);
        // Add first item immediately
        setTimeout(function () { wiAddRow(projectId); }, 100);
      } else if (action === 'import') {
        wiOpenImportModal(projectId, slug, containerEl);
      }
    });
  }

  function wiAddRow(projectId) {
    var api = _workItemGrids[projectId];
    if (!api) return;
    var newId = wiGetNextId(api, _workItemPrefixes[projectId]);
    var newItem = {
      id: newId,
      title: '',
      status: 'planned',
      phase: '',
      owner: '',
      priority: 'medium',
      _newRow: true
    };
    api.applyTransaction({ add: [newItem] });

    // Update header count
    wiUpdateHeaderCount(projectId);

    // Focus the title cell on the new row (find by ID, not last index — sort may reorder)
    var newNode = api.getRowNode(newId);
    var newIdx = newNode ? newNode.rowIndex : api.getDisplayedRowCount() - 1;
    api.ensureIndexVisible(newIdx);
    setTimeout(function () {
      // Re-fetch index in case sort settled
      var node = api.getRowNode(newId);
      var idx = node ? node.rowIndex : newIdx;
      api.setFocusedCell(idx, 'title');
      api.startEditingCell({ rowIndex: idx, colKey: 'title' });
    }, 50);

    wiScheduleSave(projectId);
  }

  function wiUpdateHeaderCount(projectId) {
    var api = _workItemGrids[projectId];
    if (!api) return;
    var count = api.getDisplayedRowCount();
    var badge = document.querySelector('.detail__work-items-container[data-project-id="' + CSS.escape(projectId) + '"] .detail__count-badge');
    if (badge) badge.textContent = '(' + count + ')';
  }

  function wiOpenImportModal(projectId, slug, containerEl) {
    // Create or reuse import modal overlay
    if (!_wiImportOverlay) {
      _wiImportOverlay = document.createElement('div');
      _wiImportOverlay.className = 'wi-import-overlay';
      _wiImportOverlay.setAttribute('aria-hidden', 'true');
      _wiImportOverlay.setAttribute('role', 'dialog');
      _wiImportOverlay.setAttribute('aria-modal', 'true');
      _wiImportOverlay.setAttribute('aria-label', 'Import Work Items');
      document.body.appendChild(_wiImportOverlay);
    }

    var parsedItems = [];

    function renderPasteStep() {
      _wiImportOverlay.innerHTML =
        '<div class="wi-import-modal">' +
          '<div class="wi-import-modal__header">' +
            '<h3 class="wi-import-modal__title">Import Work Items</h3>' +
            '<button class="wi-import-modal__close" type="button" aria-label="Close">&times;</button>' +
          '</div>' +
          '<div class="wi-import-modal__body">' +
            '<textarea class="wi-import-modal__textarea" placeholder="Paste a markdown table with ID and Title columns..."></textarea>' +
          '</div>' +
          '<div class="wi-import-modal__actions">' +
            '<button class="detail__btn--ghost" type="button" data-wi-import="cancel">Cancel</button>' +
            '<button class="detail__btn--secondary" type="button" data-wi-import="parse">Parse</button>' +
          '</div>' +
        '</div>';
    }

    function renderPreviewStep() {
      var html =
        '<div class="wi-import-modal">' +
          '<div class="wi-import-modal__header">' +
            '<h3 class="wi-import-modal__title">Import Work Items</h3>' +
            '<button class="wi-import-modal__close" type="button" aria-label="Close">&times;</button>' +
          '</div>' +
          '<div class="wi-import-modal__body">';

      if (parsedItems.length === 0) {
        html += '<p class="wi-import-modal__error">No work items found. Expected format: markdown table with ID and Title columns.</p>';
      } else {
        html += '<p class="wi-import-modal__preview-count">Found ' + parsedItems.length + ' work items</p>';
        html += '<ul class="wi-import-modal__preview-list">';
        for (var i = 0; i < parsedItems.length; i++) {
          html += '<li class="wi-import-modal__preview-item"><span class="wi-import-modal__preview-id">' +
            escapeHTML(parsedItems[i].id) + '</span>' + escapeHTML(parsedItems[i].title) + '</li>';
        }
        html += '</ul>';
      }

      html += '</div>' +
        '<div class="wi-import-modal__actions">' +
          '<button class="detail__btn--ghost" type="button" data-wi-import="back">Back</button>';
      if (parsedItems.length > 0) {
        html += '<button class="detail__btn--secondary" type="button" data-wi-import="confirm">Confirm</button>';
      }
      html += '</div></div>';
      _wiImportOverlay.innerHTML = html;
    }

    function closeImport() {
      _wiImportOverlay.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }

    renderPasteStep();
    _wiImportOverlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    var textarea = _wiImportOverlay.querySelector('.wi-import-modal__textarea');
    if (textarea) textarea.focus();

    _wiImportOverlay.onclick = function (e) {
      if (e.target === _wiImportOverlay) {
        closeImport();
        return;
      }

      var close = e.target.closest('.wi-import-modal__close');
      if (close) { closeImport(); return; }

      var action = e.target.closest('[data-wi-import]');
      if (!action) return;
      var cmd = action.getAttribute('data-wi-import');

      if (cmd === 'cancel') {
        closeImport();
      } else if (cmd === 'parse') {
        var text = _wiImportOverlay.querySelector('.wi-import-modal__textarea').value;
        parsedItems = wiParseMarkdownTable(text);
        renderPreviewStep();
      } else if (cmd === 'back') {
        renderPasteStep();
        var ta = _wiImportOverlay.querySelector('.wi-import-modal__textarea');
        if (ta) ta.focus();
      } else if (cmd === 'confirm') {
        closeImport();
        // Add items to grid or create grid
        var api = _workItemGrids[projectId];
        if (api) {
          api.applyTransaction({ add: parsedItems });
          wiUpdateHeaderCount(projectId);
          wiScheduleSave(projectId);
        } else {
          wiCreateGridWithItems(projectId, slug, containerEl, parsedItems);
        }
      }
    };
  }

  function wiCreateGridWithItems(projectId, slug, containerEl, items) {
    containerEl.innerHTML =
      '<div class="detail__work-items">' +
        '<div class="detail__work-items-header">' +
          '<span class="detail__label">Work Items <span class="detail__count-badge">(' + items.length + ')</span></span>' +
          '<div class="detail__work-items-actions">' +
            '<button class="detail__btn--ghost" type="button" data-wi-action="import">Import</button>' +
            '<button class="detail__btn--ghost" type="button" data-wi-action="add">+ Add</button>' +
          '</div>' +
        '</div>' +
        '<div class="detail__work-items-grid ag-theme-quartz"></div>' +
      '</div>';

    var gridEl = containerEl.querySelector('.detail__work-items-grid');

    var columnDefs = [
      {
        field: 'id',
        headerName: 'ID',
        width: 80,
        pinned: 'left',
        editable: function (params) { return !!params.data._newRow; },
        cellStyle: { fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-secondary)' }
      },
      {
        field: 'title',
        headerName: 'Title',
        flex: 2,
        editable: true,
        cellStyle: { color: 'var(--color-text-primary)' }
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 130,
        editable: true,
        cellEditor: 'agSelectCellEditor',
        cellEditorParams: { values: ['planned', 'in-progress', 'completed', 'deferred'] },
        cellRenderer: function (params) { return wiBadgeCellRenderer(params, WI_STATUS_BADGE); },
        comparator: wiStatusComparator
      },
      {
        field: 'phase',
        headerName: 'Phase',
        width: 100,
        editable: true,
        cellStyle: { color: 'var(--color-text-secondary)' }
      },
      {
        field: 'owner',
        headerName: 'Owner',
        width: 140,
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
          name.style.color = 'var(--color-text-secondary)';
          wrapper.appendChild(name);
          return wrapper;
        }
      },
      {
        field: 'priority',
        headerName: 'Priority',
        width: 100,
        editable: true,
        cellEditor: 'agSelectCellEditor',
        cellEditorParams: { values: ['high', 'medium', 'low'] },
        cellRenderer: function (params) { return wiBadgeCellRenderer(params, WI_PRIORITY_BADGE); }
      },
      {
        headerName: '',
        width: 40,
        sortable: false,
        filter: false,
        editable: false,
        cellRenderer: function (params) {
          return wiActionCellRenderer(params);
        },
        suppressHeaderMenuButton: true
      }
    ];

    var gridOptions = {
      columnDefs: columnDefs,
      rowData: items,
      domLayout: 'autoHeight',
      rowHeight: 44,
      headerHeight: 40,
      animateRows: true,
      singleClickEdit: true,
      stopEditingWhenCellsLoseFocus: true,
      context: { projectId: projectId, slug: slug, containerEl: containerEl },
      defaultColDef: {
        sortable: true,
        resizable: false,
        suppressMovable: true
      },
      getRowId: function (params) { return params.data.id; },
      onCellValueChanged: function (event) {
        // After editing ID, mark row as no longer new
        if (event.colDef.field === 'id') {
          delete event.data._newRow;
        }
        wiUpdateHeaderCount(projectId);
        wiScheduleSave(projectId);
      },
      onSortChanged: function () {},
      initialState: {
        sort: {
          sortModel: [
            { colId: 'status', sort: 'asc' }
          ]
        }
      }
    };

    var gridApi = agGrid.createGrid(gridEl, gridOptions);
    _workItemGrids[projectId] = gridApi;

    // Wire header buttons
    containerEl.addEventListener('click', function (e) {
      var target = e.target.closest('[data-wi-action]');
      if (!target) return;
      var action = target.getAttribute('data-wi-action');
      if (action === 'add') {
        wiAddRow(projectId);
      } else if (action === 'import') {
        wiOpenImportModal(projectId, slug, containerEl);
      }
    });
  }

  function renderWorkItemsSection(projectId, slug, containerEl) {
    // Show loading state
    containerEl.innerHTML =
      '<div class="detail__work-items">' +
        '<div class="detail__work-items-header">' +
          '<span class="detail__label">Work Items</span>' +
        '</div>' +
        '<p class="detail__work-items-loading">Loading work items...</p>' +
      '</div>';

    // Ensure AG Grid is loaded, then fetch data
    ensureAgGrid()
      .then(function () {
        return fetch(API_BASE + '/' + encodeURIComponent(projectId) + '/work-items')
          .then(function (res) {
            if (!res.ok) throw new Error('Failed to load');
            return res.json();
          });
      })
      .then(function (data) {
        var items = data.workItems || [];
        _workItemPrefixes[projectId] = data.taskPrefix || '';
        if (items.length === 0) {
          wiShowEmptyState(projectId, slug, containerEl);
        } else {
          wiCreateGridWithItems(projectId, slug, containerEl, items);
        }
      })
      .catch(function () {
        containerEl.innerHTML =
          '<div class="detail__work-items">' +
            '<div class="detail__work-items-header">' +
              '<span class="detail__label">Work Items</span>' +
            '</div>' +
            '<div class="detail__work-items-error">' +
              'Failed to load work items. <a href="#" data-wi-retry>Retry</a>' +
            '</div>' +
          '</div>';
        containerEl.querySelector('[data-wi-retry]').addEventListener('click', function (e) {
          e.preventDefault();
          renderWorkItemsSection(projectId, slug, containerEl);
        });
      });
  }

})();
