/**
 * GeminiLiveClient — WebSocket + Web Audio client for Gemini Live API.
 *
 * Manages the full audio pipeline:
 * - Mic capture via AudioWorklet (16kHz PCM Int16 LE, base64)
 * - WebSocket connection to Gemini (direct browser-to-Google)
 * - Audio playback at 24kHz via AudioContext
 * - Transcript accumulation from real-time chunks
 * - Session resumption with proactive reconnection at 9 minutes
 * - Context window compression configuration
 *
 * Exposes an event-based interface for the interview UI module.
 */
var GeminiLiveClient = (function () {
  'use strict';

  var RECONNECT_INTERVAL_MS = 9 * 60 * 1000; // 9 minutes
  var MAX_RECONNECT_ATTEMPTS = 3;
  var BACKUP_INTERVAL_MS = 30000; // 30 seconds
  var WS_BASE_URL = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';

  // --- Utility functions ---

  function float32ToInt16(float32) {
    var int16 = new Int16Array(float32.length);
    for (var i = 0; i < float32.length; i++) {
      var s = Math.max(-1, Math.min(1, float32[i]));
      int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return int16;
  }

  function int16ToFloat32(int16) {
    var float32 = new Float32Array(int16.length);
    for (var i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / (int16[i] < 0 ? 0x8000 : 0x7FFF);
    }
    return float32;
  }

  function arrayBufferToBase64(buffer) {
    var bytes = new Uint8Array(buffer);
    var binary = '';
    for (var i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  function base64ToArrayBuffer(base64) {
    var binary = atob(base64);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  // --- Constructor ---

  function Client() {
    this._listeners = {};
    this._ws = null;
    this._micStream = null;
    this._captureContext = null;
    this._playbackContext = null;
    this._workletNode = null;
    this._analyserMic = null;
    this._analyserPlayback = null;
    this._resumptionToken = null;
    this._reconnectAttempts = 0;
    this._intentionalClose = false;
    this._reconnectTimer = null;
    this._backupTimer = null;
    this._token = null;
    this._config = null;
    this._meetingId = null;
    this._setupComplete = false;
    this._audioQueue = [];
    this._isPlaying = false;
    this._currentSource = null;

    // Transcript accumulation
    this._transcript = [];
    this._currentInputBuffer = '';
    this._currentOutputBuffer = '';

    // State: 'idle' | 'connecting' | 'active' | 'closed'
    this._state = 'idle';
  }

  // --- Event emitter ---

  Client.prototype.on = function (event, fn) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(fn);
  };

  Client.prototype.off = function (event, fn) {
    if (!this._listeners[event]) return;
    this._listeners[event] = this._listeners[event].filter(function (f) { return f !== fn; });
  };

  Client.prototype._emit = function (event, data) {
    var fns = this._listeners[event];
    if (!fns) return;
    for (var i = 0; i < fns.length; i++) {
      try { fns[i](data); } catch (e) { console.error('[gemini-client] Listener error:', e); }
    }
  };

  // --- Public API ---

  /**
   * Connect to Gemini Live API and start audio streaming.
   * @param {Object} opts - { token, config, meetingId }
   */
  Client.prototype.connect = function (opts) {
    this._token = opts.token;
    this._config = opts.config;
    this._meetingId = opts.meetingId;
    this._intentionalClose = false;
    this._reconnectAttempts = 0;
    this._transcript = [];
    this._currentInputBuffer = '';
    this._currentOutputBuffer = '';
    this._setupComplete = false;

    this._setState('connecting');
    this._initAudio()
      .then(this._openWebSocket.bind(this))
      .catch(this._handleInitError.bind(this));
  };

  /**
   * End the interview gracefully.
   * Returns the assembled transcript.
   */
  Client.prototype.disconnect = function () {
    this._intentionalClose = true;
    this._clearTimers();
    this._flushTranscriptBuffers();
    this._closeWebSocket();
    this._stopAudio();
    this._setState('closed');
    return this.getTranscript();
  };

  /**
   * Get the current accumulated transcript.
   */
  Client.prototype.getTranscript = function () {
    // Return a copy
    return this._transcript.slice();
  };

  /**
   * Get AnalyserNode for mic (for visualizer).
   */
  Client.prototype.getMicAnalyser = function () {
    return this._analyserMic;
  };

  /**
   * Get AnalyserNode for playback (for visualizer).
   */
  Client.prototype.getPlaybackAnalyser = function () {
    return this._analyserPlayback;
  };

  /**
   * Get current state.
   */
  Client.prototype.getState = function () {
    return this._state;
  };

  // --- Audio initialization ---

  Client.prototype._initAudio = function () {
    var self = this;
    return navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: 16000,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    }).then(function (stream) {
      self._micStream = stream;

      // Capture AudioContext at 16kHz
      self._captureContext = new AudioContext({ sampleRate: 16000 });
      var source = self._captureContext.createMediaStreamSource(stream);

      // AnalyserNode for mic visualization
      self._analyserMic = self._captureContext.createAnalyser();
      self._analyserMic.fftSize = 256;
      source.connect(self._analyserMic);

      // AudioWorklet for PCM capture
      return self._captureContext.audioWorklet.addModule('js/audio-worklet-processor.js')
        .then(function () {
          self._workletNode = new AudioWorkletNode(self._captureContext, 'pcm-processor');
          self._analyserMic.connect(self._workletNode);

          self._workletNode.port.onmessage = function (event) {
            if (!self._ws || self._ws.readyState !== WebSocket.OPEN || !self._setupComplete) return;
            var int16Data = float32ToInt16(event.data);
            var base64Audio = arrayBufferToBase64(int16Data.buffer);
            self._ws.send(JSON.stringify({
              realtimeInput: {
                mediaChunks: [{
                  mimeType: 'audio/pcm;rate=16000',
                  data: base64Audio,
                }],
              },
            }));
          };

          // Playback AudioContext at 24kHz
          self._playbackContext = new AudioContext({ sampleRate: 24000 });
          self._analyserPlayback = self._playbackContext.createAnalyser();
          self._analyserPlayback.fftSize = 256;
          self._analyserPlayback.connect(self._playbackContext.destination);
        });
    });
  };

  // --- WebSocket ---

  Client.prototype._openWebSocket = function () {
    var self = this;
    var model = this._config.model;
    var url = WS_BASE_URL + '?key=' + encodeURIComponent(this._token);

    this._ws = new WebSocket(url);

    this._ws.onopen = function () {
      // Send setup message
      var setupMsg = {
        setup: {
          model: 'models/' + model,
          generationConfig: self._config.generationConfig,
          inputAudioTranscription: self._config.inputAudioTranscription || {},
          outputAudioTranscription: self._config.outputAudioTranscription || {},
          realtimeInputConfig: {
            automaticActivityDetection: {
              disabled: false,
              startOfSpeechSensitivity: 'START_SENSITIVITY_MEDIUM',
              endOfSpeechSensitivity: 'END_SENSITIVITY_LOW',
              prefixPaddingMs: 300,
              silenceDurationMs: 2000,
            },
          },
          sessionResumption: {
            transparentResumption: true,
          },
          contextWindowCompression: {
            triggerTokens: 100000,
            slidingWindow: {
              targetTokens: 50000,
            },
          },
        },
      };

      // Include resumption token for reconnections
      if (self._resumptionToken) {
        setupMsg.setup.sessionResumption.handle = self._resumptionToken;
      }

      self._ws.send(JSON.stringify(setupMsg));
    };

    this._ws.onmessage = function (event) {
      try {
        var msg = JSON.parse(event.data);
        self._handleServerMessage(msg);
      } catch (e) {
        console.error('[gemini-client] Failed to parse message:', e);
      }
    };

    this._ws.onclose = function (event) {
      self._handleWebSocketClose(event);
    };

    this._ws.onerror = function () {
      if (self._state === 'connecting') {
        self._emit('error', { type: 'connection', message: 'Unable to connect to the interview service.' });
      }
    };
  };

  Client.prototype._handleServerMessage = function (msg) {
    // Setup complete
    if (msg.setupComplete) {
      this._setupComplete = true;
      this._reconnectAttempts = 0;
      this._setState('active');
      this._startReconnectTimer();
      this._startBackupTimer();
      this._emit('ready');
      return;
    }

    // Session resumption token
    if (msg.sessionResumptionUpdate && msg.sessionResumptionUpdate.token) {
      this._resumptionToken = msg.sessionResumptionUpdate.token;
    }

    // Server content (audio + transcript)
    if (msg.serverContent) {
      var sc = msg.serverContent;

      // Output audio chunks
      if (sc.modelTurn && sc.modelTurn.parts) {
        for (var i = 0; i < sc.modelTurn.parts.length; i++) {
          var part = sc.modelTurn.parts[i];
          if (part.inlineData && part.inlineData.mimeType && part.inlineData.mimeType.indexOf('audio') === 0) {
            this._playAudio(part.inlineData.data);
          }
          // Output text transcription from model turn
          if (part.text) {
            this._currentOutputBuffer += part.text;
            this._emit('outputTranscript', part.text);
          }
        }
      }

      // Output audio transcription (alternative location)
      if (sc.outputTranscription && sc.outputTranscription.text) {
        this._currentOutputBuffer += sc.outputTranscription.text;
        this._emit('outputTranscript', sc.outputTranscription.text);
      }

      // Input (CEO) transcription
      if (sc.inputTranscription && sc.inputTranscription.text) {
        this._currentInputBuffer += sc.inputTranscription.text;
        this._emit('inputTranscript', sc.inputTranscription.text);
      }

      // Turn complete — commit output buffer
      if (sc.turnComplete) {
        if (this._currentOutputBuffer.trim()) {
          this._transcript.push({
            speaker: 'AI Interviewer',
            role: 'Interviewer',
            text: this._currentOutputBuffer.trim(),
          });
          this._currentOutputBuffer = '';
          this._emit('transcriptUpdated', this._transcript);
        }
        // Also commit input buffer if there's pending input
        if (this._currentInputBuffer.trim()) {
          this._transcript.push({
            speaker: 'CEO',
            role: 'Interviewee',
            text: this._currentInputBuffer.trim(),
          });
          this._currentInputBuffer = '';
          this._emit('transcriptUpdated', this._transcript);
        }
      }

      // Interrupted — the user interrupted the AI, commit what we have
      if (sc.interrupted) {
        if (this._currentOutputBuffer.trim()) {
          this._transcript.push({
            speaker: 'AI Interviewer',
            role: 'Interviewer',
            text: this._currentOutputBuffer.trim(),
          });
          this._currentOutputBuffer = '';
        }
        // Clear audio queue on interruption
        this._audioQueue = [];
        this._emit('transcriptUpdated', this._transcript);
      }
    }

    // Tool call (not used in v1, but handle gracefully)
    if (msg.toolCall) {
      console.warn('[gemini-client] Received unexpected tool call, ignoring');
    }
  };

  Client.prototype._handleWebSocketClose = function () {
    this._clearReconnectTimer();

    if (this._intentionalClose) return;

    if (this._reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      this._emit('error', {
        type: 'connectionLost',
        message: 'Connection lost after ' + MAX_RECONNECT_ATTEMPTS + ' reconnection attempts.',
      });
      this._flushTranscriptBuffers();
      this._stopAudio();
      this._setState('closed');
      return;
    }

    this._reconnectAttempts++;
    this._emit('reconnecting', { attempt: this._reconnectAttempts });
    var self = this;
    setTimeout(function () {
      if (self._intentionalClose) return;
      self._setupComplete = false;
      self._openWebSocket();
    }, 1000);
  };

  // --- Audio playback ---

  Client.prototype._playAudio = function (base64Audio) {
    if (!this._playbackContext) return;

    var arrayBuf = base64ToArrayBuffer(base64Audio);
    var int16Data = new Int16Array(arrayBuf);
    var float32Data = int16ToFloat32(int16Data);

    var buffer = this._playbackContext.createBuffer(1, float32Data.length, 24000);
    buffer.getChannelData(0).set(float32Data);
    this._audioQueue.push(buffer);
    this._playNext();
  };

  Client.prototype._playNext = function () {
    if (this._isPlaying || this._audioQueue.length === 0) return;
    if (!this._playbackContext) return;

    this._isPlaying = true;
    this._emit('aiSpeaking', true);

    var buffer = this._audioQueue.shift();
    var source = this._playbackContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this._analyserPlayback);
    this._currentSource = source;

    var self = this;
    source.onended = function () {
      self._isPlaying = false;
      self._currentSource = null;
      if (self._audioQueue.length > 0) {
        self._playNext();
      } else {
        self._emit('aiSpeaking', false);
      }
    };
    source.start();
  };

  // --- Timers ---

  Client.prototype._startReconnectTimer = function () {
    this._clearReconnectTimer();
    var self = this;
    this._reconnectTimer = setTimeout(function () {
      if (self._state !== 'active') return;
      // Proactive reconnect at 9 minutes
      self._reconnectAttempts = 0;
      self._setupComplete = false;
      if (self._ws) {
        self._ws.close();
      }
    }, RECONNECT_INTERVAL_MS);
  };

  Client.prototype._clearReconnectTimer = function () {
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }
  };

  Client.prototype._startBackupTimer = function () {
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
          // localStorage full or unavailable — ignore
        }
      }
    }, BACKUP_INTERVAL_MS);
  };

  Client.prototype._clearBackupTimer = function () {
    if (this._backupTimer) {
      clearInterval(this._backupTimer);
      this._backupTimer = null;
    }
  };

  Client.prototype._clearTimers = function () {
    this._clearReconnectTimer();
    this._clearBackupTimer();
  };

  // --- Cleanup ---

  Client.prototype._flushTranscriptBuffers = function () {
    if (this._currentInputBuffer.trim()) {
      this._transcript.push({
        speaker: 'CEO',
        role: 'Interviewee',
        text: this._currentInputBuffer.trim(),
      });
      this._currentInputBuffer = '';
    }
    if (this._currentOutputBuffer.trim()) {
      this._transcript.push({
        speaker: 'AI Interviewer',
        role: 'Interviewer',
        text: this._currentOutputBuffer.trim(),
      });
      this._currentOutputBuffer = '';
    }
  };

  Client.prototype._closeWebSocket = function () {
    if (this._ws) {
      try { this._ws.close(); } catch (e) { /* ignore */ }
      this._ws = null;
    }
  };

  Client.prototype._stopAudio = function () {
    // Stop mic
    if (this._micStream) {
      this._micStream.getTracks().forEach(function (t) { t.stop(); });
      this._micStream = null;
    }
    // Close contexts
    if (this._captureContext && this._captureContext.state !== 'closed') {
      try { this._captureContext.close(); } catch (e) { /* ignore */ }
    }
    if (this._playbackContext && this._playbackContext.state !== 'closed') {
      try { this._playbackContext.close(); } catch (e) { /* ignore */ }
    }
    this._captureContext = null;
    this._playbackContext = null;
    this._workletNode = null;
    this._analyserMic = null;
    this._analyserPlayback = null;
    this._audioQueue = [];
    this._isPlaying = false;
    if (this._currentSource) {
      try { this._currentSource.stop(); } catch (e) { /* ignore */ }
      this._currentSource = null;
    }
  };

  Client.prototype._handleInitError = function (err) {
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

    this._stopAudio();
    this._setState('closed');
    this._emit('error', { type: type, message: message });
  };

  Client.prototype._setState = function (state) {
    if (this._state === state) return;
    this._state = state;
    this._emit('stateChange', state);
  };

  /**
   * Clean up localStorage backup after successful save.
   */
  Client.prototype.clearBackup = function (meetingId) {
    try {
      localStorage.removeItem('interview-transcript-' + meetingId);
    } catch (e) { /* ignore */ }
  };

  return Client;
})();

// Export for use by interview.js
if (typeof window !== 'undefined') {
  window.GeminiLiveClient = GeminiLiveClient;
}
