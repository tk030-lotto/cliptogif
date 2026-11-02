/**
 * App - Application Entry Point & Orchestrator.
 * Connects UI, VideoController, FrameExtractor, and GifEncoderWrapper.
 */
import { FileHandler } from './file-handler.js';
import { VideoController } from './video-controller.js';
import { FrameExtractor } from './frame-extractor.js';
import { GifEncoderWrapper } from './gif-encoder.js';
import { UIController } from './ui-controller.js';
import { SampleVideoGenerator } from './sample-video.js';
import { SETTINGS } from './settings.js';

class App {
  constructor() {
    this.ui = new UIController();
    this.videoController = new VideoController({
      videoEl: this.ui.videoPlayer,
      onLoadedMetadata: (meta) => this.handleLoadedMetadata(meta),
      onTimeUpdate: (cur) => this.handleTimeUpdate(cur),
      onError: (msg) => alert(msg)
    });

    this.frameExtractor = new FrameExtractor({
      canvasEl: document.getElementById('hidden-canvas'),
      videoController: this.videoController
    });

    this.gifEncoder = new GifEncoderWrapper({
      workerScript: SETTINGS.DEFAULT_WORKER_SCRIPT,
      quality: SETTINGS.DEFAULT_QUALITY,
      workers: SETTINGS.DEFAULT_WORKERS
    });

    this.fileHandler = new FileHandler({
      dropZoneEl: document.getElementById('drop-zone'),
      fileInputEl: document.getElementById('file-input'),
      onFileSelected: (file) => this.handleFileSelected(file),
      onError: (msg) => alert(msg)
    });

    this.currentMeta = null;
    this.isProcessing = false;
    this.generationSessionId = 0;
    this.generationTask = null;

    this.bindEvents();
  }

  bindEvents() {
    // Sample Video button
    const btnSample = document.getElementById('btn-sample-video');
    if (btnSample) {
      btnSample.addEventListener('click', async (e) => {
        e.stopPropagation();
        try {
          this.ui.showProgress('サンプル動画（縦動画9:16）を生成中...');
          const sampleFile = await SampleVideoGenerator.createSampleVideoFile();
          this.handleFileSelected(sampleFile);
        } catch (err) {
          alert('サンプル動画の生成に失敗しました: ' + err.message);
          this.ui.showDropZone();
        }
      });
    }

    // Play/Pause button
    this.ui.btnPlayPause.addEventListener('click', () => {
      if (this.isProcessing) return;
      this.videoController.togglePlay();
      this.ui.updatePlayButton(!this.ui.videoPlayer.paused);
    });
    this.ui.videoPlayer.addEventListener('play', () => this.ui.updatePlayButton(true));
    this.ui.videoPlayer.addEventListener('pause', () => this.ui.updatePlayButton(false));

    // Seek Slider
    this.ui.seekSlider.addEventListener('input', (e) => {
      if (this.isProcessing) return;
      this.videoController.seek(parseFloat(e.target.value));
    });

    // Start / End Range Sliders
    this.ui.sliderStart.addEventListener('input', () => { if (this.isProcessing) return; this.syncRange(true); });
    this.ui.sliderEnd.addEventListener('input', () => { if (this.isProcessing) return; this.syncRange(false); });

    // Quick set buttons
    this.ui.btnSetStartNow.addEventListener('click', () => {
      this.ui.sliderStart.value = this.ui.videoPlayer.currentTime;
      this.syncRange(true);
    });
    this.ui.btnSetEndNow.addEventListener('click', () => {
      this.ui.sliderEnd.value = this.ui.videoPlayer.currentTime;
      this.syncRange(false);
    });

    // Nudge ±0.1s
    this.ui.btnStartMinus.addEventListener('click', () => this.nudgeTime('start', -0.1));
    this.ui.btnStartPlus.addEventListener('click', () => this.nudgeTime('start', 0.1));
    this.ui.btnEndMinus.addEventListener('click', () => this.nudgeTime('end', -0.1));
    this.ui.btnEndPlus.addEventListener('click', () => this.nudgeTime('end', 0.1));

    // Loop Preview
    this.ui.btnPreviewRange.addEventListener('click', () => {
      if (this.isProcessing) return;
      const s = parseFloat(this.ui.sliderStart.value);
      const e = parseFloat(this.ui.sliderEnd.value);
      if (this.videoController.isRangeLooping) {
        this.videoController.stopRangeLoop();
        this.ui.btnPreviewRange.classList.remove('btn-primary');
        this.ui.btnPreviewRange.classList.add('btn-secondary');
      } else {
        this.videoController.startRangeLoop(s, e);
        this.ui.btnPreviewRange.classList.remove('btn-secondary');
        this.ui.btnPreviewRange.classList.add('btn-primary');
      }
    });

    // Radio changes (resolution / fps)
    document.querySelectorAll('input[name="res-preset"], input[name="fps-preset"]').forEach(radio => {
      radio.addEventListener('change', () => {
        if (!this.currentMeta) return;
        const s = parseFloat(this.ui.sliderStart.value);
        const e = parseFloat(this.ui.sliderEnd.value);
        this.ui.updateRangeValues(s, e, this.currentMeta.duration, this.currentMeta.width, this.currentMeta.height);
      });
    });

    // Actions
    this.ui.btnGenerateGif.addEventListener('click', () => this.generateGif());
    this.ui.btnCancelGeneration.addEventListener('click', () => this.cancelGeneration());
    this.ui.btnEditAgain.addEventListener('click', () => this.ui.showEditor());
    this.ui.btnReset.addEventListener('click', () => this.resetAll());
  }

