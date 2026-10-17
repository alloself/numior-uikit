import type { NuiEditorUploadAdapter } from '@numior/editor-vue';

const STEPS = 10;

const STEP_MS = 150;

const FAIL_AT = 6;

const dataUrlOf = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener('load', () => {
      resolve(typeof reader.result === 'string' ? reader.result : '');
    });

    reader.addEventListener('error', () => {
      reject(reader.error ?? new Error('The file cannot be read'));
    });

    reader.readAsDataURL(file);
  });

const urlOf = (file: File): Promise<string> =>
  file.type.startsWith('image/')
    ? dataUrlOf(file)
    : Promise.resolve(`https://files.numior.test/${encodeURIComponent(file.name)}`);

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

          void urlOf(file)
            .then((url) => {
              resolve({ url });
              return url;
            })
            .catch(reject);
        }
      }, STEP_MS);

      signal.addEventListener('abort', () => {
        clearInterval(timer);
        reject(new DOMException('Upload cancelled', 'AbortError'));
      });
    });
