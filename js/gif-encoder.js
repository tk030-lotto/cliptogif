/**
 * GifEncoderWrapper - Encapsulates gif.js Web Worker operations,
 * infinite loop configuration, frame ingestion, and progress tracking.
 */
export const DEFAULT_GIF_WORKER_SCRIPT = 'lib/gif.worker.js';
export const DEFAULT_GIF_CONFIG = {
  workerScript: DEFAULT_GIF_WORKER_SCRIPT,
  quality: 10,
  workers: 2,
  repeat: 0 // 0 = Infinite loop
};

export class GifEncoderWrapper {
  constructor({
    workerScript = DEFAULT_GIF_CONFIG.workerScript,
    quality = DEFAULT_GIF_CONFIG.quality,
    workers = DEFAULT_GIF_CONFIG.workers
  } = {}) {
    this.workerScript = workerScript;
    this.quality = quality;
    this.workers = workers;
    this.gifInstance = null;
    this.currentBlobUrl = null;
  }

  /**
   * Initialize a new GIF encoder instance.
   */
  createEncoder({ width, height, workerScript = this.workerScript }) {
    if (typeof window.GIF !== 'function') {
      throw new Error('GIF encoder library (gif.js) is not loaded.');
    }

    this.abort();

    this.gifInstance = new window.GIF({
      workers: this.workers,
      quality: this.quality,
      workerScript: workerScript,
      width: width,
      height: height,
      repeat: DEFAULT_GIF_CONFIG.repeat,
      transparent: null,
      dither: false
    });

    return this.gifInstance;
  }

  /**
   * Add an ImageData frame with appropriate delay.
   */
  addFrame(imageData, delayMs) {
    if (!this.gifInstance) {
      throw new Error('GIF encoder not initialized.');
    }
    this.gifInstance.addFrame(imageData, { delay: delayMs });
  }

  /**
   * Start encoding and wait for Blob via Promise.
   */
  render({ onProgress }) {
    return new Promise((resolve, reject) => {
      if (!this.gifInstance) {
        return reject(new Error('Encoder not initialized.'));
      }

      this.gifInstance.on('progress', (progressVal) => {
        if (onProgress) {
          onProgress(progressVal);
        }
      });

      this.gifInstance.on('finished', (blob) => {
        this.cleanupBlobUrl();
        this.currentBlobUrl = URL.createObjectURL(blob);
        resolve({ blob, blobUrl: this.currentBlobUrl });
      });

      this.gifInstance.on('abort', () => {
        reject(new Error('Encoding aborted'));
      });

      try {
        this.gifInstance.render();
      } catch (err) {
        reject(err);
      }
    });
  }

  abort() {
    if (this.gifInstance && this.gifInstance.running) {
      this.gifInstance.abort();
    }
    this.gifInstance = null;
  }

  cleanupBlobUrl() {
    if (this.currentBlobUrl) {
      URL.revokeObjectURL(this.currentBlobUrl);
      this.currentBlobUrl = null;
    }
  }

  cleanup() {
    this.abort();
    this.cleanupBlobUrl();
  }
}
