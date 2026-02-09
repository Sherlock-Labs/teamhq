(function () {
  'use strict';

  var container = document.getElementById('portfolio-list');
  if (!container) return;

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
      if (!projects || projects.length === 0) {
        container.innerHTML = '<p class="portfolio__empty">No projects yet.</p>';
        return;
      }
      render(projects);
    })
    .catch(function () {
      container.innerHTML = '<p class="portfolio__error">Unable to load portfolio data.</p>';
    });

  // --- Utility functions ---

  function formatStatus(status) {
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

  function formatDate(dateStr) {
    if (!dateStr) return '';
    var MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var parts = dateStr.split('-');
    var monthIndex = parseInt(parts[1], 10) - 1;
    return MONTH_NAMES[monthIndex] + ' ' + parts[0];
  }

  function escapeHTML(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  // --- Aggregation helpers ---

  function computeStats(projects) {
    var totalProjects = projects.length;
    var completedProjects = 0;
    var agentsSet = {};
    var totalTasks = 0;
    var totalFiles = 0;
    var totalDecisions = 0;

    projects.forEach(function (p) {
      if (p.status === 'completed') completedProjects++;
      if (!p.tasks) return;
      p.tasks.forEach(function (t) {
        totalTasks++;
        var key = t.agent.toLowerCase();
        agentsSet[key] = true;
        if (t.filesChanged) totalFiles += t.filesChanged.length;
        if (t.decisions) totalDecisions += t.decisions.length;
      });
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

  function getProjectAgents(project) {
    var seen = {};
    var agents = [];
    if (!project.tasks) return agents;
    project.tasks.forEach(function (t) {
      var key = t.agent.toLowerCase();
      if (!seen[key]) {
        seen[key] = true;
        agents.push(key);
      }
    });
    return agents;
  }

  function getProjectTaskCount(project) {
    return project.tasks ? project.tasks.length : 0;
  }

  function getProjectFileCount(project) {
    var count = 0;
    if (!project.tasks) return count;
    project.tasks.forEach(function (t) {
      if (t.filesChanged) count += t.filesChanged.length;
    });
    return count;
  }

  function getProjectDecisionCount(project) {
    var count = 0;
    if (!project.tasks) return count;
    project.tasks.forEach(function (t) {
      if (t.decisions) count += t.decisions.length;
    });
    return count;
  }

  function getContributors(project) {
    var map = {};
    if (!project.tasks) return [];
    project.tasks.forEach(function (t) {
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

  function getAllDecisions(project) {
    var decisions = [];
    if (!project.tasks) return decisions;
    project.tasks.forEach(function (t) {
      if (t.decisions && t.decisions.length > 0) {
        t.decisions.forEach(function (d) {
          decisions.push({ agent: t.agent, text: d });
        });
      }
    });
    return decisions;
  }

  // --- Sort projects: in-progress first, completed (newest), planned last ---

  function sortProjects(projects) {
    var statusOrder = { 'in-progress': 0, 'completed': 1, 'planned': 2 };
    return projects.slice().sort(function (a, b) {
      var orderA = statusOrder[a.status] !== undefined ? statusOrder[a.status] : 3;
      var orderB = statusOrder[b.status] !== undefined ? statusOrder[b.status] : 3;
      if (orderA !== orderB) return orderA - orderB;
      // Within same status, sort by completedDate desc (or id desc for in-progress/planned)
      if (a.status === 'completed' && b.status === 'completed') {
        return (b.completedDate || '').localeCompare(a.completedDate || '');
      }
      return 0;
    });
  }

  // --- Render functions ---

  function render(projects) {
    var sorted = sortProjects(projects);
    var stats = computeStats(projects);

    // Render stats
    var statsContainer = document.getElementById('portfolio-stats');
    if (statsContainer) {
      statsContainer.innerHTML = renderStats(stats);
    }

    // Render project cards
    container.innerHTML = sorted.map(renderProjectCard).join('');

    // Attach delegated event listeners
    container.addEventListener('click', handleClick);
    container.addEventListener('keydown', handleKeydown);
  }

  function renderStats(stats) {
    var items = [
      { value: stats.totalProjects, label: 'Projects' },
      { value: stats.completedProjects, label: 'Completed' },
      { value: stats.uniqueAgents, label: 'Agents' },
      { value: stats.totalTasks, label: 'Tasks' },
      { value: stats.totalFiles, label: 'Files' },
      { value: stats.totalDecisions, label: 'Decisions' }
    ];

    return items.map(function (item) {
      return (
        '<div class="portfolio__stat">' +
          '<div class="portfolio__stat-value">' + item.value + '</div>' +
          '<div class="portfolio__stat-label">' + item.label + '</div>' +
        '</div>'
      );
    }).join('');
  }

  function renderProjectCard(project) {
    var agents = getProjectAgents(project);
    var taskCount = getProjectTaskCount(project);
    var fileCount = getProjectFileCount(project);
    var decisionCount = getProjectDecisionCount(project);
    var statusLabel = formatStatus(project.status);
    var dateText = project.status === 'completed' ? formatDate(project.completedDate) : '';

    // Agent avatars (max 5 shown)
    var avatarsHTML = '';
    var maxAvatars = 5;
    var shown = agents.slice(0, maxAvatars);
    var overflow = agents.length - maxAvatars;

    shown.forEach(function (name) {
      avatarsHTML += '<img class="portfolio-card__avatar" src="img/avatars/' + name + '.svg" alt="" width="24" height="24">';
    });

    if (overflow > 0) {
      avatarsHTML += '<span class="portfolio-card__avatar-overflow">+' + overflow + '</span>';
    }

    // Task items HTML
    var tasksHTML = '';
    if (project.tasks) {
      tasksHTML = project.tasks.map(renderTaskItem).join('');
    }

    // Contributors
    var contributors = getContributors(project);
    var contributorsHTML = renderContributors(contributors);

    // Key decisions rollup
    var allDecisions = getAllDecisions(project);
    var decisionsRollupHTML = renderDecisionsRollup(allDecisions);

    // Per-project metrics
    var metricsHTML = (
      '<div class="portfolio-card__metrics">' +
        '<div class="portfolio-card__metric">' +
          '<span class="portfolio-card__metric-value">' + taskCount + '</span>' +
          '<span class="portfolio-card__metric-label">tasks</span>' +
        '</div>' +
        '<div class="portfolio-card__metric">' +
          '<span class="portfolio-card__metric-value">' + fileCount + '</span>' +
          '<span class="portfolio-card__metric-label">files</span>' +
        '</div>' +
        '<div class="portfolio-card__metric">' +
          '<span class="portfolio-card__metric-value">' + decisionCount + '</span>' +
          '<span class="portfolio-card__metric-label">decisions</span>' +
        '</div>' +
      '</div>'
    );

    return (
      '<article class="portfolio-card" data-project="' + escapeHTML(project.id) + '">' +
        '<button class="portfolio-card__header" aria-expanded="false" type="button">' +
          '<div class="portfolio-card__info">' +
            '<div class="portfolio-card__name">' + escapeHTML(project.name) + '</div>' +
            '<p class="portfolio-card__desc">' + escapeHTML(project.description) + '</p>' +
          '</div>' +
          '<div class="portfolio-card__meta">' +
            '<div class="portfolio-card__avatars">' + avatarsHTML + '</div>' +
            '<span class="portfolio-card__badge" data-status="' + project.status + '">' + statusLabel + '</span>' +
            (dateText ? '<span class="portfolio-card__date">' + dateText + '</span>' : '') +
            '<span class="portfolio-card__chevron" aria-hidden="true"></span>' +
          '</div>' +
        '</button>' +
        '<div class="portfolio-card__details" aria-hidden="true">' +
          '<div class="portfolio-card__details-inner">' +
            metricsHTML +
            '<div class="portfolio-card__task-list">' + tasksHTML + '</div>' +
            contributorsHTML +
            decisionsRollupHTML +
          '</div>' +
        '</div>' +
      '</article>'
    );
  }

  function hasDetails(task) {
    return (task.subtasks && task.subtasks.length > 0) ||
           (task.filesChanged && task.filesChanged.length > 0) ||
           (task.decisions && task.decisions.length > 0);
  }

  function renderTaskItem(task) {
    var agentKey = task.agent.toLowerCase();
    var expandable = hasDetails(task);
    var detailsHTML = expandable ? renderTaskDetails(task) : '';
    var chevronHTML = expandable
      ? '<span class="task-item__chevron" aria-hidden="true"></span>'
      : '';

    var headerTag = expandable ? 'button' : 'div';
    var ariaAttrs = expandable ? ' aria-expanded="false" type="button"' : '';
    var expandableClass = expandable ? ' task-item--expandable' : '';

    return (
      '<div class="task-item' + expandableClass + '">' +
        '<' + headerTag + ' class="task-item__header"' + ariaAttrs + '>' +
          '<div class="task-item__avatar" aria-hidden="true">' +
            '<img src="img/avatars/' + agentKey + '.svg" alt="" width="32" height="32" style="width:100%;height:100%;border-radius:50%;">' +
          '</div>' +
          '<div class="task-item__content">' +
            '<div class="task-item__agent-line">' +
              '<span class="task-item__agent">' + escapeHTML(task.agent) + '</span>' +
              '<span class="task-item__role">' + escapeHTML(task.role) + '</span>' +
            '</div>' +
            '<p class="task-item__title">' + escapeHTML(task.title) + '</p>' +
          '</div>' +
          '<span class="task-item__status" data-status="' + task.status + '" aria-label="' + formatStatus(task.status) + '"></span>' +
          chevronHTML +
        '</' + headerTag + '>' +
        detailsHTML +
      '</div>'
    );
  }

  function renderTaskDetails(task) {
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
      var items = task.decisions.map(function (d) {
        return '<li>' + escapeHTML(d) + '</li>';
      }).join('');
      sections.push(
        '<div class="task-item__decisions">' +
          '<span class="task-item__detail-label">Decisions</span>' +
          '<ul>' + items + '</ul>' +
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

  function renderContributors(contributors) {
    if (contributors.length === 0) return '';

    var items = contributors.map(function (c) {
      var key = c.name.toLowerCase();
      var summary = c.subtasks + ' subtask' + (c.subtasks !== 1 ? 's' : '') +
                    ', ' + c.files + ' file' + (c.files !== 1 ? 's' : '');
      return (
        '<div class="portfolio-card__contributor">' +
          '<img class="portfolio-card__contributor-avatar" src="img/avatars/' + key + '.svg" alt="" width="20" height="20">' +
          '<span class="portfolio-card__contributor-name">' + escapeHTML(c.name) + '</span>' +
          '<span class="portfolio-card__contributor-summary">' + summary + '</span>' +
        '</div>'
      );
    }).join('');

    return (
      '<div class="portfolio-card__contributors">' +
        '<span class="task-item__detail-label">Contributors</span>' +
        '<div class="portfolio-card__contributors-list">' + items + '</div>' +
      '</div>'
    );
  }

  function renderDecisionsRollup(decisions) {
    if (decisions.length === 0) return '';

    var items = decisions.map(function (d) {
      return (
        '<li>' +
          '<strong class="portfolio-card__decision-agent">' + escapeHTML(d.agent) + '</strong> — ' +
          escapeHTML(d.text) +
        '</li>'
      );
    }).join('');

    return (
      '<div class="portfolio-card__decisions-rollup">' +
        '<button class="portfolio-card__decisions-toggle" type="button" aria-expanded="false">' +
          '<span class="portfolio-card__decisions-toggle-text">Key Decisions (' + decisions.length + ')</span>' +
          '<span class="portfolio-card__decisions-toggle-chevron" aria-hidden="true"></span>' +
        '</button>' +
        '<div class="portfolio-card__decisions-content" aria-hidden="true">' +
          '<div class="portfolio-card__decisions-content-inner">' +
            '<ul class="portfolio-card__decisions-list">' + items + '</ul>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  // --- Event handling ---

  function handleClick(e) {
    // Handle decisions toggle
    var decisionsToggle = e.target.closest('.portfolio-card__decisions-toggle');
    if (decisionsToggle) {
      var isExpanded = decisionsToggle.getAttribute('aria-expanded') === 'true';
      decisionsToggle.setAttribute('aria-expanded', String(!isExpanded));
      var content = decisionsToggle.nextElementSibling;
      if (content) {
        content.setAttribute('aria-hidden', String(isExpanded));
      }
      return;
    }

    // Handle task item expand/collapse (nested — independent)
    var taskHeader = e.target.closest('.task-item__header');
    if (taskHeader && taskHeader.hasAttribute('aria-expanded')) {
      var taskItem = taskHeader.closest('.task-item');
      var taskDetails = taskItem.querySelector('.task-item__details');
      if (!taskDetails) return;

      var isTaskExpanded = taskHeader.getAttribute('aria-expanded') === 'true';
      taskHeader.setAttribute('aria-expanded', String(!isTaskExpanded));
      taskDetails.setAttribute('aria-hidden', String(isTaskExpanded));
      return;
    }

    // Handle project card expand/collapse (one-at-a-time)
    var header = e.target.closest('.portfolio-card__header');
    if (header) {
      var card = header.closest('.portfolio-card');
      var details = card.querySelector('.portfolio-card__details');
      var isExpanded = header.getAttribute('aria-expanded') === 'true';

      // Collapse any currently expanded card first (one-at-a-time)
      if (!isExpanded) {
        var expanded = container.querySelector('.portfolio-card__header[aria-expanded="true"]');
        if (expanded && expanded !== header) {
          expanded.setAttribute('aria-expanded', 'false');
          expanded.closest('.portfolio-card').querySelector('.portfolio-card__details')
            .setAttribute('aria-hidden', 'true');
        }
      }

      header.setAttribute('aria-expanded', String(!isExpanded));
      details.setAttribute('aria-hidden', String(isExpanded));
      return;
    }
  }

  function handleKeydown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      var button = e.target.closest('button');
      if (button && (
        button.classList.contains('portfolio-card__header') ||
        button.classList.contains('task-item__header') ||
        button.classList.contains('portfolio-card__decisions-toggle')
      )) {
        e.preventDefault();
        button.click();
      }
    }
  }

})();
