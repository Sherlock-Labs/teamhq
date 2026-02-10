/**
 * ElevenLabsClient — Thin wrapper around the ElevenLabs Conversational AI SDK.
 *
 * Provides the same event interface as the former GeminiLiveClient:
 * - Events: stateChange, error, aiSpeaking, transcriptUpdated
 * - Methods: connect(), disconnect(), getTranscript(),
 *            getInputByteFrequencyData(), getOutputVolume(), getMode(),
 *            clearBackup()
 *
 * The SDK handles microphone capture, audio playback, WebSocket management,
 * reconnection, and VAD internally. This wrapper just maps SDK callbacks
 * to the event interface that interview.js consumes.
 */
import { Conversation } from 'https://cdn.jsdelivr.net/npm/@elevenlabs/client@0.14.0/+esm';

var BACKUP_INTERVAL_MS = 30000; // 30 seconds

function ElevenLabsClient() {
  this._listeners = {};
  this._conversation = null;
  this._transcript = [];
  this._meetingId = null;
  this._backupTimer = null;
  this._state = 'idle';
  this._mode = 'listening'; // 'listening' | 'speaking'
}

// --- Event emitter (identical to GeminiLiveClient) ---

ElevenLabsClient.prototype.on = function (event, fn) {
  if (!this._listeners[event]) this._listeners[event] = [];
  this._listeners[event].push(fn);
};

ElevenLabsClient.prototype.off = function (event, fn) {
  if (!this._listeners[event]) return;
  this._listeners[event] = this._listeners[event].filter(function (f) { return f !== fn; });
};

ElevenLabsClient.prototype._emit = function (event, data) {
  var fns = this._listeners[event];
  if (!fns) return;
  for (var i = 0; i < fns.length; i++) {
    try { fns[i](data); } catch (e) { console.error('[elevenlabs-client] Listener error:', e); }
  }
};

// --- State management ---

ElevenLabsClient.prototype._setState = function (newState) {
  if (this._state === newState) return;
  this._state = newState;
  this._emit('stateChange', newState);
};

ElevenLabsClient.prototype.getState = function () {
  return this._state;
};

// --- Public API ---

/**
 * Connect to ElevenLabs Conversational AI.
 * @param {Object} opts - { signedUrl, promptOverride, firstMessage, meetingId }
 */
ElevenLabsClient.prototype.connect = function (opts) {
  var self = this;
  this._meetingId = opts.meetingId;
  this._transcript = [];
  this._mode = 'listening';
  this._setState('connecting');

  // Request mic permission before starting session (per ElevenLabs docs)
  navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
    // Release the stream — SDK will request its own
    stream.getTracks().forEach(function (t) { t.stop(); });

    return Conversation.startSession({
      signedUrl: opts.signedUrl,
      overrides: {
        agent: {
          prompt: { prompt: opts.promptOverride },
          firstMessage: opts.firstMessage,
        },
      },
      onConnect: function (props) {
        console.log('[elevenlabs-client] Connected, conversationId:', props.conversationId);
        self._setState('active');
        self._startBackupTimer();
      },
      onDisconnect: function (details) {
        console.log('[elevenlabs-client] Disconnected:', details.reason, details.message || '');
        if (self._state === 'active' || self._state === 'connecting') {
          var msg = 'Connection lost.';
          if (details.reason === 'error' && details.message) {
            msg = details.message;
          }
          self._emit('error', { type: 'connectionLost', message: msg });
        }
        self._clearBackupTimer();
        self._setState('closed');
      },
      onError: function (message, context) {
        console.error('[elevenlabs-client] Error:', message, context);
        self._emit('error', { type: 'connection', message: message || 'Connection error' });
      },
      onStatusChange: function (prop) {
        console.log('[elevenlabs-client] Status:', prop.status);
      },
      onMessage: function (message) {
        if (message.role === 'user') {
          self._transcript.push({
            speaker: 'CEO',
            role: 'Interviewee',
            text: message.message,
          });
        } else if (message.role === 'agent') {
          self._transcript.push({
            speaker: 'AI Interviewer',
            role: 'Interviewer',
            text: message.message,
          });
        }
        self._emit('transcriptUpdated', self._transcript);
      },
      onModeChange: function (data) {
        self._mode = data.mode;
        self._emit('aiSpeaking', data.mode === 'speaking');
      },
    });
  }).then(function (conversation) {
    if (conversation) {
      self._conversation = conversation;
    }
  }).catch(function (err) {
    self._handleInitError(err);
  });
};

/**
 * End the interview gracefully.
 * Returns the assembled transcript.
 */
ElevenLabsClient.prototype.disconnect = function () {
  this._clearBackupTimer();
  if (this._conversation) {
    this._conversation.endSession();
    this._conversation = null;
  }
  this._setState('closed');
  return this.getTranscript();
};

/**
 * Get the current accumulated transcript.
 */
ElevenLabsClient.prototype.getTranscript = function () {
  return this._transcript.slice();
};

/**
 * Get mic frequency data for visualizer.
 * Returns Uint8Array matching AnalyserNode.getByteFrequencyData() format.
 */
ElevenLabsClient.prototype.getInputByteFrequencyData = function () {
  if (!this._conversation) return null;
  return this._conversation.getInputByteFrequencyData();
};

/**
 * Get output volume for visualizer (0.0 - 1.0).
 */
ElevenLabsClient.prototype.getOutputVolume = function () {
  if (!this._conversation) return 0;
  return this._conversation.getOutputVolume();
};

/**
 * Get current mode: 'listening' or 'speaking'.
 */
ElevenLabsClient.prototype.getMode = function () {
  return this._mode;
};

// --- Error handling ---

ElevenLabsClient.prototype._handleInitError = function (err) {
  var type = 'connection';
  var message = 'Unable to start the interview. Please try again.';

  if (err && err.name === 'NotAllowedError') {
    type = 'micDenied';
    message = 'Microphone access is required for interviews. Please allow microphone access in your browser settings and try again.';
  } else if (err && err.name === 'NotFoundError') {
    type = 'micNotFound';
    message = 'No microphone detected. Please connect a microphone and try again.';
  } else if (err && err.name === 'NotReadableError') {
    type = 'micInUse';
    message = 'Your microphone is being used by another application. Close other apps using the mic and try again.';
  }

  this._setState('closed');
  this._emit('error', { type: type, message: message });
};

// --- localStorage backup timer ---

ElevenLabsClient.prototype._startBackupTimer = function () {
  this._clearBackupTimer();
  var self = this;
  this._backupTimer = setInterval(function () {
    if (self._transcript.length > 0 && self._meetingId) {
      try {
        localStorage.setItem(
          'interview-transcript-' + self._meetingId,
          JSON.stringify(self._transcript)
        );
      } catch (e) {
        // localStorage full or unavailable
      }
    }
  }, BACKUP_INTERVAL_MS);
};

ElevenLabsClient.prototype._clearBackupTimer = function () {
  if (this._backupTimer) {
    clearInterval(this._backupTimer);
    this._backupTimer = null;
  }
};

/**
 * Clean up localStorage backup after successful save.
 */
ElevenLabsClient.prototype.clearBackup = function (meetingId) {
  try {
    localStorage.removeItem('interview-transcript-' + meetingId);
  } catch (e) { /* ignore */ }
};

// Export for use by interview.js (ESM modules have their own scope)
window.ElevenLabsClient = ElevenLabsClient;
