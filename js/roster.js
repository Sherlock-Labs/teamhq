(function () {
  'use strict';

  var grid = document.querySelector('.roster__grid');
  var recentOutput = document.getElementById('recent-output');
  if (!grid) return;

  var CELL_SIZE = 11;
  var CELL_GAP = 2;
  var CELL_STEP = CELL_SIZE + CELL_GAP; // 13px per column
  var MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  function agentKey(name) {
    return name.toLowerCase();
  }

  // Generate array of days from Jan 2026 to today
  function generateDays() {
    // Start from the Sunday on or before Jan 1, 2026
    var start = new Date(2026, 0, 1);
    while (start.getDay() !== 0) {
      start.setDate(start.getDate() - 1);
    }

    var days = [];
    var now = new Date();
    now.setHours(23, 59, 59);
    var current = new Date(start);

    while (current <= now) {
      var y = current.getFullYear();
      var m = current.getMonth();
      var monthKey = y + '-' + String(m + 1).padStart(2, '0');
      days.push({
        date: new Date(current),
        monthKey: monthKey,
        dayOfWeek: current.getDay()
      });
      current.setDate(current.getDate() + 1);
    }

    // Pad to complete the final week (fill remaining days to Saturday)
    while (days.length % 7 !== 0) {
      days.push({ date: null, monthKey: null, dayOfWeek: null });
    }

    return days;
  }

  // Build agent activity index from tasks.json
  function buildActivityIndex(projects) {
    var index = {};

    projects.forEach(function (project) {
      if (!project.tasks) return;
      project.tasks.forEach(function (task) {
        var name = agentKey(task.agent);
        if (!index[name]) {
          index[name] = { months: {}, projects: [] };
        }

        var month = project.completedDate || new Date().toISOString().slice(0, 7);
        var subtaskCount = (task.subtasks && task.subtasks.length) || 0;
        var filesCount = (task.filesChanged && task.filesChanged.length) || 0;
        var decisionsCount = (task.decisions && task.decisions.length) || 0;
        var score = subtaskCount + filesCount + decisionsCount;

        if (!index[name].months[month]) {
          index[name].months[month] = 0;
        }
        index[name].months[month] += score;

        index[name].projects.push({
          projectName: project.name,
          projectId: project.id,
          task: task.title,
          role: task.role,
          subtaskCount: subtaskCount,
          filesCount: filesCount,
          month: month
        });
      });
    });

    return index;
  }

  // Render GitHub-style daily activity grid (7 rows = days of week, columns = weeks)
  function renderActivityGrid(agentName, agentData, days) {
    var totalWeeks = days.length / 7;

    // Build cells — grid fills column-first (Sun row 1, Mon row 2, ... Sat row 7)
    var cells = days.map(function (d) {
      if (!d.date) {
        return '<div class="activity-grid__cell activity-grid__cell--pad"></div>';
      }

      var score = (agentData.months[d.monthKey]) || 0;
      var opacity;
      if (score === 0) opacity = '0.08';
      else if (score <= 3) opacity = '0.3';
      else if (score <= 7) opacity = '0.6';
      else opacity = '1';

      var bg = 'rgba(var(--color-agent-' + agentName + '-rgb, var(--color-agent-default-rgb)), ' + opacity + ')';
      var dateStr = MONTH_NAMES[d.date.getMonth()] + ' ' + d.date.getDate() + ', ' + d.date.getFullYear();

      return '<div class="activity-grid__cell" style="background:' + bg + '" title="' + dateStr + '"></div>';
    }).join('');

    // Build month labels positioned at the correct column
    var monthLabels = [];
    var seenMonths = {};
    for (var i = 0; i < days.length; i += 7) {
      // For each week column, check the first real day to see if it starts a new month
      for (var r = 0; r < 7; r++) {
        var d = days[i + r];
        if (d && d.date) {
          var ym = d.monthKey;
          if (!seenMonths[ym]) {
            seenMonths[ym] = true;
            var colIndex = i / 7;
            var yr = d.date.getFullYear();
            var label = MONTH_NAMES[d.date.getMonth()];
            // Show year on January for disambiguation
            if (d.date.getMonth() === 0) {
              label += ' ' + yr;
            }
            monthLabels.push({ label: label, left: colIndex * CELL_STEP });
          }
          break;
        }
      }
    }

    var labelsHTML = monthLabels.map(function (ml) {
      return '<span class="activity-grid__month" style="left:' + ml.left + 'px">' + ml.label + '</span>';
    }).join('');

    var gridWidth = totalWeeks * CELL_STEP - CELL_GAP;

    return (
      '<div class="activity-grid">' +
        '<div class="activity-grid__months" style="width:' + gridWidth + 'px">' + labelsHTML + '</div>' +
        '<div class="activity-grid__cells" style="grid-auto-columns:' + CELL_SIZE + 'px;width:' + gridWidth + 'px">' + cells + '</div>' +
      '</div>'
    );
  }

  // Render project contribution list
  function renderProjectList(agentData) {
    if (!agentData.projects.length) {
      return '<p class="agent-profile__empty">No project contributions yet.</p>';
    }

    var rows = agentData.projects.map(function (p) {
      return (
        '<div class="agent-profile__project-row">' +
          '<span class="agent-profile__project-name">' + p.projectName + '</span>' +
          '<span class="agent-profile__project-role">' + p.role + '</span>' +
          '<span class="agent-profile__project-stats">' +
            p.subtaskCount + ' subtask' + (p.subtaskCount !== 1 ? 's' : '') +
            ' · ' + p.filesCount + ' file' + (p.filesCount !== 1 ? 's' : '') +
          '</span>' +
        '</div>'
      );
    }).join('');

    return (
      '<div class="agent-profile__projects">' +
        '<h4 class="agent-profile__section-title">Project Contributions</h4>' +
        rows +
      '</div>'
    );
  }

  // Render the inline profile panel
  function renderProfilePanel(agentName, agentData, days) {
    return (
      '<div class="agent-profile" aria-hidden="false">' +
        '<div class="agent-profile__inner">' +
          '<h4 class="agent-profile__section-title">Activity</h4>' +
          renderActivityGrid(agentName, agentData, days) +
          renderProjectList(agentData) +
        '</div>' +
      '</div>'
    );
  }

  // Render recent output section
  function renderRecentOutput(projects) {
    if (!recentOutput) return;

    var completed = projects.filter(function (p) { return p.status === 'completed'; });
    var recent = completed.slice(-3).reverse();

    if (!recent.length) return;

    var cards = recent.map(function (project) {
      var agents = [];
      var totalFiles = 0;
      var totalDecisions = 0;

      project.tasks.forEach(function (task) {
        if (agents.indexOf(task.agent) === -1) agents.push(task.agent);
        totalFiles += (task.filesChanged && task.filesChanged.length) || 0;
        totalDecisions += (task.decisions && task.decisions.length) || 0;
      });

      return (
        '<article class="recent-output__card">' +
          '<div class="recent-output__header">' +
            '<h4 class="recent-output__name">' + project.name + '</h4>' +
            '<span class="recent-output__date">' + formatDate(project.completedDate) + '</span>' +
          '</div>' +
          '<p class="recent-output__stats">' +
            agents.length + ' agent' + (agents.length !== 1 ? 's' : '') +
            ' · ' + totalFiles + ' file' + (totalFiles !== 1 ? 's' : '') +
            ' · ' + totalDecisions + ' decision' + (totalDecisions !== 1 ? 's' : '') +
          '</p>' +
          '<p class="recent-output__agents">' + agents.join(', ') + '</p>' +
        '</article>'
      );
    }).join('');

    recentOutput.innerHTML = (
      '<h3 class="recent-output__title">Recent Output</h3>' +
      '<div class="recent-output__grid">' + cards + '</div>'
    );
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    var parts = dateStr.split('-');
    var monthIndex = parseInt(parts[1], 10) - 1;
    return MONTH_NAMES[monthIndex] + ' ' + parts[0];
  }

  // Load data and initialize
  fetch('data/tasks/index.json')
    .then(function (response) {
      if (!response.ok) throw new Error('Failed to load task index');
      return response.json();
    })
    .then(function (ids) {
      return Promise.all(ids.map(function (id) {
        return fetch('data/tasks/' + id + '.json').then(function (r) { return r.json(); });
      }));
    })
    .then(function (projects) {
      projects = projects || [];
      var activityIndex = buildActivityIndex(projects);
      var days = generateDays();

      renderRecentOutput(projects);

      var expandedLi = null;
      var expandedPanel = null;

      grid.addEventListener('click', function (e) {
        var card = e.target.closest('.agent-card');
        if (!card) return;

        var li = card.closest('li[data-agent]');
        if (!li) return;

        var agentName = li.getAttribute('data-agent');

        // Collapse currently expanded profile
        if (expandedPanel) {
          expandedPanel.parentNode.removeChild(expandedPanel);
          expandedLi.querySelector('.agent-card').setAttribute('aria-expanded', 'false');
          if (expandedLi === li) {
            expandedPanel = null;
            expandedLi = null;
            return;
          }
          expandedPanel = null;
          expandedLi = null;
        }

        // Expand new profile
        var agentData = activityIndex[agentName] || { months: {}, projects: [] };
        var panelHTML = renderProfilePanel(agentName, agentData, days);

        var wrapper = document.createElement('li');
        wrapper.className = 'agent-profile__wrapper';
        wrapper.setAttribute('role', 'presentation');
        wrapper.innerHTML = panelHTML;

        // Find last li in the same visual grid row
        var allItems = Array.prototype.slice.call(grid.querySelectorAll(':scope > li[data-agent]'));
        var liRect = li.getBoundingClientRect();

        var lastInRow = li;
        for (var i = allItems.indexOf(li) + 1; i < allItems.length; i++) {
          var itemRect = allItems[i].getBoundingClientRect();
          if (Math.abs(itemRect.top - liRect.top) < 5) {
            lastInRow = allItems[i];
          } else {
            break;
          }
        }

        if (lastInRow.nextSibling) {
          grid.insertBefore(wrapper, lastInRow.nextSibling);
        } else {
          grid.appendChild(wrapper);
        }

        card.setAttribute('aria-expanded', 'true');
        expandedLi = li;
        expandedPanel = wrapper;

        requestAnimationFrame(function () {
          wrapper.classList.add('agent-profile__wrapper--open');
        });
      });

      grid.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          var card = e.target.closest('.agent-card');
          if (card) {
            e.preventDefault();
            card.click();
          }
        }
      });
    })
    .catch(function () {
      // Silently fail — roster still shows, just no activity data
    });
})();
