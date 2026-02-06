(function () {
  'use strict';

  var API_BASE = '/api/projects';
  var TOAST_DURATION = 4000;

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

  function apiListSessions(projectId) {
    return fetch(API_BASE + '/' + encodeURIComponent(projectId) + '/sessions')
      .then(function (res) {
        if (!res.ok) throw new Error('Failed to load sessions');
        return res.json();
      })
      .then(function (data) { return data.sessions; });
  }

  // --- Rendering ---

  function renderList() {
    if (projects.length === 0) {
      listContainer.innerHTML =
        '<div class="projects__empty">' +
          '<p class="projects__empty-text">No projects yet.</p>' +
          '<p class="projects__empty-hint">Click "New Project" to get started.</p>' +
        '</div>';
      return;
    }
    listContainer.innerHTML = projects.map(renderCard).join('');

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
        }
      }
    }
  }

  function renderCard(project) {
    var statusLabel = formatStatus(project.status);
    var dateStr = formatDate(project);

    return (
      '<article class="project-card" data-project-id="' + escapeAttr(project.id) + '">' +
        '<div class="project-card__header-row">' +
          '<button class="project-card__header" type="button" aria-expanded="false">' +
            '<div class="project-card__summary">' +
              '<h3 class="project-card__name">' + escapeHTML(project.name) + '</h3>' +
              '<p class="project-card__desc">' + escapeHTML(project.description || '') + '</p>' +
            '</div>' +
            '<div class="project-card__meta">' +
              (project.activeSessionId ? '<span class="project-card__running-indicator" title="Session running"></span>' : '') +
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

  function renderDetailViewAndSessions(id) {
    renderDetailView(id);
    // Re-init session UI if this project has sessions
    var project = detailCache[id] || findProject(id);
    if (project && (project.status === 'in-progress' || project.status === 'completed')) {
      // If we had an active SSE for this project, reconnect
      if (activeSessionProjectId === id && viewingSessionId) {
        var isLive = project.activeSessionId === viewingSessionId;
        connectToSession(id, viewingSessionId, isLive);
      }
      loadSessionHistory(id);
    }
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
      html += renderSessionControls(project);
    }
    html += '</div>';

    // Session log placeholder (will be populated by SSE or session load)
    html += '<div class="session-log-container" data-project-id="' + escapeAttr(id) + '"></div>';

    // Session history placeholder (populated async)
    html += '<div class="session-history-container" data-project-id="' + escapeAttr(id) + '"></div>';

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

  function renderSessionControls(project) {
    var hasActiveSession = !!project.activeSessionId;
    var html = '<div class="detail__session-controls">';

    if (hasActiveSession) {
      // State C: Running
      html +=
        '<div class="detail__session-status">' +
          '<span class="detail__session-indicator detail__session-indicator--running"></span>' +
          '<span class="detail__session-status-text">Session running</span>' +
        '</div>' +
        '<button class="detail__stop-btn" type="button" data-session-id="' + escapeAttr(project.activeSessionId) + '">Stop Session</button>';
    } else {
      // State B or D: Ready or completed
      var label = viewingSessionId ? 'Run New Session' : 'Run Session';
      html += '<button class="detail__run-btn" type="button">' + label + '</button>';
    }

    if (project.kickoffPrompt) {
      html += '<button class="detail__kickoff-view-btn" type="button">View Prompt</button>';
    }

    html += '</div>';
    return html;
  }

  function renderSessionLog(sessionMeta, isLive) {
    var titleText = isLive ? 'Live Session' : 'Session Log';
    var timerClass = isLive ? ' session-log__timer--live' : '';
    var timerText = isLive ? '0:00' : (sessionMeta && sessionMeta.durationMs ? formatDurationShort(sessionMeta.durationMs) : '');
    var sessionId = sessionMeta ? sessionMeta.id : '';

    return (
      '<div class="session-log" data-session-id="' + escapeAttr(sessionId) + '">' +
        '<div class="session-log__header">' +
          '<span class="session-log__title">' + titleText + '</span>' +
          '<span class="session-log__timer' + timerClass + '">' + timerText + '</span>' +
        '</div>' +
        '<div class="session-log__body" role="log" aria-live="polite">' +
          '<div class="session-log__events"></div>' +
          '<div class="session-log__jump" aria-hidden="true">' +
            '<button class="session-log__jump-btn" type="button">Jump to latest</button>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  function renderSessionHistory(sessions, activeId) {
    if (!sessions || sessions.length === 0) {
      return (
        '<div class="session-history">' +
          '<div class="session-history__header">' +
            '<span class="detail__label">Sessions</span>' +
          '</div>' +
          '<div class="session-history__empty">' +
            '<p class="session-history__empty-text">No sessions yet.</p>' +
          '</div>' +
        '</div>'
      );
    }

    var hasLog = viewingSessionId || activeSessionId;
    var extraClass = hasLog ? ' session-history--with-log' : '';

    var html =
      '<div class="session-history' + extraClass + '">' +
        '<div class="session-history__header">' +
          '<span class="detail__label">Sessions</span>' +
          '<span class="session-history__count">' + sessions.length + ' session' + (sessions.length !== 1 ? 's' : '') + '</span>' +
        '</div>' +
        '<div class="session-history__list">';

    for (var i = 0; i < sessions.length; i++) {
      var s = sessions[i];
      var isActive = s.id === activeId;
      var activeClass = isActive ? ' session-history__item--active' : '';
      html +=
        '<button class="session-history__item' + activeClass + '" type="button" data-session-id="' + escapeAttr(s.id) + '">' +
          '<span class="session-history__item-status" data-status="' + escapeAttr(s.status) + '"></span>' +
          '<span class="session-history__item-date">' + escapeHTML(formatSessionDate(s.startedAt)) + '</span>' +
          '<span class="session-history__item-duration">' + (s.durationMs ? formatDurationShort(s.durationMs) : '--') + '</span>' +
          '<span class="session-history__item-events">' + (s.eventCount || 0) + ' events</span>' +
          '<span class="session-history__item-chevron" aria-hidden="true"></span>' +
        '</button>';
    }

    html += '</div></div>';
    return html;
  }

  function renderSessionEvent(event) {
    var timeStr = formatRelativeSessionTime(event.timestamp);

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
          '<span class="session-event__content">' + escapeHTML(event.data.text || '') + '</span>' +
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
      default:
        return '';
    }
  }

  function truncateStr(str, max) {
    if (str.length <= max) return str;
    return str.substring(0, max) + '...';
  }

  // --- Session SSE ---

  function connectToSession(projectId, sessionId, isLive) {
    disconnectSession();

    activeSessionProjectId = projectId;
    activeSessionId = sessionId;
    viewingSessionId = sessionId;
    sessionEvents = [];
    lastEventId = -1;
    autoScrollEnabled = true;
    currentStreamingEvent = null;

    var logContainer = getLogContainer(projectId);
    if (!logContainer) return;

    logContainer.innerHTML = renderSessionLog(null, isLive);

    if (isLive) {
      startSessionTimer(projectId);
    }

    var url = API_BASE + '/' + encodeURIComponent(projectId) + '/sessions/' + encodeURIComponent(sessionId) + '/events';
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
      // EventSource will auto-reconnect for live sessions.
      // For completed sessions, close it.
      if (!isLive && activeEventSource) {
        activeEventSource.close();
        activeEventSource = null;
      }
    };

    setupAutoScroll(projectId);
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
  }

  function appendSessionEvent(projectId, event) {
    sessionEvents.push(event);

    var eventsContainer = getEventsContainer(projectId);
    if (!eventsContainer) return;

    // Handle delta streaming for assistant_text
    if (event.type === 'assistant_text' && event.data && event.data.delta) {
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
        currentStreamingEvent.classList.remove('session-event--streaming');
        currentStreamingEvent = null;
      }

      // For non-delta assistant_text, skip if we already streamed it
      if (event.type === 'assistant_text' && !event.data.delta) {
        // This is a complete text block. If we were streaming, the content is already there.
        // Only render if we don't have a previous streaming block.
        // Check if the last rendered element already has this text
        var lastRendered = eventsContainer.lastElementChild;
        if (lastRendered && lastRendered.classList.contains('session-event--text')) {
          // Already have the text from deltas, skip
          doAutoScroll(projectId);
          return;
        }
      }

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

    // Update timer display
    var logEl = getLogContainer(projectId);
    if (logEl) {
      var timerEl = logEl.querySelector('.session-log__timer');
      if (timerEl) {
        timerEl.classList.remove('session-log__timer--live');
        timerEl.textContent = durationMs ? formatDurationShort(durationMs) : '';
      }
      var titleEl = logEl.querySelector('.session-log__title');
      if (titleEl) {
        titleEl.textContent = 'Session Log';
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

    // Re-render controls and card (remove running indicator)
    renderList();
    if (expandedId === projectId) {
      renderDetailView(projectId);
      // Reconnect to view the completed session log
      loadSessionLog(projectId, viewingSessionId);
      loadSessionHistory(projectId);
    }
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

  // --- Session Timer ---

  function startSessionTimer(projectId) {
    stopSessionTimer();

    var cached = detailCache[projectId];
    if (cached && cached.activeSessionId) {
      // Try to get the session startedAt time
      // For now, use current time as fallback
      sessionStartTime = Date.now();
    } else {
      sessionStartTime = Date.now();
    }

    sessionTimerInterval = setInterval(function () {
      var elapsed = Date.now() - sessionStartTime;
      var logContainer = getLogContainer(projectId);
      if (!logContainer) { stopSessionTimer(); return; }
      var timerEl = logContainer.querySelector('.session-log__timer');
      if (timerEl) {
        timerEl.textContent = formatTimerValue(elapsed);
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

  function formatTimerValue(ms) {
    var totalSeconds = Math.floor(ms / 1000);
    var minutes = Math.floor(totalSeconds / 60);
    var seconds = totalSeconds % 60;
    return minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
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
        renderList();

        // Re-render detail view and connect
        if (expandedId === projectId) {
          renderDetailView(projectId);
          connectToSession(projectId, session.id, true);
          loadSessionHistory(projectId);
        }
      })
      .catch(function (err) {
        if (runBtn) {
          runBtn.textContent = 'Run Session';
          runBtn.disabled = false;
        }
        var msg = (err && err.error) || 'Failed to start session';
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
          stopBtn.textContent = 'Stop Session';
          stopBtn.disabled = false;
        }
        showToast('Failed to stop session', true);
      });
  }

  function loadSessionLog(projectId, sessionId) {
    viewingSessionId = sessionId;
    var logContainer = getLogContainer(projectId);
    if (!logContainer) return;

    // Check if this is a live session
    var project = detailCache[projectId] || findProject(projectId);
    var isLive = project && project.activeSessionId === sessionId;

    connectToSession(projectId, sessionId, isLive);
  }

  function loadSessionHistory(projectId) {
    var histContainer = listContainer.querySelector('.session-history-container[data-project-id="' + CSS.escape(projectId) + '"]');
    if (!histContainer) return;

    apiListSessions(projectId)
      .then(function (sessions) {
        var displayedId = viewingSessionId || (findProject(projectId) || {}).activeSessionId;
        histContainer.innerHTML = renderSessionHistory(sessions, displayedId);
      })
      .catch(function () {
        histContainer.innerHTML = '';
      });
  }

  // --- Session Format Helpers ---

  function formatDurationShort(ms) {
    if (!ms) return '--';
    var totalSeconds = Math.floor(ms / 1000);
    var minutes = Math.floor(totalSeconds / 60);
    var seconds = totalSeconds % 60;
    if (minutes === 0) return seconds + 's';
    return minutes + 'm ' + seconds + 's';
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
      initSessionsForProject(id);
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
            initSessionsForProject(id);
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

    var card = listContainer.querySelector('[data-project-id="' + CSS.escape(id) + '"]');
    if (card) {
      var header = card.querySelector('.project-card__header');
      var details = card.querySelector('.project-card__details');
      header.setAttribute('aria-expanded', 'false');
      details.setAttribute('aria-hidden', 'true');
    }
    if (expandedId === id) expandedId = null;
  }

  function initSessionsForProject(id) {
    var project = detailCache[id] || findProject(id);
    if (!project) return;

    // If project has an active session, connect to its SSE stream
    if (project.activeSessionId) {
      connectToSession(id, project.activeSessionId, true);
    }

    // Load session history
    loadSessionHistory(id);
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
          'This project has no goals or brief. The kickoff prompt will have limited context.' +
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

    apiStart(id)
      .then(function (updated) {
        // Update local state
        var idx = findProjectIndex(id);
        if (idx !== -1) {
          projects[idx].status = updated.status;
          projects[idx].updatedAt = updated.updatedAt;
        }
        detailCache[id] = updated;

        renderList();
        openKickoffModal(updated.kickoffPrompt);
      })
      .catch(function () {
        // Restore the Start Work button
        if (actionArea) {
          actionArea.innerHTML =
            '<button class="detail__start-btn" type="button">Start Work</button>';
        }
        showToast('Failed to start project. Please try again.', true);
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
    renderDetailViewAndSessions(projectId);

    apiAddNote(projectId, content)
      .then(function (note) {
        if (cached) {
          var idx = cached.notes.indexOf(tempNote);
          if (idx !== -1) cached.notes[idx] = note;
        }
        renderDetailViewAndSessions(projectId);
      })
      .catch(function () {
        if (cached) {
          var idx = cached.notes.indexOf(tempNote);
          if (idx !== -1) cached.notes.splice(idx, 1);
        }
        renderDetailViewAndSessions(projectId);
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
    renderDetailViewAndSessions(projectId);

    apiDeleteNote(projectId, noteId)
      .catch(function () {
        cached.notes.splice(noteIdx, 0, note);
        renderDetailViewAndSessions(projectId);
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

    // Session history item
    var histItem = e.target.closest('.session-history__item');
    if (histItem) {
      var card = histItem.closest('.project-card');
      var projectId = card.getAttribute('data-project-id');
      var sessionId = histItem.getAttribute('data-session-id');
      loadSessionLog(projectId, sessionId);
      // Update active state in history
      var allItems = card.querySelectorAll('.session-history__item');
      for (var j = 0; j < allItems.length; j++) {
        allItems[j].classList.remove('session-history__item--active');
      }
      histItem.classList.add('session-history__item--active');
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

  // Enter key on notes input
  listContainer.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target.classList.contains('detail__notes-input')) {
      e.preventDefault();
      var card = e.target.closest('.project-card');
      var id = card.getAttribute('data-project-id');
      handleAddNote(id);
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

})();
