/**
 * AudioWorklet processor for capturing 16kHz PCM audio from the microphone.
 * Runs on the audio rendering thread for low-latency, jank-free processing.
 *
 * Buffers incoming Float32 samples and posts them to the main thread
 * in chunks of 2048 samples (~128ms at 16kHz).
 */
class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._buffer = new Float32Array(2048);
    this._writeIndex = 0;
  }

  process(inputs) {
    var input = inputs[0];
    if (!input || !input[0]) return true;

    var channelData = input[0];
    for (var i = 0; i < channelData.length; i++) {
      this._buffer[this._writeIndex++] = channelData[i];
      if (this._writeIndex >= this._buffer.length) {
        this.port.postMessage(this._buffer.slice());
        this._writeIndex = 0;
      }
    }
    return true;
  }
}

registerProcessor('pcm-processor', PCMProcessor);
