/**
 * VideoController - Manages video playback, metadata, range looping,
 * and reliable asynchronous frame seeking with Promise synchronization.
 */
export const DEFAULT_SEEK_TIMEOUT_MS = 500;

export class VideoController {
  constructor({ videoEl, onLoadedMetadata, onTimeUpdate, onError, seekTimeoutMs = DEFAULT_SEEK_TIMEOUT_MS }) {
    this.videoEl = videoEl;
    this.onLoadedMetadata = onLoadedMetadata;
    this.onTimeUpdate = onTimeUpdate;
    this.onError = onError;
    this.seekTimeoutMs = seekTimeoutMs;

    this.currentFile = null;
    this.currentBlobUrl = null;
    this.isRangeLooping = false;
    this.rangeStart = 0;
    this.rangeEnd = 0;

    this.setupVideoAttributes();
    this.initEvents();
  }

  setupVideoAttributes() {
    this.videoEl.setAttribute('playsinline', '');
    this.videoEl.setAttribute('webkit-playsinline', '');
    this.videoEl.muted = true;
    this.videoEl.preload = 'auto';
  }

  initEvents() {
    this.videoEl.addEventListener('loadedmetadata', () => {
      const duration = this.videoEl.duration;
      const width = this.videoEl.videoWidth;
      const height = this.videoEl.videoHeight;
      const isPortrait = height > width;

      if (this.onLoadedMetadata) {
        this.onLoadedMetadata({
          duration,
          width,
          height,
          isPortrait,
          filename: this.currentFile ? this.currentFile.name : 'video.mp4'
        });
      }
    });

    this.videoEl.addEventListener('timeupdate', () => {
      const cur = this.videoEl.currentTime;

      // Handle range loop preview
      if (this.isRangeLooping) {
        if (cur >= this.rangeEnd || cur < this.rangeStart) {
          this.videoEl.currentTime = this.rangeStart;
        }
      }

      if (this.onTimeUpdate) {
        this.onTimeUpdate(cur, this.videoEl.duration);
      }
    });

    this.videoEl.addEventListener('error', () => {
      if (this.onError) {
        this.onError('動画をブラウザで再生できませんでした。形式をご確認ください（HEVC等の場合はH.264 MP4をご利用ください）。');
      }
    });
  }

  loadVideo(file) {
    this.cleanup();
    this.currentFile = file;
    this.currentBlobUrl = URL.createObjectURL(file);
    this.videoEl.src = this.currentBlobUrl;
    this.videoEl.load();
  }

  play() {
    return this.videoEl.play().catch(() => {});
  }

  pause() {
    this.videoEl.pause();
    this.isRangeLooping = false;
  }

  togglePlay() {
    if (this.videoEl.paused) {
      this.play();
    } else {
      this.pause();
    }
  }

  seek(time) {
    this.videoEl.currentTime = Math.max(0, Math.min(time, this.videoEl.duration || 0));
  }

  startRangeLoop(start, end) {
    this.rangeStart = start;
    this.rangeEnd = end;
    this.isRangeLooping = true;
    this.videoEl.currentTime = start;
    this.play();
  }

  stopRangeLoop() {
    this.isRangeLooping = false;
    this.pause();
  }

  /**
   * Synchronously seek to target time with Promise and fallback timeout.
   * Ensures the frame is completely drawn before resolving.
   */
  seekAsync(targetTime) {
    return new Promise((resolve) => {
      const clampedTime = Math.max(0, Math.min(targetTime, this.videoEl.duration || 0));
      let isResolved = false;

      const onSeeked = () => {
        if (isResolved) return;
        isResolved = true;
        this.videoEl.removeEventListener('seeked', onSeeked);
        clearTimeout(fallbackTimer);
        resolve();
      };

      // Safety timeout to prevent hanging if seeked event is missed
      const fallbackTimer = setTimeout(() => {
        if (isResolved) return;
        isResolved = true;
        this.videoEl.removeEventListener('seeked', onSeeked);
        resolve();
      }, this.seekTimeoutMs);

      this.videoEl.addEventListener('seeked', onSeeked);
      this.videoEl.currentTime = clampedTime;
    });
  }

  cleanup() {
    this.pause();
    this.videoEl.removeAttribute('src');
    this.videoEl.load();
    if (this.currentBlobUrl) {
      URL.revokeObjectURL(this.currentBlobUrl);
      this.currentBlobUrl = null;
    }
    this.currentFile = null;
    this.isRangeLooping = false;
  }
}
