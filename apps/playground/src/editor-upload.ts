import type { NuiEditorUploadAdapter } from '@numior/editor-vue';

const STEPS = 10;

const STEP_MS = 150;

const FAIL_AT = 6;

const urlOf = (file: File): string =>
  file.type.startsWith('image/')
    ? URL.createObjectURL(file)
    : `https://files.numior.test/${encodeURIComponent(file.name)}`;

export const fakeUpload =
  (failing: () => boolean): NuiEditorUploadAdapter =>
  (file, { onProgress, signal }) =>
    new Promise((resolve, reject) => {
      let done = 0;

      const timer = setInterval(() => {
        done += 1;
        onProgress(done / STEPS);
        if (failing() && done === FAIL_AT) {
          clearInterval(timer);
          reject(new Error('Сервер не ответил'));
        } else if (done === STEPS) {
          clearInterval(timer);
          resolve({ url: urlOf(file) });
        }
      }, STEP_MS);

      signal.addEventListener('abort', () => {
        clearInterval(timer);
        reject(new DOMException('Upload cancelled', 'AbortError'));
      });
    });
