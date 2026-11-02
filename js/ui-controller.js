/**
 * UIController - Coordinates UI view states, slider interactions,
 * real-time dimension calculations, progress tracking, and size zone badge.
 */
import { calculateDimensions } from './dimensions.js';
import { SETTINGS } from './settings.js';

export class UIController {
  constructor() {
    this.cacheElements();
  }

  cacheElements() {
    // Sections
    this.dropSection = document.getElementById('drop-zone-section');
    this.editorSection = document.getElementById('editor-section');
    this.progressSection = document.getElementById('progress-section');
    this.resultSection = document.getElementById('result-section');

    // Video Meta Elements
    this.metaFilename = document.getElementById('meta-filename');
    this.metaResolution = document.getElementById('meta-resolution');
    this.metaOrientation = document.getElementById('meta-orientation');
    this.metaDuration = document.getElementById('meta-duration');

    // Video Player & Slider
    this.videoPlayer = document.getElementById('video-player');
    this.btnPlayPause = document.getElementById('btn-play-pause');
    this.iconPlay = document.getElementById('icon-play');
    this.iconPause = document.getElementById('icon-pause');
    this.seekSlider = document.getElementById('seek-slider');
    this.currentTimeDisplay = document.getElementById('current-time-display');
    this.totalTimeDisplay = document.getElementById('total-time-display');

    // Range Controls
    this.sliderStart = document.getElementById('slider-start');
    this.sliderEnd = document.getElementById('slider-end');
    this.startTimeVal = document.getElementById('start-time-val');
    this.endTimeVal = document.getElementById('end-time-val');
    this.clipDurationDisplay = document.getElementById('clip-duration-display');
    this.clipDurationWarning = document.getElementById('clip-duration-warning');
    this.btnSetStartNow = document.getElementById('btn-set-start-now');
    this.btnSetEndNow = document.getElementById('btn-set-end-now');
    this.btnStartMinus = document.getElementById('btn-start-minus');
    this.btnStartPlus = document.getElementById('btn-start-plus');
    this.btnEndMinus = document.getElementById('btn-end-minus');
    this.btnEndPlus = document.getElementById('btn-end-plus');
    this.btnPreviewRange = document.getElementById('btn-preview-range');

    // Settings
    this.calcOutputResolution = document.getElementById('calc-output-resolution');
    this.calcTotalFrames = document.getElementById('calc-total-frames');
    this.btnGenerateGif = document.getElementById('btn-generate-gif');
    this.btnReset = document.getElementById('btn-reset');

    // Progress Elements
    this.progressTitle = document.getElementById('progress-title');
    this.progressDetail = document.getElementById('progress-detail');
    this.progressBarFill = document.getElementById('progress-bar-fill');
    this.btnCancelGeneration = document.getElementById('btn-cancel-generation');

    // Result Elements
    this.gifPreviewImage = document.getElementById('gif-preview-image');
    this.sizeZoneBadge = document.getElementById('size-zone-badge');
    this.zoneBadgeText = document.getElementById('zone-badge-text');
    this.zoneGuidanceText = document.getElementById('zone-guidance-text');
    this.resultFilesize = document.getElementById('result-filesize');
    this.resultDimensions = document.getElementById('result-dimensions');
    this.resultFps = document.getElementById('result-fps');
    this.resultFrames = document.getElementById('result-frames');
    this.btnDownloadGif = document.getElementById('btn-download-gif');
    this.btnEditAgain = document.getElementById('btn-edit-again');

    // エラー表示 (F-21)
    this.errorBanner = document.getElementById('error-banner');
    this.errorBannerText = document.getElementById('error-banner-text');
    this.btnErrorClose = document.getElementById('error-banner-close');
    if (this.btnErrorClose) {
      this.btnErrorClose.addEventListener('click', () => this.hideError());
    }
  }

  /**
   * エラーを画面内に表示する（alert の代わり）(F-21)
   * @param {string} message
   */
  showError(message) {
    if (!this.errorBanner) return;
    if (this.errorBannerText) this.errorBannerText.textContent = message;
    this.errorBanner.classList.remove('is-hidden');
    // 読み上げ・キーボードで気づけるよう、閉じるボタンへフォーカスを移す
    if (this.btnErrorClose && typeof this.btnErrorClose.focus === 'function') {
      this.btnErrorClose.focus();
    }
  }

