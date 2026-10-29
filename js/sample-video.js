/**
 * SampleVideoGenerator - Generates a synthetic test video completely in-browser
 * using Canvas and MediaRecorder. Allows one-click testing without user video upload.
 */
export class SampleVideoGenerator {
  static createSampleVideoFile() {
    return new Promise((resolve, reject) => {
      if (!window.MediaRecorder) {
        return reject(new Error('MediaRecorder is not supported in this browser.'));
      }

      const canvas = document.createElement('canvas');
      canvas.width = 360;
      canvas.height = 640; // 9:16 Portrait
      const ctx = canvas.getContext('2d');

      const stream = canvas.captureStream(20);
      const mimeType = MediaRecorder.isTypeSupported('video/mp4') ? 'video/mp4' : 'video/webm';
      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks = [];

      let timer = null;

      recorder.onerror = (e) => {
        if (timer) clearInterval(timer);
        reject(new Error('Sample video recording failed: ' + (e.error?.message || 'Unknown recorder error')));
      };

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        if (timer) clearInterval(timer);
        const blob = new Blob(chunks, { type: mimeType });
        const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
        const file = new File([blob], `sample_portrait.${ext}`, { type: mimeType });
        resolve(file);
      };

      recorder.start();

      let frame = 0;
      const totalFrames = 40; // 2.0s at 20fps
      timer = setInterval(() => {
        frame++;
        // Background
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Center card
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2;
        ctx.roundRect ? ctx.roundRect(40, 100, 280, 440, 16) : ctx.rect(40, 100, 280, 440);
        ctx.fill();
        ctx.stroke();

        // Animated bouncing sphere
        const cx = 180 + Math.sin(frame * 0.2) * 80;
        const cy = 320 + Math.cos(frame * 0.2) * 120;
        ctx.beginPath();
        ctx.arc(cx, cy, 28, 0, Math.PI * 2);
        ctx.fillStyle = '#6366f1';
        ctx.shadowColor = '#6366f1';
        ctx.shadowBlur = 15;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Overlay text
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 22px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('ClipToGif Sample', 180, 160);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '14px Inter, sans-serif';
        ctx.fillText('Portrait 9:16 Demo', 180, 190);

        ctx.fillStyle = '#10b981';
        ctx.font = 'bold 18px JetBrains Mono, monospace';
        const sec = (frame / 20).toFixed(1);
        ctx.fillText(`${sec}s / 2.0s`, 180, 480);

        if (frame >= totalFrames) {
          clearInterval(timer);
          recorder.stop();
        }
      }, 50);
    });
  }
}
