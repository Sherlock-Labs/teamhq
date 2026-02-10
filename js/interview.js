/**
 * Interview UI module — manages the AI interview feature lifecycle.
 *
 * States: idle, configuring, connecting, active, processing
 * Follows the same IIFE pattern as meetings.js.
 * Communicates with meetings.js via CustomEvent for cross-module concerns.
 */
(function () {
  'use strict';

  var API_BASE = '/api/interviews';
  var HARD_LIMIT_MS = 60 * 60 * 1000; // 60 minutes
  var WARNING_TIME_MS = 15 * 60 * 1000; // 15 minutes
  var DANGER_TIME_MS = 55 * 60 * 1000; // 55 minutes
  var VISUALIZER_BAR_COUNT = 20;
  var VISUALIZER_BAR_COUNT_MOBILE = 12;
  var COMPLETE_RETRY_COUNT = 3;

  // --- DOM refs ---
  var interviewBtn = document.getElementById('interview-btn');
  var configPanel = document.getElementById('interview-config');
  var topicInput = document.getElementById('interview-topic');
  var contextTextarea = document.getElementById('interview-context');
  var topicError = document.getElementById('interview-topic-error');
  var startBtn = document.getElementById('interview-start-btn');
  var panelContainer = document.getElementById('interview-panel');
  var srAnnounce = document.getElementById('interview-sr-announce');

  if (!interviewBtn || !configPanel) return;

  // --- State ---
  var state = 'idle'; // idle | configuring | connecting | active | processing
  var client = null;
  var meetingId = null;
  var timerInterval = null;
  var startTime = null;
  var animFrame = null;
  var configOpen = false;

  // --- Helpers ---

  function escapeHTML(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  function announce(text) {
    if (srAnnounce) {
      srAnnounce.textContent = text;
      setTimeout(function () { srAnnounce.textContent = ''; }, 1000);
    }
  }

  function setInterviewRunning(running) {
    // Communicate with meetings.js via a data attribute and custom event
    document.body.setAttribute('data-interview-running', running ? 'true' : 'false');
    document.dispatchEvent(new CustomEvent('interview:stateChange', { detail: { running: running } }));
  }

  function isMeetingRunning() {
    // Check if a simulated meeting is running (set by meetings.js)
    return document.body.getAttribute('data-meeting-running') === 'true';
  }

  function updateInterviewBtnState() {
    if (!interviewBtn) return;
    var meetingRunning = isMeetingRunning();
    var interviewRunning = state === 'connecting' || state === 'active' || state === 'processing';

    interviewBtn.disabled = meetingRunning || interviewRunning;

    if (state === 'configuring') {
      interviewBtn.textContent = 'Cancel';
    } else {
      interviewBtn.textContent = 'Interview';
    }
  }

  function disableAllMeetingBtns(disabled) {
    var btns = document.querySelectorAll('.meetings__run-btn');
    for (var i = 0; i < btns.length; i++) {
      if (btns[i].id !== 'interview-btn') {
        btns[i].disabled = disabled;
      }
    }
  }

  function formatTimer(ms) {
    var totalSeconds = Math.floor(ms / 1000);
    var minutes = Math.floor(totalSeconds / 60);
    var seconds = totalSeconds % 60;
    return (minutes < 10 ? '0' : '') + minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
  }

  function formatTimerAria(ms) {
    var totalSeconds = Math.floor(ms / 1000);
    var minutes = Math.floor(totalSeconds / 60);
    var seconds = totalSeconds % 60;
    var parts = [];
    if (minutes > 0) parts.push(minutes + ' minute' + (minutes !== 1 ? 's' : ''));
    if (seconds > 0 || minutes === 0) parts.push(seconds + ' second' + (seconds !== 1 ? 's' : ''));
    return 'Elapsed time: ' + parts.join(' ');
  }

  // --- Toast (reuse meetings.js toast pattern) ---

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
    }, 4000);
  }

  // --- State transitions ---

  function setState(newState) {
    state = newState;
    updateInterviewBtnState();

    var running = newState === 'connecting' || newState === 'active' || newState === 'processing';
    setInterviewRunning(running);
    disableAllMeetingBtns(running);
  }

  // --- Config panel ---

  function openConfigPanel() {
    setState('configuring');
    configOpen = true;
    configPanel.setAttribute('aria-hidden', 'false');
    panelContainer.setAttribute('aria-hidden', 'true');

    // Focus the topic input
    setTimeout(function () {
      if (topicInput) topicInput.focus();
    }, 100);

    announce('Interview configuration. Enter a topic to begin.');
    validateStartBtn();
  }

  function closeConfigPanel() {
    setState('idle');
    configOpen = false;
    configPanel.setAttribute('aria-hidden', 'true');
    panelContainer.setAttribute('aria-hidden', 'true');
    clearTopicError();
  }

  function validateStartBtn() {
    if (!startBtn || !topicInput) return;
    var hasValue = topicInput.value.trim().length > 0;
    startBtn.disabled = !hasValue;
  }

  function showTopicError(msg) {
    if (topicError) {
      topicError.textContent = msg;
    }
    if (topicInput) {
      topicInput.setAttribute('aria-invalid', 'true');
    }
  }

  function clearTopicError() {
    if (topicError) topicError.textContent = '';
    if (topicInput) topicInput.removeAttribute('aria-invalid');
  }

  // --- Connecting state ---

  function showConnectingState(topic) {
    configPanel.setAttribute('aria-hidden', 'true');
    panelContainer.setAttribute('aria-hidden', 'false');
    panelContainer.innerHTML =
      '<div class="interview-connecting">' +
        '<div class="interview-connecting__dot"></div>' +
        '<p class="interview-connecting__text" id="interview-connecting-text">Connecting...</p>' +
        '<p class="interview-connecting__detail">Setting up your interview on "' + escapeHTML(topic) + '"</p>' +
        '<button class="interview-error__action" type="button" id="interview-cancel-btn">Cancel</button>' +
      '</div>';

    var cancelBtn = document.getElementById('interview-cancel-btn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', handleCancel);
      setTimeout(function () { cancelBtn.focus(); }, 100);
    }

    announce('Connecting to interview service.');

    // Slow connection warning
    setTimeout(function () {
      if (state === 'connecting') {
        var textEl = document.getElementById('interview-connecting-text');
        if (textEl) textEl.textContent = 'Still connecting... This may take a moment.';
      }
    }, 8000);
  }

  // --- Active state ---

  function showActiveState(topic) {
    configPanel.setAttribute('aria-hidden', 'true');
    panelContainer.setAttribute('aria-hidden', 'false');

    var barCount = window.innerWidth < 640 ? VISUALIZER_BAR_COUNT_MOBILE : VISUALIZER_BAR_COUNT;
    var barsHtml = '';
    for (var i = 0; i < barCount; i++) {
      barsHtml += '<div class="interview-visualizer__bar" style="animation-delay: ' + (i * 0.1) + 's"></div>';
    }

    panelContainer.innerHTML =
      '<div class="interview-active" role="status" aria-live="polite" aria-label="Interview in progress">' +
        '<div class="interview-active__header">' +
          '<div class="interview-active__status-group">' +
            '<div class="interview-active__status">' +
              '<span class="interview-active__dot"></span>' +
              '<span class="interview-active__status-text">Interview in progress</span>' +
            '</div>' +
            '<p class="interview-active__topic">Topic: ' + escapeHTML(topic) + '</p>' +
          '</div>' +
          '<span class="interview-active__timer" id="interview-timer" aria-label="Elapsed time: 0 seconds" aria-live="off">00:00</span>' +
        '</div>' +
        '<div class="interview-visualizer interview-visualizer--idle" id="interview-visualizer" role="img" aria-label="Audio activity indicator">' +
          barsHtml +
        '</div>' +
        '<div class="interview-active__actions">' +
          '<button class="interview-active__end-btn" type="button" id="interview-end-btn">End Interview</button>' +
        '</div>' +
      '</div>';

    var endBtn = document.getElementById('interview-end-btn');
    if (endBtn) {
      endBtn.addEventListener('click', handleEndInterview);
      setTimeout(function () { endBtn.focus(); }, 100);
    }

    announce('Interview started. Speak into your microphone.');
    startTimer();
    startVisualizer();
  }

  // --- Processing state ---

  function showProcessingState(durationText) {
    panelContainer.innerHTML =
      '<div class="interview-processing">' +
        '<div class="interview-processing__icon">&#10003;</div>' +
        '<p class="interview-processing__title">Interview complete</p>' +
        '<p class="interview-processing__duration">Duration: ' + escapeHTML(durationText) + '</p>' +
        '<p class="interview-processing__text">Processing transcript...</p>' +
        '<div class="interview-connecting__dot"></div>' +
      '</div>';

    announce('Interview ended. Processing transcript.');
  }

  // --- Error state ---

  function showErrorState(title, message, actionLabel, actionFn) {
    panelContainer.setAttribute('aria-hidden', 'false');
    configPanel.setAttribute('aria-hidden', 'true');

    panelContainer.innerHTML =
      '<div class="interview-error" role="alert">' +
        '<div class="interview-error__icon" aria-hidden="true">' +
          '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
            '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>' +
          '</svg>' +
        '</div>' +
        '<p class="interview-error__title">' + escapeHTML(title) + '</p>' +
        '<p class="interview-error__message">' + escapeHTML(message) + '</p>' +
        (actionLabel
          ? '<button class="interview-error__action" type="button" id="interview-error-action">' + escapeHTML(actionLabel) + '</button>'
          : '') +
      '</div>';

    if (actionLabel && actionFn) {
      var actionBtn = document.getElementById('interview-error-action');
      if (actionBtn) {
        actionBtn.addEventListener('click', actionFn);
        setTimeout(function () { actionBtn.focus(); }, 100);
      }
    }
  }

  function showConnectionLost(durationText) {
    stopTimer();
    stopVisualizer();

    panelContainer.innerHTML =
      '<div class="interview-error interview-error--warning" role="alert">' +
        '<div class="interview-error__icon interview-error__icon--warning" aria-hidden="true">' +
          '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
            '<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>' +
            '<line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>' +
          '</svg>' +
        '</div>' +
        '<p class="interview-error__title">Connection lost</p>' +
        '<p class="interview-error__message">Your transcript up to this point has been saved.</p>' +
        '<p class="interview-processing__duration">Duration: ' + escapeHTML(durationText) + '</p>' +
        '<button class="interview-error__action" type="button" id="interview-close-btn">Close</button>' +
      '</div>';

    var closeBtn = document.getElementById('interview-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', function () {
        handleFailedInterview('Connection lost after reconnection attempts');
      });
      setTimeout(function () { closeBtn.focus(); }, 100);
    }
  }

  // --- Timer ---

  function startTimer() {
    startTime = Date.now();
    var timerEl = document.getElementById('interview-timer');

    timerInterval = setInterval(function () {
      if (!timerEl) {
        timerEl = document.getElementById('interview-timer');
        if (!timerEl) return;
      }

      var elapsed = Date.now() - startTime;
      timerEl.textContent = formatTimer(elapsed);
      timerEl.setAttribute('aria-label', formatTimerAria(elapsed));

      // Color warnings
      if (elapsed >= DANGER_TIME_MS) {
        timerEl.className = 'interview-active__timer interview-active__timer--danger';
      } else if (elapsed >= WARNING_TIME_MS) {
        timerEl.className = 'interview-active__timer interview-active__timer--warning';
        // Announce 15 min mark once
        if (elapsed < WARNING_TIME_MS + 1100) {
          announce('Fifteen minutes elapsed.');
        }
      }

      // Hard limit
      if (elapsed >= HARD_LIMIT_MS) {
        showToast('Interview automatically ended after 60 minutes.');
        handleEndInterview();
      }
    }, 1000);
  }

  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  function getElapsedMs() {
    return startTime ? Date.now() - startTime : 0;
  }

  function getElapsedText() {
    return formatTimer(getElapsedMs());
  }

  // --- Visualizer ---

  function startVisualizer() {
    if (!client) return;

    var micAnalyser = client.getMicAnalyser();
    var playbackAnalyser = client.getPlaybackAnalyser();
    var visualizerEl = document.getElementById('interview-visualizer');
    if (!visualizerEl) return;

    var micData = micAnalyser ? new Uint8Array(micAnalyser.frequencyBinCount) : null;
    var playbackData = playbackAnalyser ? new Uint8Array(playbackAnalyser.frequencyBinCount) : null;
    var bars = visualizerEl.querySelectorAll('.interview-visualizer__bar');
    var aiSpeaking = false;

    // Listen for AI speaking state
    client.on('aiSpeaking', function (speaking) {
      aiSpeaking = speaking;
    });

    // Check for reduced motion preference
    var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function draw() {
      if (state !== 'active') return;

      var data;
      var isActive = false;

      if (aiSpeaking && playbackAnalyser && playbackData) {
        playbackAnalyser.getByteFrequencyData(playbackData);
        data = playbackData;
        visualizerEl.classList.add('interview-visualizer--ai-speaking');
        visualizerEl.classList.remove('interview-visualizer--idle');
        isActive = true;
      } else if (micAnalyser && micData) {
        micAnalyser.getByteFrequencyData(micData);
        data = micData;
        visualizerEl.classList.remove('interview-visualizer--ai-speaking');

        // Check if there's meaningful audio
        var sum = 0;
        for (var j = 0; j < data.length; j++) sum += data[j];
        isActive = sum / data.length > 10;
      }

      if (isActive && data) {
        visualizerEl.classList.remove('interview-visualizer--idle');
        var step = Math.floor(data.length / bars.length);
        for (var i = 0; i < bars.length; i++) {
          var idx = i * step;
          var val = data[idx] || 0;
          var height = Math.max(4, Math.min(32, (val / 255) * 32));
          bars[i].style.height = height + 'px';
        }
      } else if (!reducedMotion) {
        visualizerEl.classList.add('interview-visualizer--idle');
        // Reset bar heights for CSS idle animation
        for (var i = 0; i < bars.length; i++) {
          bars[i].style.height = '';
        }
      } else {
        // Reduced motion + idle: static bars
        visualizerEl.classList.remove('interview-visualizer--idle');
        for (var i = 0; i < bars.length; i++) {
          bars[i].style.height = '4px';
        }
      }

      animFrame = requestAnimationFrame(draw);
    }

    animFrame = requestAnimationFrame(draw);
  }

  function stopVisualizer() {
    if (animFrame) {
      cancelAnimationFrame(animFrame);
      animFrame = null;
    }
  }

  // --- Interview lifecycle ---

  function handleStartInterview() {
    if (!topicInput) return;

    var topic = topicInput.value.trim();
    if (!topic) {
      showTopicError('Please enter a topic for the interview.');
      return;
    }
    clearTopicError();

    var context = contextTextarea ? contextTextarea.value.trim() : '';

    setState('connecting');
    showConnectingState(topic);

    // Call backend to create meeting and get ephemeral token
    fetch(API_BASE + '/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic: topic, context: context || undefined }),
    })
      .then(function (res) {
        if (!res.ok) {
          return res.json().then(function (err) {
            throw new Error(err.error || 'Failed to start interview');
          });
        }
        return res.json();
      })
      .then(function (data) {
        meetingId = data.meetingId;

        // Create Gemini client and connect
        client = new window.GeminiLiveClient();

        client.on('stateChange', function (clientState) {
          if (clientState === 'active' && state === 'connecting') {
            setState('active');
            showActiveState(topic);
          }
        });

        client.on('error', function (err) {
          if (err.type === 'connectionLost') {
            showConnectionLost(getElapsedText());
            return;
          }
          // For init errors (mic, connection), show error state
          stopTimer();
          stopVisualizer();
          setState('idle');

          var actionLabel = 'Try Again';
          var actionFn = function () {
            closeConfigPanel();
            openConfigPanel();
          };

          if (err.type === 'micDenied') {
            showErrorState('Microphone access required', err.message, actionLabel, actionFn);
          } else if (err.type === 'micNotFound') {
            showErrorState('No microphone detected', err.message, actionLabel, actionFn);
          } else if (err.type === 'micInUse') {
            showErrorState('Microphone unavailable', err.message, actionLabel, actionFn);
          } else {
            showErrorState('Unable to connect', err.message, 'Retry', actionFn);
          }
        });

        client.connect({
          token: data.token,
          config: data.config,
          meetingId: data.meetingId,
        });
      })
      .catch(function (err) {
        setState('idle');
        var msg = err.message || 'Unable to start interview';
        if (msg.indexOf('already in progress') !== -1) {
          showErrorState('Meeting in progress', 'Another meeting is in progress. Please wait for it to finish.', null, null);
        } else {
          showErrorState('Unable to start interview', msg, 'Try Again', function () {
            closeConfigPanel();
            openConfigPanel();
          });
        }
      });
  }

  function handleEndInterview() {
    if (!client || state !== 'active') return;

    var elapsed = getElapsedMs();
    var durationSeconds = Math.floor(elapsed / 1000);
    var durationText = getElapsedText();

    stopTimer();
    stopVisualizer();

    setState('processing');
    showProcessingState(durationText);

    var transcript = client.disconnect();

    // Send transcript to backend
    sendComplete(meetingId, transcript, durationSeconds, 0);
  }

  function sendComplete(id, transcript, durationSeconds, attempt) {
    fetch(API_BASE + '/' + encodeURIComponent(id) + '/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript: transcript, durationSeconds: durationSeconds }),
    })
      .then(function (res) {
        if (!res.ok) throw new Error('Failed to save interview');
        return res.json();
      })
      .then(function () {
        // Clean up localStorage backup
        if (client) client.clearBackup(id);

        // Success — collapse panel, refresh meeting list
        finishInterview();
        showToast('Interview saved');
        announce('Interview saved. View it in the meetings list.');
      })
      .catch(function () {
        if (attempt < COMPLETE_RETRY_COUNT - 1) {
          // Exponential backoff: 1s, 2s, 4s
          var delay = Math.pow(2, attempt) * 1000;
          setTimeout(function () {
            sendComplete(id, transcript, durationSeconds, attempt + 1);
          }, delay);
        } else {
          // All retries failed — save to localStorage and show degraded message
          try {
            localStorage.setItem('interview-transcript-' + id, JSON.stringify(transcript));
          } catch (e) { /* ignore */ }

          panelContainer.innerHTML =
            '<div class="interview-processing">' +
              '<p class="interview-processing__title">Interview saved</p>' +
              '<p class="interview-processing__text">Summary generation failed. The full transcript has been preserved.</p>' +
            '</div>';

          setTimeout(function () {
            finishInterview();
          }, 3000);
        }
      });
  }

  function handleFailedInterview(errorMsg) {
    var transcript = client ? client.disconnect() : [];
    var durationSeconds = Math.floor(getElapsedMs() / 1000);

    stopTimer();
    stopVisualizer();

    // Notify backend
    if (meetingId) {
      fetch(API_BASE + '/' + encodeURIComponent(meetingId) + '/fail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: errorMsg,
          partialTranscript: transcript.length > 0 ? transcript : undefined,
        }),
      }).catch(function () {
        // Best effort
      });
    }

    finishInterview();
  }

  function finishInterview() {
    setState('idle');
    configOpen = false;
    configPanel.setAttribute('aria-hidden', 'true');
    panelContainer.setAttribute('aria-hidden', 'true');
    client = null;
    meetingId = null;

    // Return focus to interview button
    if (interviewBtn) interviewBtn.focus();

    // Refresh meetings list
    document.dispatchEvent(new CustomEvent('interview-complete'));
  }

  function handleCancel() {
    if (client) {
      client.disconnect();
      client = null;
    }
    meetingId = null;
    stopTimer();
    stopVisualizer();

    // Return to config panel with values preserved
    setState('configuring');
    panelContainer.setAttribute('aria-hidden', 'true');
    configPanel.setAttribute('aria-hidden', 'false');
    updateInterviewBtnState();
  }

  // --- Event listeners ---

  interviewBtn.addEventListener('click', function () {
    if (isMeetingRunning()) return;
    if (state === 'connecting' || state === 'active' || state === 'processing') return;

    if (configOpen) {
      closeConfigPanel();
    } else {
      openConfigPanel();
    }
  });

  if (topicInput) {
    topicInput.addEventListener('input', function () {
      clearTopicError();
      validateStartBtn();
    });
  }

  if (startBtn) {
    startBtn.addEventListener('click', handleStartInterview);
  }

  // Listen for meetings.js state changes
  document.addEventListener('meeting:stateChange', function (e) {
    if (e.detail && e.detail.running !== undefined) {
      document.body.setAttribute('data-meeting-running', e.detail.running ? 'true' : 'false');
      updateInterviewBtnState();
    }
  });

  // Listen for interview-complete to refresh meetings list (handled by meetings.js)
  // This is dispatched by finishInterview above.

  // Keyboard: Escape closes config panel
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && state === 'configuring') {
      closeConfigPanel();
    }
  });

})();