  /**
   * エラー表示を消す（次の操作の開始時に呼ぶ）
   */
  hideError() {
    if (!this.errorBanner) return;
    this.errorBanner.classList.add('is-hidden');
    if (this.errorBannerText) this.errorBannerText.textContent = '';
  }

  /**
   * 生成中は編集UIを操作できないようにする (F-03)
   * inert が使えない環境でも、CSS の .is-locked でクリックを防ぐ。
   */
  setEditorLocked(locked) {
    if (!this.editorSection) return;
    if (locked) {
      this.editorSection.setAttribute('inert', '');
      this.editorSection.setAttribute('aria-busy', 'true');
      this.editorSection.classList.add('is-locked');
    } else {
      this.editorSection.removeAttribute('inert');
      this.editorSection.removeAttribute('aria-busy');
      this.editorSection.classList.remove('is-locked');
    }
  }

  /**
   * キャンセル処理中は、生成・キャンセルの再操作を止める (F-06)
   */
  setCancelPending(pending) {
    if (this.btnCancelGeneration) {
      this.btnCancelGeneration.disabled = pending;
      this.btnCancelGeneration.textContent = pending ? 'キャンセル中...' : 'キャンセル';
    }
    if (pending && this.btnGenerateGif) this.btnGenerateGif.disabled = true;
  }

  showDropZone() {
    this.setEditorLocked(false);
    this.dropSection.classList.remove('is-hidden');
    this.editorSection.classList.add('is-hidden');
    this.progressSection.classList.add('is-hidden');
    this.resultSection.classList.add('is-hidden');
  }

  showEditor() {
    this.setEditorLocked(false);
    this.dropSection.classList.add('is-hidden');
    this.editorSection.classList.remove('is-hidden');
    this.progressSection.classList.add('is-hidden');
    this.resultSection.classList.add('is-hidden');
  }

  showProgress(title = 'GIFを生成中...') {
    this.setEditorLocked(true);
    this.progressTitle.textContent = title;
    this.progressDetail.textContent = '初期化中...';
    this.progressBarFill.style.width = '0%';
    this.progressSection.classList.remove('is-hidden');
    this.btnGenerateGif.disabled = true;
  }

  hideProgress() {
    this.setEditorLocked(false);
    this.progressSection.classList.add('is-hidden');
    this.refreshGenerateButtonState();
  }

  refreshGenerateButtonState() {
    const start = parseFloat(this.sliderStart?.value) || 0;
    const end = parseFloat(this.sliderEnd?.value) || 0;
    const clipLen = Math.max(0, end - start);
    if (this.btnGenerateGif) {
      this.btnGenerateGif.disabled = clipLen < SETTINGS.MIN_CLIP_SECONDS || clipLen > SETTINGS.MAX_CLIP_SECONDS;
    }
  }

  showResult() {
    this.setEditorLocked(false);
    this.progressSection.classList.add('is-hidden');
    this.resultSection.classList.remove('is-hidden');
  }

  updatePlayButton(isPlaying) {
    if (isPlaying) {
      this.iconPlay.classList.add('is-hidden');
      this.iconPause.classList.remove('is-hidden');
    } else {
      this.iconPlay.classList.remove('is-hidden');
      this.iconPause.classList.add('is-hidden');
    }
  }

  updateVideoMeta({ duration, width, height, isPortrait, filename }) {
    this.metaFilename.textContent = filename;
    this.metaResolution.textContent = `${width} × ${height}`;
    this.metaOrientation.textContent = isPortrait ? '縦動画 (9:16等)' : '横動画 (16:9等)';
    this.metaDuration.textContent = `${duration.toFixed(1)}s`;

    // Sliders setup
    this.seekSlider.max = duration;
    this.seekSlider.value = 0;
    this.totalTimeDisplay.textContent = `${duration.toFixed(2)}s`;

    this.sliderStart.max = duration;
    this.sliderStart.value = 0;
    this.sliderEnd.max = duration;
    // Default initial clip: first 3.0s or total duration if shorter
    const initEnd = Math.min(3.0, duration);
    this.sliderEnd.value = initEnd;

    this.updateRangeValues(0, initEnd, duration, width, height);
  }

  updateTimeDisplay(curTime) {
    this.currentTimeDisplay.textContent = `${curTime.toFixed(2)}s`;
    this.seekSlider.value = curTime;
  }

