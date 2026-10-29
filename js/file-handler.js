/**
 * FileHandler - Handles file drag & drop, selection, and initial validation.
 */
export class FileHandler {
  constructor({ dropZoneEl, fileInputEl, onFileSelected, onError }) {
    this.dropZoneEl = dropZoneEl;
    this.fileInputEl = fileInputEl;
    this.onFileSelected = onFileSelected;
    this.onError = onError;

    this.supportedExtensions = ['.mp4', '.mov', '.webm'];
    this.initEvents();
  }

  initEvents() {
    if (!this.dropZoneEl || !this.fileInputEl) return;

    // Click to open file dialog
    this.dropZoneEl.addEventListener('click', (e) => {
      // Don't trigger if the hidden file input was somehow clicked directly
      if (e.target !== this.fileInputEl) {
        this.fileInputEl.click();
      }
    });

    // Handle file input change
    this.fileInputEl.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) {
        this.processFile(file);
      }
      // Reset input so same file can be re-selected if needed
      this.fileInputEl.value = '';
    });

    // Drag & Drop events
    ['dragenter', 'dragover'].forEach((eventName) => {
      this.dropZoneEl.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.dropZoneEl.classList.add('drag-over');
      });
    });

    ['dragleave', 'drop'].forEach((eventName) => {
      this.dropZoneEl.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.dropZoneEl.classList.remove('drag-over');
      });
    });

    this.dropZoneEl.addEventListener('drop', (e) => {
      const file = e.dataTransfer?.files?.[0];
      if (file) {
        this.processFile(file);
      }
    });

    // Keyboard support (Enter or Space to trigger file selection)
    this.dropZoneEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.fileInputEl.click();
      }
    });
  }

  processFile(file) {
    const filename = file.name.toLowerCase();
    const isSupportedExt = this.supportedExtensions.some(ext => filename.endsWith(ext));

    // Extension must match supported types (.mp4, .mov, .webm)
    // If MIME type is provided by the browser, it must start with video/
    if (!isSupportedExt || (file.type && !file.type.startsWith('video/'))) {
      if (this.onError) {
        this.onError('対応形式（MP4 / MOV / WebM）の動画ファイルを選択してください。');
      }
      return;
    }

    if (this.onFileSelected) {
      this.onFileSelected(file);
    }
  }
}
