(function () {
  'use strict';

  var container = document.getElementById('tasks-list');
  if (!container) return;

  fetch('data/tasks.json')
    .then(function (response) {
      if (!response.ok) throw new Error('Failed to load tasks');
      return response.json();
    })
    .then(function (data) {
      var projects = data.projects;
      if (!projects || projects.length === 0) {
        container.innerHTML = '<p class="tasks__empty">No projects yet.</p>';
        return;
      }
      render(projects);
    })
    .catch(function () {
      container.innerHTML = '<p class="tasks__error">Unable to load task history.</p>';
    });

  function render(projects) {
    container.innerHTML = projects.map(renderCard).join('');

    container.addEventListener('click', function (e) {
      // Handle project card expand/collapse
      var header = e.target.closest('.project-card__header');
      if (header) {
        var card = header.closest('.project-card');
        var details = card.querySelector('.project-card__details');
        var isExpanded = header.getAttribute('aria-expanded') === 'true';

        // Collapse any currently expanded card first
        if (!isExpanded) {
          var expanded = container.querySelector('.project-card__header[aria-expanded="true"]');
          if (expanded && expanded !== header) {
            expanded.setAttribute('aria-expanded', 'false');
            expanded.closest('.project-card').querySelector('.project-card__details')
              .setAttribute('aria-hidden', 'true');
          }
        }

        header.setAttribute('aria-expanded', String(!isExpanded));
        details.setAttribute('aria-hidden', String(isExpanded));
        return;
      }

      // Handle task item expand/collapse
      var taskHeader = e.target.closest('.task-item__header');
      if (taskHeader) {
        var taskItem = taskHeader.closest('.task-item');
        var taskDetails = taskItem.querySelector('.task-item__details');
        if (!taskDetails) return;

        var isTaskExpanded = taskHeader.getAttribute('aria-expanded') === 'true';
        taskHeader.setAttribute('aria-expanded', String(!isTaskExpanded));
        taskDetails.setAttribute('aria-hidden', String(isTaskExpanded));
      }
    });
  }

  function renderCard(project) {
    var taskCount = project.tasks.length;
    var statusLabel = formatStatus(project.status);
    var tasksHTML = project.tasks.map(renderTaskItem).join('');

    return (
      '<article class="project-card" data-project="' + project.id + '">' +
        '<button class="project-card__header" aria-expanded="false">' +
          '<div class="project-card__summary">' +
            '<h3 class="project-card__name">' + project.name + '</h3>' +
            '<p class="project-card__desc">' + project.description + '</p>' +
          '</div>' +
          '<div class="project-card__meta">' +
            '<span class="project-card__badge" data-status="' + project.status + '">' + statusLabel + '</span>' +
            '<span class="project-card__date">' + project.completedDate + '</span>' +
            '<span class="project-card__count">' + taskCount + ' task' + (taskCount !== 1 ? 's' : '') + '</span>' +
          '</div>' +
          '<span class="project-card__chevron" aria-hidden="true"></span>' +
        '</button>' +
        '<div class="project-card__details" aria-hidden="true">' +
          '<div class="project-card__details-inner">' +
            tasksHTML +
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
    var initial = task.agent.charAt(0);
    var expandable = hasDetails(task);
    var detailsHTML = expandable ? renderTaskDetails(task) : '';
    var chevronHTML = expandable
      ? '<span class="task-item__chevron" aria-hidden="true"></span>'
      : '';

    var headerTag = expandable ? 'button' : 'div';
    var ariaAttrs = expandable ? ' aria-expanded="false"' : '';
    var expandableClass = expandable ? ' task-item--expandable' : '';

    return (
      '<div class="task-item' + expandableClass + '">' +
        '<' + headerTag + ' class="task-item__header"' + ariaAttrs + '>' +
          '<div class="task-item__avatar" aria-hidden="true">' + initial + '</div>' +
          '<div class="task-item__content">' +
            '<div class="task-item__agent-line">' +
              '<span class="task-item__agent">' + task.agent + '</span>' +
              '<span class="task-item__role">' + task.role + '</span>' +
            '</div>' +
            '<p class="task-item__title">' + task.title + '</p>' +
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
        return '<li>' + s + '</li>';
      }).join('');
      sections.push(
        '<div class="task-item__subtasks">' +
          '<ul>' + items + '</ul>' +
        '</div>'
      );
    }

    if (task.filesChanged && task.filesChanged.length > 0) {
      var pills = task.filesChanged.map(function (f) {
        return '<span class="task-item__file-pill">' + f + '</span>';
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
        return '<li>' + d + '</li>';
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

  function formatStatus(status) {
    switch (status) {
      case 'completed': return 'Completed';
      case 'in-progress': return 'In Progress';
      case 'planned': return 'Planned';
      case 'blocked': return 'Blocked';
      case 'skipped': return 'Skipped';
      default: return status;
    }
  }
})();