  updateRangeValues(start, end, duration, origW, origH) {
    this.startTimeVal.textContent = `${start.toFixed(1)}s`;
    this.endTimeVal.textContent = `${end.toFixed(1)}s`;

    const clipLen = Math.max(0, end - start);
    this.clipDurationDisplay.textContent = `${clipLen.toFixed(1)}秒`;

    if (clipLen > SETTINGS.MAX_CLIP_SECONDS) {
      this.clipDurationWarning.classList.remove('is-hidden');
      this.clipDurationWarning.textContent = `（容量爆発防止のため${SETTINGS.MAX_CLIP_SECONDS}秒以内に調整してください）`;
      this.btnGenerateGif.disabled = true;
    } else if (clipLen < SETTINGS.MIN_CLIP_SECONDS) {
      this.clipDurationWarning.classList.remove('is-hidden');
      this.clipDurationWarning.textContent = `（${SETTINGS.MIN_CLIP_SECONDS}秒以上の範囲を指定してください）`;
      this.btnGenerateGif.disabled = true;
    } else {
      this.clipDurationWarning.classList.add('is-hidden');
      this.btnGenerateGif.disabled = false;
    }

    this.updateCalculatedEstimates(clipLen, origW, origH);
  }

  getSettings() {
    const selectedRes = Number(document.querySelector('input[name="res-preset"]:checked')?.value || SETTINGS.DEFAULT_RESOLUTION);
    const selectedFps = Number(document.querySelector('input[name="fps-preset"]:checked')?.value || SETTINGS.DEFAULT_FPS);
    return {
      maxSide: selectedRes,
      fps: selectedFps
    };
  }

  updateCalculatedEstimates(clipDuration, origW, origH) {
    const { maxSide, fps } = this.getSettings();

    const { width, height } = calculateDimensions(origW, origH, maxSide);
    this.calcOutputResolution.textContent = `${width} × ${height} px`;

    const frames = Math.max(1, Math.round(clipDuration * fps));
    this.calcTotalFrames.textContent = `約 ${frames} フレーム`;
  }

  updateProgress(stageTitle, current, total, percentage) {
    this.progressTitle.textContent = stageTitle;
    this.progressDetail.textContent = `${current} / ${total} フレーム (${Math.round(percentage)}%)`;
    this.progressBarFill.style.width = `${Math.min(100, Math.max(0, percentage))}%`;
  }

  displayResult({ blob, blobUrl, width, height, fps, totalFrames, filename }) {
    this.gifPreviewImage.src = blobUrl;

    const sizeBytes = blob.size;
    const sizeMB = sizeBytes / (1024 * 1024);
    const sizeKB = sizeBytes / 1024;
    const sizeText = sizeMB >= 1.0 ? `${sizeMB.toFixed(2)} MB` : `${sizeKB.toFixed(0)} KB`;
    this.resultFilesize.textContent = sizeText;

    this.resultDimensions.textContent = `${width} × ${height} px`;
    this.resultFps.textContent = `${fps} fps`;
    this.resultFrames.textContent = `${totalFrames} フレーム`;

    // Capacity Zone Evaluation (< 3MB = Green, 3-5MB = Yellow, > 5MB = Red)
    this.sizeZoneBadge.className = 'zone-badge';
    if (sizeMB < 3.0) {
      this.sizeZoneBadge.classList.add('zone-green');
      this.zoneBadgeText.textContent = '🟢 軽量 (チャット共有に最適)';
      this.zoneGuidanceText.textContent = 'Slack / Discord等のチャットで快適にインライン送受信できます。';
    } else if (sizeMB <= 5.0) {
      this.sizeZoneBadge.classList.add('zone-yellow');
      this.zoneBadgeText.textContent = '🟡 標準 (Web・ブログ向け)';
      this.zoneGuidanceText.textContent = 'ブログ・Webページ掲載に十分適したサイズです。';
    } else {
      this.sizeZoneBadge.classList.add('zone-red');
      this.zoneBadgeText.textContent = '🔴 容量注意 (ファイルサイズ大)';
      this.zoneGuidanceText.textContent = 'チャット送信時に制限にかかる可能性があります。時間を短くするか解像度・FPSの引き下げを推奨します。';
    }

    // Download button link & filename
    const baseName = filename.replace(/\.[^/.]+$/, '');
    const outName = `${baseName}_clip.gif`;
    this.btnDownloadGif.href = blobUrl;
    this.btnDownloadGif.setAttribute('download', outName);

    this.showResult();
  }
}