  handleFileSelected(file) {
    if (this.isProcessing) return;
    this.ui.showProgress('動画を読み込んでいます...');
    this.videoController.loadVideo(file);
  }

  handleLoadedMetadata(meta) {
    if (!meta || typeof meta.duration !== 'number' || isNaN(meta.duration) || meta.duration <= 0) {
      alert('動画の再生時間を正しく取得できませんでした。破損しているか非対応の形式です。');
      this.ui.hideProgress();
      this.resetAll();
      return;
    }
    this.currentMeta = meta;
    this.ui.updateVideoMeta(meta);
    this.ui.showEditor();
  }

  handleTimeUpdate(cur) {
    this.ui.updateTimeDisplay(cur);
  }

  syncRange(isStartChanged) {
    if (!this.currentMeta) return;
    let s = parseFloat(this.ui.sliderStart.value);
    let e = parseFloat(this.ui.sliderEnd.value);

    // Prevent cross-over
    if (s >= e) {
      if (isStartChanged) {
        e = Math.min(this.currentMeta.duration, s + 0.1);
        this.ui.sliderEnd.value = e;
      } else {
        s = Math.max(0, e - 0.1);
        this.ui.sliderStart.value = s;
      }
    }

    this.ui.updateRangeValues(s, e, this.currentMeta.duration, this.currentMeta.width, this.currentMeta.height);
  }

  nudgeTime(type, delta) {
    if (!this.currentMeta) return;
    if (type === 'start') {
      const val = Math.max(0, Math.min(this.currentMeta.duration, parseFloat(this.ui.sliderStart.value) + delta));
      this.ui.sliderStart.value = val;
      this.syncRange(true);
      this.videoController.seek(val);
    } else {
      const val = Math.max(0, Math.min(this.currentMeta.duration, parseFloat(this.ui.sliderEnd.value) + delta));
      this.ui.sliderEnd.value = val;
      this.syncRange(false);
      this.videoController.seek(val);
    }
  }

  generateGif() {
    if (this.isProcessing || !this.currentMeta) return null;

    const startTime = parseFloat(this.ui.sliderStart.value);
    const endTime = parseFloat(this.ui.sliderEnd.value);
    const duration = endTime - startTime;

    if (duration < SETTINGS.MIN_CLIP_SECONDS || duration > SETTINGS.MAX_CLIP_SECONDS + 0.1) {
      alert(`変換範囲は${SETTINGS.MIN_CLIP_SECONDS}秒以上、${SETTINGS.MAX_CLIP_SECONDS}秒以内で指定してください。`);
      return;
    }

    this.isProcessing = true;
    // キャンセル時に終了を待てるよう、実行中の処理を保持する (F-06)
    this.generationTask = this._generate(startTime, endTime);
    return this.generationTask;
  }

