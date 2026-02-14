/**
 * BugReporter — Floating bug report widget for TeamHQ.
 *
 * Self-contained vanilla JS class. Creates its own DOM inside
 * #bug-reporter-root. Manages screenshot capture (html2canvas, lazy-loaded),
 * voice recording (MediaRecorder + ElevenLabs Scribe v2 Realtime WebSocket
 * for live transcription), and bug submission (POST /api/bug-reports).
 *
 * State machine:
 *   CLOSED -> CAPTURING -> READY -> RECORDING -> READY -> SUBMITTING -> SUCCESS -> CLOSED
 *
 * Note: Ctrl+Shift+B is Chrome's bookmarks shortcut on Windows. Acceptable
 * for an internal tool (CEO uses Mac). Documented for awareness.
 */
(function () {
  'use strict';

  // --- Constants ---

  var API_BASE = '';
  var SCRIBE_TOKEN_URL = '/api/scribe-token';
  var BUG_REPORT_URL = '/api/bug-reports';
  var HTML_TO_IMAGE_CDN = 'https://cdn.jsdelivr.net/npm/html-to-image@1.11.11/dist/html-to-image.js';
  var MAX_RECORD_SECONDS = 30;
  var WARNING_SECONDS = 25;
  var TOAST_DURATION_MS = 3000;
  var DEFAULT_PROJECT_SLUG = 'bugs';

  // --- SVG Icons (inline, no external deps) ---

  var ICON_BUG = '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
    '<ellipse cx="10" cy="12" rx="4" ry="5"/>' +
    '<circle cx="10" cy="6" r="2"/>' +
    '<path d="M8.5 4.5L6 2"/>' +
    '<path d="M11.5 4.5L14 2"/>' +
    '<path d="M6 10L3 8.5"/>' +
    '<path d="M6 12.5L3 13"/>' +
    '<path d="M6 15L3.5 17"/>' +
    '<path d="M14 10L17 8.5"/>' +
    '<path d="M14 12.5L17 13"/>' +
    '<path d="M14 15L16.5 17"/>' +
    '</svg>';

  var ICON_X = '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M5 5L15 15"/>' +
    '<path d="M15 5L5 15"/>' +
    '</svg>';

  var ICON_MIC = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
    '<rect x="5" y="1" width="6" height="9" rx="3"/>' +
    '<path d="M3 7v1a5 5 0 0010 0V7"/>' +
    '<path d="M8 13v2"/>' +
    '</svg>';

  var ICON_STOP = '<svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">' +
    '<rect x="1" y="1" width="10" height="10" rx="1"/>' +
    '</svg>';

  var ICON_EXPAND = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M9 1h4v4"/>' +
    '<path d="M5 13H1V9"/>' +
    '<path d="M13 1L8.5 5.5"/>' +
    '<path d="M1 13l4.5-4.5"/>' +
    '</svg>';

  var ICON_CHECK = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M3 8.5l3.5 3.5L13 4"/>' +
    '</svg>';

  var ICON_ALERT = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
    '<circle cx="7" cy="7" r="6"/>' +
    '<path d="M7 4v3"/>' +
    '<circle cx="7" cy="10" r="0.5" fill="currentColor"/>' +
    '</svg>';

  var ICON_WARNING = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M7.134 1.5a1 1 0 011.732 0l5.856 10.133A1 1 0 0113.856 13H2.144a1 1 0 01-.866-1.367L7.134 1.5z"/>' +
    '<path d="M8 5.5V8"/>' +
    '<circle cx="8" cy="10.5" r="0.5" fill="currentColor"/>' +
    '</svg>';

  // --- Utility Functions ---

  function getPageName() {
    var path = window.location.pathname;
    var page = path.split('/').pop();
    if (!page) return 'unknown';
    return page.replace('.html', '');
  }

  function formatTime(seconds) {
    var m = Math.floor(seconds / 60);
    var s = seconds % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        if (key === 'className') {
          node.className = attrs[key];
        } else if (key === 'innerHTML') {
          node.innerHTML = attrs[key];
        } else if (key === 'textContent') {
          node.textContent = attrs[key];
        } else if (key.startsWith('on') && typeof attrs[key] === 'function') {
          node.addEventListener(key.slice(2).toLowerCase(), attrs[key]);
        } else {
          node.setAttribute(key, attrs[key]);
        }
      });
    }
    if (children) {
      children.forEach(function (child) {
        if (typeof child === 'string') {
          node.appendChild(document.createTextNode(child));
        } else if (child) {
          node.appendChild(child);
        }
      });
    }
    return node;
  }

  // --- html-to-image Lazy Loader ---

  var _htmlToImagePromise = null;

  function loadHtmlToImage() {
    if (window.htmlToImage) return Promise.resolve(window.htmlToImage);
    if (_htmlToImagePromise) return _htmlToImagePromise;

    _htmlToImagePromise = new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = HTML_TO_IMAGE_CDN;
      script.onload = function () { resolve(window.htmlToImage); };
      script.onerror = function () { reject(new Error('Failed to load html-to-image')); };
      document.head.appendChild(script);
    });
    return _htmlToImagePromise;
  }

  // --- BugReporter Class ---

  function BugReporter(root) {
    this.root = root;
    this.state = 'CLOSED'; // CLOSED, CAPTURING, READY, RECORDING, SUBMITTING, SUCCESS
    this.screenshotDataUrl = null;
    this.committedText = '';
    this.mediaStream = null;
    this._audioContext = null;
    this._audioProcessor = null;
    this.scribeWs = null;
    this.recordTimer = null;
    this.recordSeconds = 0;
    this.hasRecorded = false;
    this.micDenied = false;
    this.mediaRecorderSupported = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && (window.AudioContext || window.webkitAudioContext));

    // Build DOM
    this._buildDOM();
    this._attachGlobalListeners();
  }

  // --- DOM Construction ---

  BugReporter.prototype._buildDOM = function () {
    // Floating button
    this.btnEl = el('button', {
      className: 'bug-btn',
      'aria-label': 'Report a bug',
      'aria-expanded': 'false',
      'aria-controls': 'bug-panel',
      'aria-keyshortcuts': 'Meta+Shift+B'
    });

    this.btnIconEl = el('span', { className: 'bug-btn__icon', innerHTML: ICON_BUG, 'aria-hidden': 'true' });
    this.btnEl.appendChild(this.btnIconEl);

    // Tooltip
    var tooltipShortcut = el('span', { className: 'bug-btn__tooltip-shortcut' });
    var isMac = navigator.platform && navigator.platform.indexOf('Mac') > -1;
    tooltipShortcut.textContent = isMac ? 'Cmd+Shift+B' : 'Ctrl+Shift+B';
    this.tooltipEl = el('span', { className: 'bug-btn__tooltip', 'aria-hidden': 'true' }, [
      'Report a bug \u00b7 ',
      tooltipShortcut
    ]);
    this.btnEl.appendChild(this.tooltipEl);

    // Panel
    this.panelEl = el('div', {
      id: 'bug-panel',
      className: 'bug-panel',
      role: 'dialog',
      'aria-label': 'Bug reporter',
      'aria-modal': 'false'
    });

    // Status region for screen reader announcements
    this.statusEl = el('div', { className: 'bug-sr-only', 'aria-live': 'polite', id: 'bug-status' });

    // Panel header
    this.headerEl = el('div', { className: 'bug-panel__header' });
    this.titleEl = el('h3', { className: 'bug-panel__title', textContent: 'Report a bug' });
    this.pageContextEl = el('span', { className: 'bug-panel__page-context' });
    this.pageContextEl.textContent = 'on ' + getPageName().charAt(0).toUpperCase() + getPageName().slice(1);
    this.headerEl.appendChild(this.titleEl);
    this.headerEl.appendChild(this.pageContextEl);

    // Screenshot section
    this.screenshotSection = el('div', { className: 'bug-panel__screenshot' });
    this.screenshotThumb = el('div', {
      className: 'bug-panel__screenshot-thumb bug-panel__screenshot-thumb--loading',
      role: 'button',
      tabindex: '0',
      'aria-label': 'Enlarge screenshot preview'
    });

    // Expand icon overlay
    this.expandIcon = el('span', { className: 'bug-panel__screenshot-expand', innerHTML: ICON_EXPAND, 'aria-hidden': 'true' });
    this.screenshotThumb.appendChild(this.expandIcon);

    this.screenshotImg = el('img', { alt: 'Page screenshot', style: 'display:none;' });
    this.screenshotThumb.appendChild(this.screenshotImg);

    this.screenshotSection.appendChild(this.screenshotThumb);

    // Screenshot actions
    this.screenshotActions = el('div', { className: 'bug-panel__screenshot-actions' });
    this.retakeBtn = el('button', { className: 'bug-panel__retake-btn', type: 'button', textContent: 'Retake' });
    this.screenshotActions.appendChild(this.retakeBtn);
    this.screenshotSection.appendChild(this.screenshotActions);

    // Recording section
    this.recordingSection = el('div', { className: 'bug-panel__recording' });
    this._buildRecordingIdle();

    // Description section
    this.descriptionSection = el('div', { className: 'bug-panel__description' });
    this.textareaLabel = el('label', {
      className: 'bug-panel__textarea-label',
      for: 'bug-textarea'
    });
    this.textareaLabelBase = 'Description';
    this.textareaLabel.textContent = this.textareaLabelBase;

    this.textareaEl = el('textarea', {
      className: 'bug-panel__textarea',
      id: 'bug-textarea',
      placeholder: 'Bug description will appear here during recording, or type manually',
      rows: '4'
    });

    this.textareaActions = el('div', { className: 'bug-panel__textarea-actions', style: 'display:none;' });
    this.rerecordBtn = el('button', { className: 'bug-panel__rerecord', type: 'button', textContent: 'Re-record' });
    this.textareaActions.appendChild(this.rerecordBtn);

    this.descriptionSection.appendChild(this.textareaLabel);
    this.descriptionSection.appendChild(this.textareaEl);
    this.descriptionSection.appendChild(this.textareaActions);

    // Footer
    this.footerEl = el('div', { className: 'bug-panel__footer' });
    this.errorEl = el('div', { className: 'bug-panel__error', style: 'display:none;', role: 'alert' });
    this.errorEl.innerHTML = ICON_ALERT + ' <span>Failed to file bug. Try again.</span>';

    this.submitBtn = el('button', {
      className: 'bug-panel__submit',
      type: 'button',
      disabled: 'true'
    });
    this.submitBtn.textContent = 'File bug';

    this.footerEl.appendChild(this.errorEl);
    this.footerEl.appendChild(this.submitBtn);

    // Assemble panel
    this.panelEl.appendChild(this.statusEl);
    this.panelEl.appendChild(this.headerEl);
    this.panelEl.appendChild(this.screenshotSection);
    if (this.mediaRecorderSupported) {
      this.panelEl.appendChild(this.recordingSection);
    }
    this.panelEl.appendChild(this.descriptionSection);
    this.panelEl.appendChild(this.footerEl);

    // If MediaRecorder is not supported, update textarea placeholder
    if (!this.mediaRecorderSupported) {
      this.textareaEl.placeholder = 'Describe the bug...';
    }

    // Toast (separate from panel)
    this.toastEl = el('div', { className: 'bug-toast', role: 'status', 'aria-live': 'polite' });
    this.toastEl.innerHTML = '<span class="bug-toast__icon">' + ICON_CHECK + '</span> Bug filed!';

    // Screenshot preview overlay
    this.previewOverlay = el('div', {
      className: 'bug-preview-overlay',
      role: 'dialog',
      'aria-label': 'Screenshot preview',
      'aria-modal': 'true'
    });
    this.previewCloseBtn = el('button', {
      className: 'bug-preview-overlay__close bug-sr-only',
      type: 'button',
      tabIndex: -1,
      textContent: 'Close preview'
    });
    this.previewImg = el('img', { alt: 'Screenshot preview (full size)' });
    this.previewOverlay.appendChild(this.previewCloseBtn);
    this.previewOverlay.appendChild(this.previewImg);

    // Append to root
    this.root.appendChild(this.btnEl);
    this.root.appendChild(this.panelEl);
    this.root.appendChild(this.toastEl);
    this.root.appendChild(this.previewOverlay);

    // Attach DOM event listeners
    this._attachDOMListeners();
  };

  BugReporter.prototype._buildRecordingIdle = function () {
    this.recordingSection.innerHTML = '';

    this.recordBtn = el('button', {
      className: 'bug-panel__record-btn',
      type: 'button',
      'aria-describedby': 'bug-record-hint'
    });
    this.recordBtn.innerHTML = ICON_MIC + ' Record voice note';

    this.recordHint = el('p', { className: 'bug-panel__record-hint', id: 'bug-record-hint', textContent: 'or type your description below' });

    this.recordingSection.appendChild(this.recordBtn);
    this.recordingSection.appendChild(this.recordHint);

    // Re-attach record button listener
    this.recordBtn.addEventListener('click', this._onRecordClick.bind(this));
  };

  BugReporter.prototype._buildRecordingActive = function () {
    this.recordingSection.innerHTML = '';

    var strip = el('div', { className: 'bug-panel__recording-active' });

    this.recDot = el('span', { className: 'bug-panel__rec-dot', 'aria-hidden': 'true' });
    this.recTimerEl = el('span', { className: 'bug-panel__rec-timer', textContent: '0:00' });

    // Waveform
    var waveform = el('div', { className: 'bug-panel__waveform', 'aria-hidden': 'true' });
    for (var i = 0; i < 5; i++) {
      waveform.appendChild(el('span', { className: 'bug-panel__waveform-bar' }));
    }

    this.stopBtn = el('button', {
      className: 'bug-panel__stop-btn',
      type: 'button',
      'aria-label': 'Stop recording'
    });
    this.stopBtn.innerHTML = ICON_STOP;

    strip.appendChild(this.recDot);
    strip.appendChild(this.recTimerEl);
    strip.appendChild(waveform);
    strip.appendChild(this.stopBtn);

    this.recordingSection.appendChild(strip);

    // Attach stop listener
    this.stopBtn.addEventListener('click', this._onStopClick.bind(this));
  };

  // --- Event Binding ---

  BugReporter.prototype._attachDOMListeners = function () {
    var self = this;

    this.btnEl.addEventListener('click', function () {
      self.toggle();
    });

    this.screenshotThumb.addEventListener('click', function () {
      if (self.screenshotDataUrl) {
        self._showPreview();
      }
    });

    this.screenshotThumb.addEventListener('keydown', function (e) {
      if ((e.key === 'Enter' || e.key === ' ') && self.screenshotDataUrl) {
        e.preventDefault();
        self._showPreview();
      }
    });

    this.retakeBtn.addEventListener('click', function () {
      self._captureScreenshot();
    });

    this.rerecordBtn.addEventListener('click', function () {
      self._rerecord();
    });

    this.submitBtn.addEventListener('click', function () {
      self._submit();
    });

    this.previewOverlay.addEventListener('click', function (e) {
      // Close on backdrop click (not on the image itself)
      if (e.target === self.previewOverlay || e.target === self.previewCloseBtn) {
        self._hidePreview();
      }
    });

    this.previewCloseBtn.addEventListener('click', function () {
      self._hidePreview();
    });

    // Keep submit state in sync with textarea changes
    this.textareaEl.addEventListener('input', function () {
      self._updateSubmitState();
    });
  };

  BugReporter.prototype._attachGlobalListeners = function () {
    var self = this;

    // Focus trap for the panel (Tab cycles within panel + close button)
    document.addEventListener('keydown', function (e) {
      if (self.state !== 'CLOSED' && !self.previewOverlay.classList.contains('bug-preview-overlay--visible')) {
        self._handlePanelKeydown(e);
      }
    });

    // Keyboard shortcut: Cmd/Ctrl + Shift + B and Escape handling
    document.addEventListener('keydown', function (e) {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'b' || e.key === 'B')) {
        e.preventDefault();
        self.toggle();
        return;
      }

      // Escape: close preview first, then panel (not both at once)
      if (e.key === 'Escape') {
        if (self.previewOverlay.classList.contains('bug-preview-overlay--visible')) {
          e.preventDefault();
          self._hidePreview();
          return;
        }
        if (self.state !== 'CLOSED') {
          self.close();
        }
      }
    });
  };

  // --- State Machine ---

  BugReporter.prototype.toggle = function () {
    if (this.state === 'CLOSED') {
      this.open();
    } else {
      this.close();
    }
  };

  BugReporter.prototype.open = function () {
    if (this.state !== 'CLOSED') return;

    this.state = 'CAPTURING';
    this._resetPanel();

    // Update button state
    this.btnEl.classList.add('bug-btn--open');
    this.btnEl.setAttribute('aria-expanded', 'true');
    this.btnEl.setAttribute('aria-label', 'Close bug reporter');
    this.btnIconEl.innerHTML = ICON_X;

    // Show panel
    this.panelEl.classList.remove('bug-panel--closing');
    this.panelEl.classList.add('bug-panel--visible');

    // Focus the record button (primary action) or textarea if no MediaRecorder
    var self = this;
    setTimeout(function () {
      if (self.mediaRecorderSupported && self.recordBtn) {
        self.recordBtn.focus();
      } else {
        self.textareaEl.focus();
      }
    }, 200);

    // Auto-capture screenshot
    this._captureScreenshot();
  };

  BugReporter.prototype.close = function () {
    if (this.state === 'CLOSED') return;

    // Stop any ongoing recording
    this._stopRecordingCleanup();

    // Animate out
    this.panelEl.classList.remove('bug-panel--visible');
    this.panelEl.classList.add('bug-panel--closing');

    // Update button state
    this.btnEl.classList.remove('bug-btn--open');
    this.btnEl.setAttribute('aria-expanded', 'false');
    this.btnEl.setAttribute('aria-label', 'Report a bug');
    this.btnIconEl.innerHTML = ICON_BUG;

    this.state = 'CLOSED';

    // Return focus to button
    this.btnEl.focus();

    // Remove closing class after animation
    var self = this;
    setTimeout(function () {
      self.panelEl.classList.remove('bug-panel--closing');
    }, 150);
  };

  BugReporter.prototype._resetPanel = function () {
    this.screenshotDataUrl = null;
    this.committedText = '';
    this.hasRecorded = false;
    this.micDenied = false;
    this.textareaEl.value = '';
    this.textareaEl.classList.remove('bug-panel__textarea--error');
    this.textareaLabel.textContent = this.textareaLabelBase;
    this.textareaLabel.classList.remove('bug-panel__textarea-label-listening');
    this.textareaActions.style.display = 'none';
    this.errorEl.style.display = 'none';
    this.submitBtn.textContent = 'File bug';
    this.submitBtn.disabled = true;

    // Reset screenshot
    this.screenshotThumb.classList.add('bug-panel__screenshot-thumb--loading');
    this.screenshotImg.style.display = 'none';
    this.screenshotImg.src = '';

    // Reset recording section
    if (this.mediaRecorderSupported) {
      this._buildRecordingIdle();
    }

    this._announce('Bug reporter opened. Capturing screenshot.');
  };

  // --- Screenshot Capture ---

  BugReporter.prototype._captureScreenshot = function () {
    var self = this;

    this.screenshotThumb.classList.add('bug-panel__screenshot-thumb--loading');
    this.screenshotImg.style.display = 'none';

    // Remove any existing error state
    var existingError = this.screenshotThumb.querySelector('.bug-panel__screenshot-error');
    if (existingError) existingError.remove();

    loadHtmlToImage().then(function (htmlToImage) {
      // Hide panel during capture
      self.panelEl.style.visibility = 'hidden';

      // Use htmlToImage to capture the body
      return htmlToImage.toJpeg(document.body, {
        quality: 0.7,
        backgroundColor: '#ffffff',
        canvasWidth: window.innerWidth,
        canvasHeight: window.innerHeight,
        width: window.innerWidth,
        height: window.innerHeight,
        style: {
          transform: 'scale(1)',
          left: '0',
          top: '0',
          margin: '0'
        },
        cacheBust: true,
        filter: function (node) {
          // Exclude the bug reporter widget and the preview overlay
          if (node.id === 'bug-reporter-root' || node.id === 'panel-preview-overlay') return false;
          return true;
        }
      });
    }).then(function (dataUrl) {
      self.panelEl.style.visibility = 'visible';
      self.screenshotDataUrl = dataUrl;
      self.screenshotImg.src = self.screenshotDataUrl;
      self.screenshotImg.style.display = 'block';
      self.screenshotThumb.classList.remove('bug-panel__screenshot-thumb--loading');

      if (self.state === 'CAPTURING') {
        self.state = 'READY';
      }
      self._updateSubmitState();
    }).catch(function (error) {
      console.error('Screenshot capture failed:', error);
      self.panelEl.style.visibility = 'visible';
      self.screenshotThumb.classList.remove('bug-panel__screenshot-thumb--loading');

      // Show error in thumbnail
      var errorDiv = el('div', { className: 'bug-panel__screenshot-error' });
      var errorText = el('p', { className: 'bug-panel__screenshot-error-text', textContent: 'Screenshot unavailable' });
      var retryBtn = el('button', { className: 'bug-panel__screenshot-error-btn', type: 'button', textContent: 'Retry' });
      retryBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        self._captureScreenshot();
      });
      errorDiv.appendChild(errorText);
      errorDiv.appendChild(retryBtn);
      self.screenshotThumb.appendChild(errorDiv);

      if (self.state === 'CAPTURING') {
        self.state = 'READY';
      }
      self._updateSubmitState();
    });
  };

  // --- Screenshot Preview ---

  BugReporter.prototype._showPreview = function () {
    if (!this.screenshotDataUrl) return;
    this._previewReturnFocus = document.activeElement;
    this.previewImg.src = this.screenshotDataUrl;
    this.previewOverlay.classList.add('bug-preview-overlay--visible');
    this.previewCloseBtn.tabIndex = 0;
    // Move focus into the preview dialog
    var self = this;
    setTimeout(function () {
      self.previewCloseBtn.focus();
    }, 50);
  };

  BugReporter.prototype._hidePreview = function () {
    this.previewOverlay.classList.remove('bug-preview-overlay--visible');
    this.previewCloseBtn.tabIndex = -1;
    // Return focus to the element that opened the preview
    if (this._previewReturnFocus && typeof this._previewReturnFocus.focus === 'function') {
      this._previewReturnFocus.focus();
    }
    this._previewReturnFocus = null;
  };

  // --- Recording ---

  BugReporter.prototype._onRecordClick = function () {
    if (this.state !== 'READY') return;
    this._startRecording();
  };

  BugReporter.prototype._onStopClick = function () {
    if (this.state !== 'RECORDING') return;
    this._stopRecording();
    this._onRecordingStopped();
  };

  BugReporter.prototype._startRecording = function () {
    var self = this;
    this.state = 'RECORDING';
    this.committedText = '';
    this.recordSeconds = 0;

    // Build active recording UI
    this._buildRecordingActive();

    // Update textarea label
    this.textareaLabel.innerHTML = this.textareaLabelBase + ' &mdash; <span class="bug-panel__textarea-label-listening">listening...</span>';

    this._updateSubmitState();
    this._announce('Recording started. Speak to describe the bug.');

    // Move focus to stop button so keyboard users can stop the recording
    if (this.stopBtn) {
      this.stopBtn.focus();
    }

    // Step 1: Fetch scribe token
    var tokenPromise = fetch(SCRIBE_TOKEN_URL)
      .then(function (res) {
        if (!res.ok) throw new Error('Token fetch failed');
        return res.json();
      })
      .then(function (data) {
        return data.token;
      })
      .catch(function () {
        return null; // Graceful fallback: no live transcription
      });

    // Step 2: Request microphone
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(function (stream) {
        self.mediaStream = stream;

        tokenPromise.then(function (token) {
          // Step 3: Open WebSocket for live transcription (if token available)
          if (token) {
            self._connectScribeWs(token);
          }

          // Step 4: Set up AudioContext for raw PCM capture
          // ElevenLabs Scribe Realtime requires raw PCM, not WebM/Opus
          var SAMPLE_RATE = 16000;
          var audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: SAMPLE_RATE });
          self._audioContext = audioCtx;
          var source = audioCtx.createMediaStreamSource(stream);

          // ScriptProcessorNode to capture raw PCM float32 samples
          // Buffer size 4096 at 16kHz = ~256ms chunks
          var processor = audioCtx.createScriptProcessor(4096, 1, 1);
          self._audioProcessor = processor;

          processor.onaudioprocess = function (e) {
            if (self.scribeWs && self.scribeWs.readyState === WebSocket.OPEN) {
              var float32 = e.inputBuffer.getChannelData(0);
              // Convert float32 [-1,1] to int16 PCM
              var int16 = new Int16Array(float32.length);
              for (var i = 0; i < float32.length; i++) {
                var s = Math.max(-1, Math.min(1, float32[i]));
                int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
              }
              // Base64 encode
              var bytes = new Uint8Array(int16.buffer);
              var binary = '';
              for (var j = 0; j < bytes.length; j++) {
                binary += String.fromCharCode(bytes[j]);
              }
              var base64 = btoa(binary);
              self.scribeWs.send(JSON.stringify({
                message_type: 'input_audio_chunk',
                audio_base_64: base64
              }));
            }
          };

          source.connect(processor);
          processor.connect(audioCtx.destination);

          // Start timer
          self._startTimer();

          // 30-second hard cap
          self._recordTimeout = setTimeout(function () {
            if (self.state === 'RECORDING') {
              self._stopRecording();
              self._onRecordingStopped();
              self._announce('Recording stopped. Maximum duration reached.');
            }
          }, MAX_RECORD_SECONDS * 1000);
        });
      })
      .catch(function (err) {
        // Microphone denied or unavailable
        self.micDenied = true;
        self.state = 'READY';
        self._showMicDenied();
        self._updateSubmitState();
      });
  };

  BugReporter.prototype._connectScribeWs = function (token) {
    var self = this;
    var url = 'wss://api.elevenlabs.io/v1/speech-to-text/realtime?token=' + encodeURIComponent(token) + '&model_id=scribe_v2_realtime&audio_format=pcm_16000&commit_strategy=vad';

    try {
      this.scribeWs = new WebSocket(url);

      this.scribeWs.onmessage = function (event) {
        try {
          var data = JSON.parse(event.data);
          if (data.message_type === 'partial_transcript' && data.text) {
            // Show interim text
            self.textareaEl.value = self.committedText + data.text;
            self._scrollTextareaToBottom();
          } else if ((data.message_type === 'committed_transcript' || data.message_type === 'committed_transcript_with_timestamps') && data.text) {
            // Finalize segment
            self.committedText += data.text + ' ';
            self.textareaEl.value = self.committedText;
            self._scrollTextareaToBottom();
          }
          self._updateSubmitState();
        } catch (e) {
          // Ignore parse errors
        }
      };

      this.scribeWs.onerror = function () {
        // Graceful degradation: recording still works, user types manually
        self.scribeWs = null;
      };

      this.scribeWs.onclose = function () {
        self.scribeWs = null;
      };
    } catch (e) {
      this.scribeWs = null;
    }
  };

  BugReporter.prototype._scrollTextareaToBottom = function () {
    this.textareaEl.scrollTop = this.textareaEl.scrollHeight;
  };

  BugReporter.prototype._startTimer = function () {
    var self = this;
    this.recordSeconds = 0;

    this.recordTimer = setInterval(function () {
      self.recordSeconds++;
      if (self.recTimerEl) {
        self.recTimerEl.textContent = formatTime(self.recordSeconds);

        // Warning at 25 seconds
        if (self.recordSeconds >= WARNING_SECONDS) {
          self.recTimerEl.classList.add('bug-panel__rec-timer--warning');
          if (self.recordSeconds === WARNING_SECONDS) {
            self._announce('5 seconds remaining');
          }
        }
      }
    }, 1000);
  };

  BugReporter.prototype._stopRecording = function () {
    // Disconnect AudioContext processor
    if (this._audioProcessor) {
      try { this._audioProcessor.disconnect(); } catch (e) { /* ignore */ }
      this._audioProcessor = null;
    }
    if (this._audioContext) {
      try { this._audioContext.close(); } catch (e) { /* ignore */ }
      this._audioContext = null;
    }

    // Close WebSocket
    if (this.scribeWs) {
      try { this.scribeWs.close(); } catch (e) { /* ignore */ }
      this.scribeWs = null;
    }

    // Clear timers
    clearInterval(this.recordTimer);
    clearTimeout(this._recordTimeout);
    this.recordTimer = null;
    this._recordTimeout = null;
  };

  BugReporter.prototype._onRecordingStopped = function () {
    this.state = 'READY';
    this.hasRecorded = true;

    // Stop media stream tracks
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(function (t) { t.stop(); });
      this.mediaStream = null;
    }

    // Reset label
    this.textareaLabel.textContent = this.textareaLabelBase;
    this.textareaLabel.classList.remove('bug-panel__textarea-label-listening');

    // Swap recording strip back to idle, show re-record
    this._buildRecordingIdle();
    this.textareaActions.style.display = 'flex';

    this._updateSubmitState();
    this._announce('Recording stopped. Transcription complete.');

    // Move focus to textarea so user can review/edit transcription
    this.textareaEl.focus();
  };

  BugReporter.prototype._stopRecordingCleanup = function () {
    // Full cleanup for when panel closes or re-record
    this._stopRecording();

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(function (t) { t.stop(); });
      this.mediaStream = null;
    }
  };

  BugReporter.prototype._rerecord = function () {
    this._stopRecordingCleanup();
    this.textareaEl.value = '';
    this.committedText = '';
    this.hasRecorded = false;
    this.textareaActions.style.display = 'none';

    if (this.micDenied) {
      // Can not re-record if mic was denied
      return;
    }

    this.state = 'READY';
    this._buildRecordingIdle();
    this._updateSubmitState();
  };

  BugReporter.prototype._showMicDenied = function () {
    this.recordingSection.innerHTML = '';

    var denied = el('div', { className: 'bug-panel__mic-denied', role: 'alert' });
    denied.innerHTML = ICON_WARNING;

    var text = el('p', { className: 'bug-panel__mic-denied-text' });
    text.textContent = 'Microphone access denied. Check your browser settings to allow audio recording, or type your description below.';
    denied.appendChild(text);

    this.recordingSection.appendChild(denied);
  };

  // --- Submit ---

  BugReporter.prototype._updateSubmitState = function () {
    // Disabled when: recording active, or no content at all
    var hasDescription = this.textareaEl.value.trim().length > 0;
    var hasScreenshot = !!this.screenshotDataUrl;
    var isRecording = this.state === 'RECORDING';
    var isSubmitting = this.state === 'SUBMITTING';

    this.submitBtn.disabled = isRecording || isSubmitting || (!hasDescription && !hasScreenshot);
  };

  BugReporter.prototype._submit = function () {
    var self = this;
    if (this.state === 'SUBMITTING') return;

    var description = this.textareaEl.value.trim();
    var hasScreenshot = !!this.screenshotDataUrl;

    if (!description && !hasScreenshot) return;

    this.state = 'SUBMITTING';
    this.errorEl.style.display = 'none';
    this.submitBtn.innerHTML = '<span class="bug-panel__spinner"></span> Filing...';
    this.submitBtn.disabled = true;

    var payload = {
      pageUrl: window.location.href,
      projectSlug: DEFAULT_PROJECT_SLUG
    };

    if (description) {
      payload.description = description;
    }
    if (hasScreenshot) {
      payload.screenshotDataUrl = this.screenshotDataUrl;
    }
    payload.userAgent = navigator.userAgent;

    // Timeout tracking
    var timedOut = false;
    var stillSubmittingTimeout = setTimeout(function () {
      self.submitBtn.innerHTML = '<span class="bug-panel__spinner"></span> Still submitting...';
    }, 10000);
    var hardTimeout = setTimeout(function () {
      timedOut = true;
      self._submitError();
    }, 20000);

    fetch(BUG_REPORT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (res) {
        clearTimeout(stillSubmittingTimeout);
        clearTimeout(hardTimeout);
        if (timedOut) return;

        if (!res.ok) throw new Error('Submission failed');
        return res.json();
      })
      .then(function (data) {
        if (timedOut) return;
        self._submitSuccess(data);
      })
      .catch(function () {
        clearTimeout(stillSubmittingTimeout);
        clearTimeout(hardTimeout);
        if (timedOut) return;
        self._submitError();
      });
  };

  BugReporter.prototype._submitSuccess = function (data) {
    this.state = 'SUCCESS';
    this._announce('Bug filed successfully.');

    // Close panel
    this.panelEl.classList.remove('bug-panel--visible');
    this.panelEl.classList.add('bug-panel--closing');
    this.btnEl.classList.remove('bug-btn--open');
    this.btnEl.setAttribute('aria-expanded', 'false');
    this.btnEl.setAttribute('aria-label', 'Report a bug');
    this.btnIconEl.innerHTML = ICON_BUG;

    var self = this;
    setTimeout(function () {
      self.panelEl.classList.remove('bug-panel--closing');
    }, 150);

    // Show toast
    this._showToast();
  };

  BugReporter.prototype._submitError = function () {
    this.state = 'READY';
    this.errorEl.style.display = 'flex';
    this.submitBtn.textContent = 'File bug';
    this._updateSubmitState();
    this._announce('Failed to file bug. Try again.');
  };

  // --- Toast ---

  BugReporter.prototype._showToast = function () {
    var self = this;

    this.toastEl.classList.add('bug-toast--visible');

    setTimeout(function () {
      self.toastEl.classList.add('bug-toast--hiding');

      setTimeout(function () {
        self.toastEl.classList.remove('bug-toast--visible');
        self.toastEl.classList.remove('bug-toast--hiding');
        self.state = 'CLOSED';
      }, 150);
    }, TOAST_DURATION_MS);
  };

  // --- Accessibility ---

  BugReporter.prototype._getFocusableElements = function () {
    var elements = this.panelEl.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])'
    );
    // Filter out hidden elements
    var visible = [];
    for (var i = 0; i < elements.length; i++) {
      if (elements[i].offsetParent !== null || elements[i].offsetWidth > 0) {
        visible.push(elements[i]);
      }
    }
    return visible;
  };

  BugReporter.prototype._handlePanelKeydown = function (e) {
    if (e.key !== 'Tab') return;
    if (this.state === 'CLOSED') return;

    // Include the floating button (which is the close control) in the tab cycle
    var focusable = this._getFocusableElements();
    if (focusable.length === 0) return;

    // Also add the close button (floating btn) as the last focusable element
    // since it is outside the panel but part of the dialog workflow
    var allFocusable = Array.prototype.slice.call(focusable);
    allFocusable.push(this.btnEl);

    var firstEl = allFocusable[0];
    var lastEl = allFocusable[allFocusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      }
    } else {
      if (document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    }
  };

  BugReporter.prototype._announce = function (message) {
    if (this.statusEl) {
      this.statusEl.textContent = message;
      // Clear after a beat so the same message can be re-announced
      var el = this.statusEl;
      setTimeout(function () { el.textContent = ''; }, 1000);
    }
  };

  // --- Init ---

  document.addEventListener('DOMContentLoaded', function () {
    var root = document.getElementById('bug-reporter-root');
    if (!root) return;
    new BugReporter(root);
  });

})();
