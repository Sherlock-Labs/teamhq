(function () {
  'use strict';

  var API_BASE = '/api/meetings';
  var TOAST_DURATION = 4000;
  var POLL_INTERVAL = 5000;

  var listContainer = document.getElementById('meetings-list');
  var charterBtn = document.getElementById('meeting-charter-btn');
  var weeklyBtn = document.getElementById('meeting-weekly-btn');

  if (!listContainer) return;

  // Agent display info for transcript rendering
  var AGENTS = {
    'Thomas': { role: 'Product Manager', avatar: 'img/avatars/thomas.svg', color: '#818cf8' },
    'Andrei': { role: 'Technical Architect', avatar: 'img/avatars/andrei.svg', color: '#a78bfa' },
    'Robert': { role: 'Product Designer', avatar: 'img/avatars/robert.svg', color: '#c084fc' },
    'Alice': { role: 'Front-End Developer', avatar: 'img/avatars/alice.svg', color: '#f472b6' },
    'Jonah': { role: 'Back-End Developer', avatar: 'img/avatars/jonah.svg', color: '#34d399' },
    'Enzo': { role: 'QA Engineer', avatar: 'img/avatars/enzo.svg', color: '#fbbf24' },
  };

  // State
  var meetings = [];
  var detailCache = {};  // id -> full meeting data (with transcript)
  var expandedId = null;
  var runningMeetingType = null;  // 'charter' | 'weekly' | null
  var pollTimer = null;

  // --- API ---

  function apiGet() {
    return fetch(API_BASE)
      .then(function (res) {
        if (!res.ok) throw new Error('Failed to load meetings');
        return res.json();
      })
      .then(function (data) { return data.meetings; });
  }

  function apiGetOne(id) {
    return fetch(API_BASE + '/' + encodeURIComponent(id))
      .then(function (res) {
        if (!res.ok) throw new Error('Failed to load meeting');
        return res.json();
      });
  }

  function apiRun(type, agenda) {
    var body = { type: type };
    if (agenda) body.agenda = agenda;
    return fetch(API_BASE + '/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(function (res) {
      if (!res.ok) return res.json().then(function (err) { throw err; });
      return res.json();
    });
  }

  // --- Rendering ---

  function renderList() {
    if (meetings.length === 0 && !runningMeetingType) {
      listContainer.innerHTML =
        '<div class="meetings__empty">' +
          '<p class="meetings__empty-text">No meetings yet.</p>' +
          '<p class="meetings__empty-hint">Run a Charter Meeting to get started.</p>' +
        '</div>';
      updateButtons();
      return;
    }

    var html = '';

    // Show running indicator if a meeting is in progress
    if (runningMeetingType) {
      html +=
        '<div class="meeting-card meeting-card--running">' +
          '<div class="meeting-card__header">' +
            '<div class="meeting-card__meta">' +
              '<span class="meeting-card__badge meeting-card__badge--' + runningMeetingType + '">' +
                (runningMeetingType === 'charter' ? 'Charter' : 'Weekly') +
              '</span>' +
              '<span class="meeting-card__running-text">' +
                '<span class="meeting-card__running-dot"></span>' +
                'Meeting in progress...' +
              '</span>' +
            '</div>' +
          '</div>' +
        '</div>';
    }

    html += meetings.map(renderCard).join('');
    listContainer.innerHTML = html;

    // Re-expand if a card was expanded
    if (expandedId) {
      var card = listContainer.querySelector('[data-meeting-id="' + CSS.escape(expandedId) + '"]');
      if (card) {
        var header = card.querySelector('.meeting-card__header');
        var details = card.querySelector('.meeting-card__details');
        if (header && details) {
          header.setAttribute('aria-expanded', 'true');
          details.setAttribute('aria-hidden', 'false');
          if (detailCache[expandedId]) {
            renderDetailView(expandedId);
          }
        }
      }
    }

    updateButtons();
  }

  function renderCard(meeting) {
    var typeBadge = meeting.type === 'charter' ? 'Charter' : 'Weekly';
    var statusBadge = '';
    if (meeting.status === 'failed') {
      statusBadge = '<span class="meeting-card__status meeting-card__status--failed">Failed</span>';
    }

    return (
      '<article class="meeting-card" data-meeting-id="' + escapeAttr(meeting.id) + '">' +
        '<button class="meeting-card__header" type="button" aria-expanded="false">' +
          '<div class="meeting-card__meta">' +
            '<span class="meeting-card__badge meeting-card__badge--' + escapeAttr(meeting.type) + '">' +
              escapeHTML(typeBadge) +
            '</span>' +
            '<span class="meeting-card__number">#' + meeting.meetingNumber + '</span>' +
            statusBadge +
          '</div>' +
          '<div class="meeting-card__summary">' +
            '<p class="meeting-card__summary-text">' + escapeHTML(meeting.summary || 'No summary available.') + '</p>' +
          '</div>' +
          '<div class="meeting-card__info">' +
            (meeting.mood ? '<span class="meeting-card__mood">' + escapeHTML(meeting.mood) + '</span>' : '') +
            '<span class="meeting-card__date">' + escapeHTML(formatDate(meeting.startedAt)) + '</span>' +
            (meeting.durationMs ? '<span class="meeting-card__duration">' + formatDuration(meeting.durationMs) + '</span>' : '') +
          '</div>' +
          '<span class="meeting-card__chevron" aria-hidden="true"></span>' +
        '</button>' +
        '<div class="meeting-card__details" aria-hidden="true">' +
          '<div class="meeting-card__details-inner"></div>' +
        '</div>' +
      '</article>'
    );
  }

  function renderDetailView(id) {
    var card = listContainer.querySelector('[data-meeting-id="' + CSS.escape(id) + '"]');
    if (!card) return;
    var inner = card.querySelector('.meeting-card__details-inner');
    var meeting = detailCache[id];
    if (!meeting) return;

    var html = '';

    // Key Takeaways
    if (meeting.keyTakeaways && meeting.keyTakeaways.length > 0) {
      html += '<div class="meeting-detail__section">';
      html += '<h4 class="meeting-detail__label">Key Takeaways</h4>';
      html += '<ul class="meeting-detail__list">';
      for (var i = 0; i < meeting.keyTakeaways.length; i++) {
        html += '<li class="meeting-detail__list-item">' + escapeHTML(meeting.keyTakeaways[i]) + '</li>';
      }
      html += '</ul></div>';
    }

    // Decisions
    if (meeting.decisions && meeting.decisions.length > 0) {
      html += '<div class="meeting-detail__section">';
      html += '<h4 class="meeting-detail__label">Decisions</h4>';
      html += '<div class="meeting-detail__decisions">';
      for (var i = 0; i < meeting.decisions.length; i++) {
        var d = meeting.decisions[i];
        html +=
          '<div class="meeting-detail__decision">' +
            '<p class="meeting-detail__decision-desc">' + escapeHTML(d.description) + '</p>' +
            '<p class="meeting-detail__decision-rationale">' + escapeHTML(d.rationale) + '</p>' +
            '<div class="meeting-detail__decision-participants">' +
              d.participants.map(function (p) {
                return '<span class="meeting-detail__participant">' + escapeHTML(p) + '</span>';
              }).join('') +
            '</div>' +
          '</div>';
      }
      html += '</div></div>';
    }

    // Action Items
    if (meeting.actionItems && meeting.actionItems.length > 0) {
      html += '<div class="meeting-detail__section">';
      html += '<h4 class="meeting-detail__label">Action Items</h4>';
      html += '<div class="meeting-detail__actions">';
      for (var i = 0; i < meeting.actionItems.length; i++) {
        var a = meeting.actionItems[i];
        html +=
          '<div class="meeting-detail__action">' +
            '<span class="meeting-detail__action-priority meeting-detail__action-priority--' + escapeAttr(a.priority) + '">' +
              escapeHTML(a.priority) +
            '</span>' +
            '<span class="meeting-detail__action-owner">' + escapeHTML(a.owner) + '</span>' +
            '<span class="meeting-detail__action-desc">' + escapeHTML(a.description) + '</span>' +
            '<button class="meeting-detail__action-start" type="button" ' +
              'data-action-desc="' + escapeAttr(a.description) + '" ' +
              'data-action-owner="' + escapeAttr(a.owner) + '" ' +
              'data-action-priority="' + escapeAttr(a.priority) + '" ' +
              'data-meeting-number="' + meeting.meetingNumber + '" ' +
              'data-meeting-type="' + escapeAttr(meeting.type) + '">' +
              'Start as Project' +
            '</button>' +
          '</div>';
      }
      html += '</div></div>';
    }

    // Transcript toggle
    if (meeting.transcript && meeting.transcript.length > 0) {
      html += '<div class="meeting-detail__section">';
      html += '<button class="meeting-detail__transcript-toggle" type="button" aria-expanded="false">';
      html += '<span class="meeting-detail__transcript-chevron" aria-hidden="true"></span>';
      html += '<h4 class="meeting-detail__label meeting-detail__label--inline">Transcript</h4>';
      html += '<span class="meeting-detail__transcript-count">' + meeting.transcript.length + ' messages</span>';
      html += '</button>';
      html += '<div class="meeting-detail__transcript" aria-hidden="true">';
      html += '<div class="meeting-detail__transcript-inner">';
      for (var i = 0; i < meeting.transcript.length; i++) {
        html += renderTranscriptEntry(meeting.transcript[i]);
      }
      html += '</div></div></div>';
    }

    // Next Meeting Topics
    if (meeting.nextMeetingTopics && meeting.nextMeetingTopics.length > 0) {
      html += '<div class="meeting-detail__section">';
      html += '<h4 class="meeting-detail__label">Next Meeting Topics</h4>';
      html += '<ul class="meeting-detail__list">';
      for (var i = 0; i < meeting.nextMeetingTopics.length; i++) {
        html += '<li class="meeting-detail__list-item">' + escapeHTML(meeting.nextMeetingTopics[i]) + '</li>';
      }
      html += '</ul></div>';
    }

    inner.innerHTML = html;
  }

  function renderTranscriptEntry(entry) {
    var agent = AGENTS[entry.speaker] || { role: entry.role || '', avatar: '', color: '#a1a1aa' };
    var avatarHtml = agent.avatar
      ? '<img src="' + escapeAttr(agent.avatar) + '" alt="" width="28" height="28">'
      : '<span>' + escapeHTML(entry.speaker.charAt(0)) + '</span>';

    return (
      '<div class="meeting-transcript__entry">' +
        '<div class="meeting-transcript__avatar" style="border-color: ' + agent.color + '">' +
          avatarHtml +
        '</div>' +
        '<div class="meeting-transcript__content">' +
          '<div class="meeting-transcript__meta">' +
            '<span class="meeting-transcript__speaker" style="color: ' + agent.color + '">' +
              escapeHTML(entry.speaker) +
            '</span>' +
            '<span class="meeting-transcript__role">' + escapeHTML(agent.role || entry.role) + '</span>' +
          '</div>' +
          '<p class="meeting-transcript__text">' + escapeHTML(entry.text) + '</p>' +
        '</div>' +
      '</div>'
    );
  }

  // --- Expand/Collapse ---

  function expandCard(id) {
    if (expandedId && expandedId !== id) {
      collapseCard(expandedId);
    }

    expandedId = id;
    var card = listContainer.querySelector('[data-meeting-id="' + CSS.escape(id) + '"]');
    if (!card) return;

    var header = card.querySelector('.meeting-card__header');
    var details = card.querySelector('.meeting-card__details');
    header.setAttribute('aria-expanded', 'true');
    details.setAttribute('aria-hidden', 'false');

    if (detailCache[id]) {
      renderDetailView(id);
    } else {
      var inner = card.querySelector('.meeting-card__details-inner');
      inner.innerHTML =
        '<div class="meeting-detail__loading"><span>Loading...</span></div>';

      apiGetOne(id)
        .then(function (meeting) {
          detailCache[id] = meeting;
          if (expandedId === id) {
            renderDetailView(id);
          }
        })
        .catch(function () {
          if (expandedId === id) {
            inner.innerHTML =
              '<div class="meeting-detail__loading"><span>Failed to load meeting details.</span></div>';
          }
        });
    }
  }

  function collapseCard(id) {
    var card = listContainer.querySelector('[data-meeting-id="' + CSS.escape(id) + '"]');
    if (card) {
      var header = card.querySelector('.meeting-card__header');
      var details = card.querySelector('.meeting-card__details');
      header.setAttribute('aria-expanded', 'false');
      details.setAttribute('aria-hidden', 'true');
    }
    if (expandedId === id) expandedId = null;
  }

  // --- Button State ---

  function updateButtons() {
    var hasCharter = meetings.some(function (m) {
      return m.type === 'charter' && m.status === 'completed';
    });

    if (charterBtn) {
      charterBtn.disabled = !!runningMeetingType;
      charterBtn.textContent = runningMeetingType === 'charter' ? 'Running...' : 'Run Charter';
    }

    if (weeklyBtn) {
      weeklyBtn.disabled = !hasCharter || !!runningMeetingType;
      weeklyBtn.textContent = runningMeetingType === 'weekly' ? 'Running...' : 'Run Weekly';
      if (!hasCharter) {
        weeklyBtn.title = 'Run a charter meeting first';
      } else {
        weeklyBtn.title = '';
      }
    }
  }

  // --- Run Meeting ---

  function handleRun(type) {
    if (runningMeetingType) return;

    runningMeetingType = type;
    renderList();

    apiRun(type)
      .then(function () {
        showToast((type === 'charter' ? 'Charter' : 'Weekly') + ' meeting started. This may take a minute...');
        startPolling();
      })
      .catch(function (err) {
        runningMeetingType = null;
        renderList();
        var msg = (err && err.error) || 'Failed to start meeting';
        showToast(msg, true);
      });
  }

  // --- Polling ---

  function startPolling() {
    stopPolling();
    pollTimer = setInterval(function () {
      apiGet()
        .then(function (data) {
          var wasRunning = runningMeetingType;
          meetings = data;

          // Check if any meeting is still running
          var hasRunning = meetings.some(function (m) { return m.status === 'running'; });
          if (!hasRunning && wasRunning) {
            runningMeetingType = null;
            stopPolling();
            showToast('Meeting completed!');
          }

          renderList();
        })
        .catch(function () {
          // ignore poll errors
        });
    }, POLL_INTERVAL);
  }

  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  // --- Event Handlers ---

  if (charterBtn) {
    charterBtn.addEventListener('click', function () { handleRun('charter'); });
  }

  if (weeklyBtn) {
    weeklyBtn.addEventListener('click', function () { handleRun('weekly'); });
  }

  listContainer.addEventListener('click', function (e) {
    // Start as Project button
    var startBtn = e.target.closest('.meeting-detail__action-start');
    if (startBtn && !startBtn.disabled) {
      startBtn.disabled = true;
      startBtn.textContent = 'Creating...';

      var desc = startBtn.getAttribute('data-action-desc');
      var owner = startBtn.getAttribute('data-action-owner');
      var priority = startBtn.getAttribute('data-action-priority');
      var meetingNum = startBtn.getAttribute('data-meeting-number');
      var meetingType = startBtn.getAttribute('data-meeting-type');

      // Truncate description to a short project name
      var name = desc.length > 60 ? desc.substring(0, 57) + '...' : desc;

      var brief = desc +
        '\n\nOwner: ' + owner +
        '\nPriority: ' + priority +
        '\nSource: ' + (meetingType === 'charter' ? 'Charter' : 'Weekly') +
        ' Meeting #' + meetingNum;

      fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name, brief: brief, status: 'planned' }),
      })
        .then(function (res) {
          if (!res.ok) throw new Error('Failed to create project');
          return res.json();
        })
        .then(function () {
          startBtn.textContent = 'Created';
          startBtn.classList.add('meeting-detail__action-start--created');
          document.dispatchEvent(new CustomEvent('projects:refresh'));
          showToast('Project created! View it in the Projects section above.');
          var projectsSection = document.getElementById('projects');
          if (projectsSection) {
            projectsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        })
        .catch(function () {
          startBtn.disabled = false;
          startBtn.textContent = 'Start as Project';
          showToast('Failed to create project. Please try again.', true);
        });
      return;
    }

    // Transcript toggle
    var toggleBtn = e.target.closest('.meeting-detail__transcript-toggle');
    if (toggleBtn) {
      var isExpanded = toggleBtn.getAttribute('aria-expanded') === 'true';
      toggleBtn.setAttribute('aria-expanded', isExpanded ? 'false' : 'true');
      var transcript = toggleBtn.nextElementSibling;
      if (transcript) {
        transcript.setAttribute('aria-hidden', isExpanded ? 'true' : 'false');
      }
      return;
    }

    // Card header (expand/collapse)
    var header = e.target.closest('.meeting-card__header');
    if (header) {
      var card = header.closest('.meeting-card');
      if (card.classList.contains('meeting-card--running')) return;
      var id = card.getAttribute('data-meeting-id');
      var isExpanded = header.getAttribute('aria-expanded') === 'true';
      if (isExpanded) {
        collapseCard(id);
      } else {
        expandCard(id);
      }
      return;
    }
  });

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

  // --- Helpers ---

  function formatDate(dateStr) {
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

  function formatDuration(ms) {
    if (!ms) return '';
    var totalSeconds = Math.floor(ms / 1000);
    var minutes = Math.floor(totalSeconds / 60);
    var seconds = totalSeconds % 60;
    if (minutes === 0) return seconds + 's';
    return minutes + 'm ' + seconds + 's';
  }

  function escapeHTML(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  function escapeAttr(str) {
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // --- Init ---

  apiGet()
    .then(function (data) {
      meetings = data;

      // Check if any meeting is still running
      var hasRunning = meetings.some(function (m) { return m.status === 'running'; });
      if (hasRunning) {
        runningMeetingType = 'running';
        startPolling();
      }

      renderList();
    })
    .catch(function () {
      listContainer.innerHTML =
        '<p class="meetings__error">Unable to load meetings.</p>';
    });

})();