  async _generate(startTime, endTime) {
    const currentSessionId = ++this.generationSessionId;
    this.videoController.stopRangeLoop();

    const { maxSide, fps } = this.ui.getSettings();
    const delayMs = Math.round(1000 / fps);

    this.ui.showProgress('フレームを抽出しています...');

    try {
      // 1. Calculate dimensions & initialize encoder
      const { width, height } = FrameExtractor.calculateDimensions(this.currentMeta.width, this.currentMeta.height, maxSide);
      this.gifEncoder.createEncoder({ width, height });

      // 2. Sequentially extract frames
      const extractResult = await this.frameExtractor.extractFrames({
        startTime,
        endTime,
        fps,
        maxSide,
        onProgress: (p, cur, total) => {
          if (this.generationSessionId !== currentSessionId) return;
          // Extraction represents 0% - 50% of total progress
          this.ui.updateProgress('フレーム抽出中...', cur, total, p * 50);
        },
        onFrame: (imageData) => {
          if (this.generationSessionId !== currentSessionId) return;
          this.gifEncoder.addFrame(imageData, delayMs);
        }
      });

      if (this.generationSessionId !== currentSessionId) {
        throw new Error('Extraction cancelled by user');
      }

      // 3. Encode frames via Web Worker
      this.ui.updateProgress('GIFをエンコード中...', extractResult.totalFrames, extractResult.totalFrames, 50);
      const renderResult = await this.gifEncoder.render({
        onProgress: (p) => {
          if (this.generationSessionId !== currentSessionId) return;
          // Encoding represents 50% - 100% of total progress
          const totalProgress = 50 + p * 50;
          this.ui.updateProgress('GIFをエンコード中...', Math.round(p * extractResult.totalFrames), extractResult.totalFrames, totalProgress);
        }
      });

      if (this.generationSessionId !== currentSessionId) {
        throw new Error('Encoding aborted');
      }

      // 4. Display Result
      this.ui.displayResult({
        blob: renderResult.blob,
        blobUrl: renderResult.blobUrl,
        width,
        height,
        fps,
        totalFrames: extractResult.totalFrames,
        filename: this.currentMeta.filename
      });
    } catch (err) {
      const isAbort = err.name === 'AbortError' || err.message === 'Extraction cancelled by user' || err.message === 'Encoding aborted';
      if (!isAbort) {
        console.error(err);
        alert(`GIFの生成に失敗しました: ${err.message}`);
      }
      this.ui.showEditor();
    } finally {
      this.isProcessing = false;
      this.generationTask = null;
      this.ui.setCancelPending(false);
      this.ui.hideProgress();
    }
  }

  /**
   * 生成を中断し、旧ループが終わるまで待つ (F-06)
   * 待たずに再生成すると、2つのループが同じ video の currentTime を奪い合う。
   */
  async cancelGeneration() {
    const task = this.generationTask;
    this.generationSessionId = 0;
    this.frameExtractor.abort();
    this.gifEncoder.abort();

    if (!task) {
      this.isProcessing = false;
      this.ui.hideProgress();
      this.ui.showEditor();
      return;
    }

    this.ui.setCancelPending(true);
    try {
      await task;
    } catch (err) {
      console.warn('キャンセル待ちの例外:', err);
    } finally {
      this.ui.setCancelPending(false);
      this.ui.hideProgress();
      this.ui.showEditor();
    }
  }

  async resetAll() {
    await this.cancelGeneration();
    this.videoController.cleanup();
    this.gifEncoder.cleanup();
    this.currentMeta = null;
    this.ui.showDropZone();
  }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  new App();
});
