import type { NuiEditorUploadAdapter } from '../../src';

export interface FakeUpload {
  readonly file: File;
  readonly signal: AbortSignal;
  progress(fraction: number): void;
  finish(url: string): void;
  fail(message: string): void;
}

export class FakeUploads {
  readonly started: FakeUpload[] = [];

  readonly adapter: NuiEditorUploadAdapter = (file, context) =>
    new Promise((resolve, reject) => {
      this.started.push({
        file,
        signal: context.signal,
        progress: context.onProgress,
        finish: (url) => {
          resolve({ url });
        },
        fail: (message) => {
          reject(new Error(message));
        },
      });
    });

  of(name: string): FakeUpload {
    const found = this.started.findLast((upload) => upload.file.name === name);

    if (found === undefined) {
      throw new Error(`Nothing uploads ${name}`);
    }
    return found;
  }
}

export const fileOf = (name: string, type: string, size = 4): File =>
  new File(['x'.repeat(size)], name, { type });
