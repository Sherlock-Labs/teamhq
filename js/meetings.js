(function () {
  'use strict';

  var API_BASE = '/api/meetings';
  var TOAST_DURATION = 4000;
  var POLL_INTERVAL = 5000;
  var MIN_PARTICIPANTS = 2;
  var MAX_PARTICIPANTS = 6;

  var listContainer = document.getElementById('meetings-list');
  var charterBtn = document.getElementById('meeting-charter-btn');
  var weeklyBtn = document.getElementById('meeting-weekly-btn');
  var customBtn = document.getElementById('meeting-custom-btn');
  var createForm = document.getElementById('meetings-create-form');
  var participantGrid = document.getElementById('participant-grid');
  var participantCountEl = document.getElementById('participant-count');
  var instructionsTextarea = document.getElementById('meeting-instructions');
  var startBtn = document.getElementById('meeting-start-btn');

  if (!listContainer) return;

  // Read agent identity colors from CSS tokens (single source of truth)
  var rootStyles = getComputedStyle(document.documentElement);
  function agentColor(name) {
    return rootStyles.getPropertyValue('--color-agent-' + name).trim() || '#a1a1aa';
  }

  // Agent display info for transcript rendering (all 18 agents)
  var AGENTS = {
    'Thomas': { role: 'Product Manager', avatar: 'img/avatars/thomas.svg', color: agentColor('thomas') },
    'Andrei': { role: 'Technical Architect', avatar: 'img/avatars/andrei.svg', color: agentColor('andrei') },
    'Robert': { role: 'Product Designer', avatar: 'img/avatars/robert.svg', color: agentColor('robert') },
    'Alice': { role: 'Front-End Developer', avatar: 'img/avatars/alice.svg', color: agentColor('alice') },
    'Jonah': { role: 'Back-End Developer', avatar: 'img/avatars/jonah.svg', color: agentColor('jonah') },
    'Enzo': { role: 'QA Engineer', avatar: 'img/avatars/enzo.svg', color: agentColor('enzo') },
    'Priya': { role: 'Product Marketer', avatar: 'img/avatars/priya.svg', color: agentColor('priya') },
    'Suki': { role: 'Product Researcher', avatar: 'img/avatars/suki.svg', color: agentColor('suki') },
    'Marco': { role: 'Technical Researcher', avatar: 'img/avatars/marco.svg', color: agentColor('marco') },
    'Nadia': { role: 'Technical Writer', avatar: 'img/avatars/nadia.svg', color: agentColor('nadia') },
    'Yuki': { role: 'Data Analyst', avatar: 'img/avatars/yuki.svg', color: agentColor('yuki') },
    'Kai': { role: 'AI Engineer', avatar: 'img/avatars/kai.svg', color: agentColor('kai') },
    'Zara': { role: 'Mobile Developer', avatar: 'img/avatars/zara.svg', color: agentColor('zara') },
    'Leo': { role: 'Mobile Developer', avatar: 'img/avatars/leo.svg', color: agentColor('leo') },
    'Nina': { role: 'Interactions Specialist', avatar: 'img/avatars/nina.svg', color: agentColor('nina') },
    'Soren': { role: 'Responsive Specialist', avatar: 'img/avatars/soren.svg', color: agentColor('soren') },
    'Amara': { role: 'Accessibility Specialist', avatar: 'img/avatars/amara.svg', color: agentColor('amara') },
    'Howard': { role: 'Payments Engineer', avatar: 'img/avatars/howard.svg', color: agentColor('howard') },
    'Ravi': { role: 'Creative Strategist', avatar: 'img/avatars/ravi.svg', color: agentColor('ravi') },
  };

  // Agent roster for participant selection (key matches backend agent keys)
  var AGENT_ROSTER = [
    { key: 'product-manager', name: 'Thomas', role: 'PM' },
    { key: 'technical-architect', name: 'Andrei', role: 'Architect' },
    { key: 'product-designer', name: 'Robert', role: 'Designer' },
    { key: 'frontend-developer', name: 'Alice', role: 'FE Dev' },
    { key: 'backend-developer', name: 'Jonah', role: 'BE Dev' },
    { key: 'qa', name: 'Enzo', role: 'QA' },
    { key: 'product-marketer', name: 'Priya', role: 'Marketer' },
    { key: 'product-researcher', name: 'Suki', role: 'Researcher' },
    { key: 'technical-researcher', name: 'Marco', role: 'Tech Research' },
    { key: 'technical-writer', name: 'Nadia', role: 'Writer' },
    { key: 'data-analyst', name: 'Yuki', role: 'Analyst' },
    { key: 'ai-engineer', name: 'Kai', role: 'AI Engineer' },
    { key: 'mobile-developer-1', name: 'Zara', role: 'Mobile' },
    { key: 'mobile-developer-2', name: 'Leo', role: 'Mobile' },
    { key: 'frontend-interactions', name: 'Nina', role: 'Interactions' },
    { key: 'frontend-responsive', name: 'Soren', role: 'Responsive' },
    { key: 'frontend-accessibility', name: 'Amara', role: 'A11y' },
    { key: 'payments-engineer', name: 'Howard', role: 'Payments' },
    { key: 'creative-strategist', name: 'Ravi', role: 'Strategist' },
  ];

  // Map agent keys to display names (for participant avatars on cards)
  var AGENT_KEY_TO_NAME = {};
  AGENT_ROSTER.forEach(function (a) { AGENT_KEY_TO_NAME[a.key] = a.name; });

  // State
  var meetings = [];
  var detailCache = {};  // id -> full meeting data (with transcript)
  var expandedId = null;
  var runningMeetingType = null;  // 'charter' | 'weekly' | 'custom' | 'running' | null
  var pollTimer = null;
  var selectedParticipants = {};  // key -> true
  var createFormOpen = false;

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

  function apiRun(type, agenda, participants, instructions) {
    var body = { type: type };
    if (agenda) body.agenda = agenda;
    if (participants) body.participants = participants;
    if (instructions) body.instructions = instructions;
    return fetch(API_BASE + '/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(function (res) {
      if (!res.ok) return res.json().then(function (err) { throw err; });
      return res.json();
    });
  }

  // --- Creation Form ---

  function getSelectedCount() {
    var count = 0;
    for (var key in selectedParticipants) {
      if (selectedParticipants[key]) count++;
    }
    return count;
  }

  function getSelectedKeys() {
    var keys = [];
    for (var key in selectedParticipants) {
      if (selectedParticipants[key]) keys.push(key);
    }
    return keys;
  }

  function toggleCreateForm() {
    createFormOpen = !createFormOpen;
    if (createForm) {
      createForm.setAttribute('aria-hidden', createFormOpen ? 'false' : 'true');
    }
    if (customBtn) {
      customBtn.textContent = createFormOpen ? 'Cancel' : 'New Meeting';
    }
    if (!createFormOpen) {
      resetCreateForm();
    }
  }

  function resetCreateForm() {
    selectedParticipants = {};
    if (instructionsTextarea) instructionsTextarea.value = '';
    updateParticipantGrid();
    updateCreateFormValidation();
  }

  function renderParticipantGrid() {
    if (!participantGrid) return;
    var html = '';
    for (var i = 0; i < AGENT_ROSTER.length; i++) {
      var agent = AGENT_ROSTER[i];
      var avatarPath = 'img/avatars/' + agent.name.toLowerCase() + '.svg';
      html +=
        '<button class="meetings__participant-card" type="button" ' +
          'role="checkbox" aria-checked="false" ' +
          'data-agent-key="' + escapeAttr(agent.key) + '">' +
          '<div class="meetings__participant-avatar">' +
            '<img src="' + escapeAttr(avatarPath) + '" alt="" width="24" height="24">' +
          '</div>' +
          '<span class="meetings__participant-name">' + escapeHTML(agent.name) + '</span>' +
          '<span class="meetings__participant-role">' + escapeHTML(agent.role) + '</span>' +
        '</button>';
    }
    participantGrid.innerHTML = html;
  }

  function updateParticipantGrid() {
    if (!participantGrid) return;
    var count = getSelectedCount();
    var atMax = count >= MAX_PARTICIPANTS;
    var cards = participantGrid.querySelectorAll('.meetings__participant-card');
    for (var i = 0; i < cards.length; i++) {
      var card = cards[i];
      var key = card.getAttribute('data-agent-key');
      var isSelected = !!selectedParticipants[key];
      card.setAttribute('aria-checked', isSelected ? 'true' : 'false');
      // Disable unselected cards when max is reached
      if (atMax && !isSelected) {
        card.classList.add('meetings__participant-card--disabled');
      } else {
        card.classList.remove('meetings__participant-card--disabled');
      }
    }
  }

  function updateCreateFormValidation() {
    var count = getSelectedCount();
    var instructionsValue = instructionsTextarea ? instructionsTextarea.value.trim() : '';
    var isValid = count >= MIN_PARTICIPANTS && count <= MAX_PARTICIPANTS && instructionsValue.length > 0;

    // Update count display
    if (participantCountEl) {
      var hint = '';
      var countClass = '';
      if (count < MIN_PARTICIPANTS) {
        hint = ' <span class="meetings__create-form-count-hint">(min ' + MIN_PARTICIPANTS + ')</span>';
        countClass = 'meetings__create-form-count meetings__create-form-count--warning';
      } else if (count >= MAX_PARTICIPANTS) {
        hint = ' <span class="meetings__create-form-count-hint">(max)</span>';
        countClass = 'meetings__create-form-count meetings__create-form-count--max';
      } else {
        countClass = 'meetings__create-form-count';
      }
      participantCountEl.className = countClass;
      participantCountEl.innerHTML = count + ' selected' + hint;
    }

    // Update start button
    if (startBtn) {
      startBtn.disabled = !isValid || !!runningMeetingType;
    }
  }

  function handleParticipantClick(e) {
    var card = e.target.closest('.meetings__participant-card');
    if (!card) return;
    if (card.classList.contains('meetings__participant-card--disabled')) return;

    var key = card.getAttribute('data-agent-key');
    if (selectedParticipants[key]) {
      delete selectedParticipants[key];
    } else {
      selectedParticipants[key] = true;
    }
    updateParticipantGrid();
    updateCreateFormValidation();
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
      var badgeType = runningMeetingType;
      var badgeLabel = 'Charter';
      if (runningMeetingType === 'weekly') badgeLabel = 'Weekly';
      else if (runningMeetingType === 'custom') badgeLabel = 'Custom';
      else if (runningMeetingType === 'interview') badgeLabel = 'Interview';
      else if (runningMeetingType === 'running') { badgeLabel = 'Meeting'; badgeType = 'charter'; }

      var runningDotStyle = runningMeetingType === 'interview' ? ' style="background: var(--color-amber-600);"' : '';
      var runningText = runningMeetingType === 'interview' ? 'Interview in progress...' : 'Meeting in progress...';

      html +=
        '<div class="meeting-card meeting-card--running">' +
          '<div class="meeting-card__header">' +
            '<div class="meeting-card__meta">' +
              '<span class="meeting-card__badge meeting-card__badge--' + escapeAttr(badgeType) + '">' +
                escapeHTML(badgeLabel) +
              '</span>' +
              '<span class="meeting-card__running-text">' +
                '<span class="meeting-card__running-dot"' + runningDotStyle + '></span>' +
                escapeHTML(runningText) +
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
    var typeBadge = 'Charter';
    if (meeting.type === 'weekly') typeBadge = 'Weekly';
    else if (meeting.type === 'custom') typeBadge = 'Custom';
    else if (meeting.type === 'interview') typeBadge = 'Interview';

    var statusBadge = '';
    if (meeting.status === 'failed') {
      statusBadge = '<span class="meeting-card__status meeting-card__status--failed">Failed</span>';
    }

    // Build participant display
    var participantsHtml = '';
    if (meeting.type === 'interview') {
      participantsHtml =
        '<div class="meeting-card__participants">' +
          '<span class="meeting-card__participant-names">CEO + AI Interviewer</span>' +
        '</div>';
    } else if (meeting.type === 'custom' && meeting.participants && meeting.participants.length > 0) {
      var avatarsHtml = '';
      var namesArr = [];
      for (var i = 0; i < meeting.participants.length; i++) {
        var participantKey = meeting.participants[i];
        var participantName = AGENT_KEY_TO_NAME[participantKey] || participantKey;
        namesArr.push(participantName);
        var agent = AGENTS[participantName];
        if (agent && agent.avatar) {
          avatarsHtml +=
            '<div class="meeting-card__participant-avatar">' +
              '<img src="' + escapeAttr(agent.avatar) + '" alt="" width="20" height="20">' +
            '</div>';
        }
      }
      participantsHtml =
        '<div class="meeting-card__participants">' +
          avatarsHtml +
          '<span class="meeting-card__participant-names">' + escapeHTML(namesArr.join(', ')) + '</span>' +
        '</div>';
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
            (meeting.interviewConfig && meeting.interviewConfig.topic
              ? '<p class="meeting-card__topic">Topic: ' + escapeHTML(meeting.interviewConfig.topic) + '</p>'
              : '') +
            participantsHtml +
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

    // Instructions (custom meetings only)
    if (meeting.type === 'custom' && meeting.instructions) {
      html +=
        '<div class="meeting-detail__instructions">' +
          '<p class="meeting-detail__instructions-label">Meeting Instructions</p>' +
          '<p>' + escapeHTML(meeting.instructions) + '</p>' +
        '</div>';
    }

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

  // Special speaker colors for interview participants
  var INTERVIEW_SPEAKERS = {
    'CEO': { role: 'CEO', color: 'var(--color-text-primary)' },
    'AI Interviewer': { role: 'Interviewer', color: 'var(--color-amber-600)' },
  };

  function renderTranscriptEntry(entry) {
    var agent = AGENTS[entry.speaker];
    var interviewSpeaker = !agent ? INTERVIEW_SPEAKERS[entry.speaker] : null;
    var color = agent ? agent.color : (interviewSpeaker ? interviewSpeaker.color : agentColor('default'));
    var role = agent ? agent.role : (interviewSpeaker ? interviewSpeaker.role : (entry.role || ''));

    var avatarHtml = agent && agent.avatar
      ? '<img src="' + escapeAttr(agent.avatar) + '" alt="" width="28" height="28">'
      : '<span>' + escapeHTML(entry.speaker.charAt(0)) + '</span>';

    return (
      '<div class="meeting-transcript__entry">' +
        '<div class="meeting-transcript__avatar" style="border-color: ' + color + '">' +
          avatarHtml +
        '</div>' +
        '<div class="meeting-transcript__content">' +
          '<div class="meeting-transcript__meta">' +
            '<span class="meeting-transcript__speaker" style="color: ' + color + '">' +
              escapeHTML(entry.speaker) +
            '</span>' +
            '<span class="meeting-transcript__role">' + escapeHTML(role) + '</span>' +
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

    var interviewRunning = document.body.getAttribute('data-interview-running') === 'true';
    var anyRunning = !!runningMeetingType || interviewRunning;

    if (charterBtn) {
      charterBtn.disabled = anyRunning;
      charterBtn.textContent = runningMeetingType === 'charter' ? 'Running...' : 'Run Charter';
    }

    if (weeklyBtn) {
      weeklyBtn.disabled = !hasCharter || anyRunning;
      weeklyBtn.textContent = runningMeetingType === 'weekly' ? 'Running...' : 'Run Weekly';
      if (!hasCharter) {
        weeklyBtn.title = 'Run a charter meeting first';
      } else {
        weeklyBtn.title = '';
      }
    }

    if (customBtn) {
      if (anyRunning) {
        customBtn.disabled = true;
        if (runningMeetingType === 'custom') {
          customBtn.textContent = 'Running...';
        } else if (!createFormOpen) {
          customBtn.textContent = 'New Meeting';
        }
      } else {
        customBtn.disabled = false;
        customBtn.textContent = createFormOpen ? 'Cancel' : 'New Meeting';
      }
    }

    // Close create form when a meeting starts
    if (anyRunning && createFormOpen) {
      createFormOpen = false;
      if (createForm) {
        createForm.setAttribute('aria-hidden', 'true');
      }
    }

    // Update start button disabled state
    updateCreateFormValidation();
  }

  // --- Cross-module guard: notify interview.js when a meeting is running ---

  function notifyMeetingState() {
    document.body.setAttribute('data-meeting-running', runningMeetingType ? 'true' : 'false');
    document.dispatchEvent(new CustomEvent('meeting:stateChange', { detail: { running: !!runningMeetingType } }));
  }

  // --- Run Meeting ---

  function handleRun(type) {
    if (runningMeetingType) return;
    // Also check if an interview is running
    if (document.body.getAttribute('data-interview-running') === 'true') return;

    runningMeetingType = type;
    notifyMeetingState();
    renderList();

    apiRun(type)
      .then(function () {
        var label = 'Charter';
        if (type === 'weekly') label = 'Weekly';
        else if (type === 'custom') label = 'Custom';
        showToast(label + ' meeting started. This may take a minute...');
        startPolling();
      })
      .catch(function (err) {
        runningMeetingType = null;
        notifyMeetingState();
        renderList();
        var msg = (err && err.error) || 'Failed to start meeting';
        showToast(msg, true);
      });
  }

  function handleCustomRun() {
    if (runningMeetingType) return;
    if (document.body.getAttribute('data-interview-running') === 'true') return;

    var participants = getSelectedKeys();
    var instructions = instructionsTextarea ? instructionsTextarea.value.trim() : '';

    if (participants.length < MIN_PARTICIPANTS || participants.length > MAX_PARTICIPANTS) {
      showToast('Select ' + MIN_PARTICIPANTS + '-' + MAX_PARTICIPANTS + ' participants.', true);
      return;
    }
    if (!instructions) {
      showToast('Please enter meeting instructions.', true);
      return;
    }

    runningMeetingType = 'custom';
    notifyMeetingState();
    createFormOpen = false;
    if (createForm) createForm.setAttribute('aria-hidden', 'true');
    renderList();

    apiRun('custom', null, participants, instructions)
      .then(function () {
        showToast('Custom meeting started. This may take a minute...');
        resetCreateForm();
        startPolling();
      })
      .catch(function (err) {
        runningMeetingType = null;
        notifyMeetingState();
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
            notifyMeetingState();
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

  if (customBtn) {
    customBtn.addEventListener('click', function () {
      if (runningMeetingType) return;
      toggleCreateForm();
    });
  }

  if (startBtn) {
    startBtn.addEventListener('click', function () {
      handleCustomRun();
    });
  }

  if (participantGrid) {
    participantGrid.addEventListener('click', handleParticipantClick);
  }

  if (instructionsTextarea) {
    instructionsTextarea.addEventListener('input', function () {
      updateCreateFormValidation();
    });
  }

  listContainer.addEventListener('click', function (e) {
    // Start as Project button
    var actionStartBtn = e.target.closest('.meeting-detail__action-start');
    if (actionStartBtn && !actionStartBtn.disabled) {
      actionStartBtn.disabled = true;
      actionStartBtn.textContent = 'Creating...';

      var desc = actionStartBtn.getAttribute('data-action-desc');
      var owner = actionStartBtn.getAttribute('data-action-owner');
      var priority = actionStartBtn.getAttribute('data-action-priority');
      var meetingNum = actionStartBtn.getAttribute('data-meeting-number');
      var meetingType = actionStartBtn.getAttribute('data-meeting-type');

      // Truncate description to a short project name
      var name = desc.length > 60 ? desc.substring(0, 57) + '...' : desc;

      var typeLabel = 'Charter';
      if (meetingType === 'weekly') typeLabel = 'Weekly';
      else if (meetingType === 'custom') typeLabel = 'Custom';

      var brief = desc +
        '\n\nOwner: ' + owner +
        '\nPriority: ' + priority +
        '\nSource: ' + typeLabel +
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
          actionStartBtn.textContent = 'Created';
          actionStartBtn.classList.add('meeting-detail__action-start--created');
          document.dispatchEvent(new CustomEvent('projects:refresh'));
          showToast('Project created! View it in the Projects section above.');
          var projectsSection = document.getElementById('projects');
          if (projectsSection) {
            projectsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        })
        .catch(function () {
          actionStartBtn.disabled = false;
          actionStartBtn.textContent = 'Start as Project';
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

  // --- Cross-module: listen for interview completion to refresh list ---

  document.addEventListener('interview-complete', function () {
    detailCache = {};
    apiGet()
      .then(function (data) {
        meetings = data;
        var hasRunning = meetings.some(function (m) { return m.status === 'running'; });
        if (hasRunning) {
          runningMeetingType = 'running';
          notifyMeetingState();
          startPolling();
        } else {
          runningMeetingType = null;
          notifyMeetingState();
        }
        renderList();
        // Auto-expand the newest meeting (first in the list)
        if (meetings.length > 0) {
          expandCard(meetings[0].id);
        }
      })
      .catch(function () { /* ignore */ });
  });

  // --- Cross-module: listen for interview state to disable buttons ---

  document.addEventListener('interview:stateChange', function (e) {
    if (e.detail && e.detail.running) {
      updateButtons();
    } else {
      updateButtons();
    }
  });

  // --- Init ---

  // Render participant grid
  renderParticipantGrid();

  apiGet()
    .then(function (data) {
      meetings = data;

      // Check if any meeting is still running
      var hasRunning = meetings.some(function (m) { return m.status === 'running'; });
      if (hasRunning) {
        runningMeetingType = 'running';
        notifyMeetingState();
        startPolling();
      }

      renderList();
    })
    .catch(function () {
      listContainer.innerHTML =
        '<p class="meetings__error">Unable to load meetings.</p>';
    });

})();
