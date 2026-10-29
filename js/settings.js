/**
 * Settings & Constants for ClipToGif
 */
export const SETTINGS = {
  MIN_CLIP_SECONDS: 0.5,
  MAX_CLIP_SECONDS: 10.0,
  DEFAULT_RESOLUTION: 480,
  DEFAULT_FPS: 10,
  DEFAULT_WORKERS: 2,
  DEFAULT_QUALITY: 10,
  DEFAULT_WORKER_SCRIPT: 'lib/gif.worker.js'
};

export const RESOLUTION_PRESETS = [
  { value: 320, label: 'チャット用', desc: '長辺 320px (最軽量)' },
  { value: 480, label: 'ブログ用', desc: '長辺 480px (標準)', isDefault: true },
  { value: 640, label: '高画質', desc: '長辺 640px (容量注意)' }
];

export const FPS_PRESETS = [
  { value: 10, label: '10 FPS', desc: '軽量・滑らかバランス', isDefault: true },
  { value: 15, label: '15 FPS', desc: '滑らかさ重視 (容量増)' }
];
