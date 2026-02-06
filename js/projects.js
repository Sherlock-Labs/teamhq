(function () {
  'use strict';

  var API_BASE = '/api/projects';
  var TOAST_DURATION = 4000;

  var listContainer = document.getElementById('projects-list');
  var newBtn = document.querySelector('.projects__new-btn');

  // Modal elements
  var projectOverlay = document.getElementById('project-modal-overlay');
  var projectForm = document.getElementById('project-form');
  var modalTitle = document.getElementById('modal-title');
  var submitBtn = projectForm.querySelector('.modal__submit');
  var nameInput = document.getElementById('project-name');
  var descInput = document.getElementById('project-description');
  var statusSelect = document.getElementById('project-status');
  var nameError = nameInput.parentElement.querySelector('.modal__error');

  var deleteOverlay = document.getElementById('delete-modal-overlay');
  var deleteNameEl = document.getElementById('delete-project-name');
  var deleteBtn = deleteOverlay.querySelector('.modal__delete');

  // State
  var projects = [];
  var editingId = null;
  var deletingId = null;
  var triggerElement = null;

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
  }

  function renderCard(project) {
    var statusLabel = formatStatus(project.status);
    var dateStr = formatDate(project);

    return (
      '<article class="project-card" data-project-id="' + escapeAttr(project.id) + '">' +
        '<div class="project-card__header">' +
          '<div class="project-card__summary">' +
            '<h3 class="project-card__name">' + escapeHTML(project.name) + '</h3>' +
            '<p class="project-card__desc">' + escapeHTML(project.description || '') + '</p>' +
          '</div>' +
          '<div class="project-card__meta">' +
            '<span class="project-card__badge" data-status="' + escapeAttr(project.status) + '">' + statusLabel + '</span>' +
            '<span class="project-card__date">' + escapeHTML(dateStr) + '</span>' +
          '</div>' +
          '<div class="project-card__actions">' +
            '<button class="project-card__action-btn project-card__action-btn--edit" type="button" aria-label="Edit project" title="Edit">Edit</button>' +
            '<button class="project-card__action-btn project-card__action-btn--delete" type="button" aria-label="Delete project" title="Delete">Delete</button>' +
          '</div>' +
        '</div>' +
      '</article>'
    );
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
    var d = new Date(dateStr);
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return months[d.getMonth()] + ' ' + d.getFullYear();
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

  // --- Modal Management ---

  function openModal(overlay) {
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    trapFocus(overlay);
  }

  function closeModal(overlay) {
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (triggerElement) {
      triggerElement.focus();
      triggerElement = null;
    }
  }

  function openCreateModal() {
    editingId = null;
    modalTitle.textContent = 'New Project';
    submitBtn.textContent = 'Create Project';
    nameInput.value = '';
    descInput.value = '';
    statusSelect.value = 'planned';
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
    statusSelect.value = project.status;
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

    // Optimistic: add a temp card
    var tempProject = {
      id: 'temp-' + Date.now(),
      name: formData.name,
      description: formData.description,
      status: formData.status,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: null,
    };
    projects.unshift(tempProject);
    renderList();
    animateCardEnter(tempProject.id);
    closeModal(projectOverlay);
    releaseFocusTrap(projectOverlay);

    apiCreate(formData)
      .then(function (created) {
        // Replace temp with real
        var idx = findProjectIndex(tempProject.id);
        if (idx !== -1) {
          projects[idx] = created;
        }
        renderList();
      })
      .catch(function () {
        // Rollback
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

    // Save previous state for rollback
    var prev = {
      name: project.name,
      description: project.description,
      status: project.status,
    };

    // Optimistic update
    project.name = formData.name;
    project.description = formData.description;
    project.status = formData.status;
    renderList();
    closeModal(projectOverlay);
    releaseFocusTrap(projectOverlay);

    apiUpdate(editingId, formData)
      .then(function (updated) {
        var idx = findProjectIndex(editingId);
        if (idx !== -1) projects[idx] = updated;
        renderList();
      })
      .catch(function () {
        // Rollback
        project.name = prev.name;
        project.description = prev.description;
        project.status = prev.status;
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
    releaseFocusTrap(deleteOverlay);

    // Optimistic: remove with animation
    animateCardLeave(id, function () {
      projects.splice(idx, 1);
      renderList();
    });

    apiDelete(id)
      .catch(function () {
        // Rollback — re-insert
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

  // --- Event Handlers ---

  // New Project button
  newBtn.addEventListener('click', function () {
    triggerElement = newBtn;
    openCreateModal();
  });

  // Project card actions (delegated)
  listContainer.addEventListener('click', function (e) {
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

    var delBtn = e.target.closest('.project-card__action-btn--delete');
    if (delBtn) {
      var card = delBtn.closest('.project-card');
      var id = card.getAttribute('data-project-id');
      var project = findProject(id);
      if (project) {
        triggerElement = delBtn;
        openDeleteModal(project);
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

  // Modal close handlers
  function setupModalClose(overlay) {
    // Close button
    overlay.querySelector('.modal__close').addEventListener('click', function () {
      closeModal(overlay);
      releaseFocusTrap(overlay);
    });

    // Cancel button
    var cancelBtn = overlay.querySelector('.modal__cancel');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', function () {
        closeModal(overlay);
        releaseFocusTrap(overlay);
      });
    }

    // Overlay background click
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) {
        closeModal(overlay);
        releaseFocusTrap(overlay);
      }
    });
  }

  setupModalClose(projectOverlay);
  setupModalClose(deleteOverlay);

  // Escape key
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (projectOverlay.getAttribute('aria-hidden') === 'false') {
        closeModal(projectOverlay);
        releaseFocusTrap(projectOverlay);
      }
      if (deleteOverlay.getAttribute('aria-hidden') === 'false') {
        closeModal(deleteOverlay);
        releaseFocusTrap(deleteOverlay);
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
