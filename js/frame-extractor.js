/**
 * FrameExtractor - Calculates long-side aspect-ratio dimensions and extracts
 * sequential frames from HTML5 Video onto a Canvas.
 */
import { calculateDimensions } from './dimensions.js';

export class FrameExtractor {
  constructor({ canvasEl, videoController }) {
    this.canvasEl = canvasEl;
    this.ctx = canvasEl.getContext('2d', { willReadFrequently: true });
    this.videoController = videoController;
    this._sessionCounter = 0;
    this.currentSessionId = 0;
  }

  get isAborted() {
    return this.currentSessionId === 0;
  }

  /**
   * Calculate output dimensions based on the longest side.
   */
  static calculateDimensions(origWidth, origHeight, maxSide) {
    return calculateDimensions(origWidth, origHeight, maxSide);
  }

  abort() {
    this.currentSessionId = 0;
  }

  /**
   * Sequentially seek and extract ImageData frames from start to end.
   */
  async extractFrames({ startTime, endTime, fps, maxSide, onProgress, onFrame }) {
    const sessionId = ++this._sessionCounter;
    this.currentSessionId = sessionId;

    const isCurrentSessionActive = () => this.currentSessionId === sessionId;

    const video = this.videoController.videoEl;
    const origW = video.videoWidth;
    const origH = video.videoHeight;

    const { width, height } = FrameExtractor.calculateDimensions(origW, origH, maxSide);

    // Setup canvas
    this.canvasEl.width = width;
    this.canvasEl.height = height;

    const interval = 1 / fps;
    const duration = endTime - startTime;
    const totalFrames = Math.max(1, Math.round(duration * fps));

    for (let i = 0; i < totalFrames; i++) {
      if (!isCurrentSessionActive()) {
        throw new Error('Extraction cancelled by user');
      }

      const targetTime = startTime + i * interval;
      // Seek video with Promise synchronization
      await this.videoController.seekAsync(targetTime);

      if (!isCurrentSessionActive()) {
        throw new Error('Extraction cancelled by user');
      }

      // Draw onto canvas resized
      this.ctx.drawImage(video, 0, 0, width, height);

      // Extract pixel data
      const imageData = this.ctx.getImageData(0, 0, width, height);

      if (!isCurrentSessionActive()) {
        throw new Error('Extraction cancelled by user');
      }

      if (onFrame) {
        onFrame(imageData, i, totalFrames);
      }

      if (onProgress) {
        onProgress((i + 1) / totalFrames, i + 1, totalFrames);
      }
    }

    return { width, height, totalFrames };
  }
}
