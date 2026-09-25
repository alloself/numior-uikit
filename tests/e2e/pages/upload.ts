import type { Locator, Page } from '@playwright/test';

export interface UploadDocumentOutput {
  readonly name: string;
  readonly status: string;
  readonly progress: number;
  readonly result: string | null;
  readonly error: string | null;
}

export interface UploadImageOutput {
  readonly name: string;
  readonly status: string;
}

export interface UploadOutput {
  readonly documents: UploadDocumentOutput[];
  readonly images: UploadImageOutput[];
  readonly rejections: string[];
}

export interface FakeFile {
  readonly name: string;
  readonly mimeType: string;
  readonly size?: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isString = (value: unknown): value is string => typeof value === 'string';
const isNumber = (value: unknown): value is number => typeof value === 'number';

const isNullableString = (value: unknown): value is string | null =>
  value === null || typeof value === 'string';

const isDocument = (value: unknown): value is UploadDocumentOutput =>
  isRecord(value) &&
  isString(value.name) &&
  isString(value.status) &&
  isNumber(value.progress) &&
  isNullableString(value.result) &&
  isNullableString(value.error);

const isImage = (value: unknown): value is UploadImageOutput =>
  isRecord(value) && isString(value.name) && isString(value.status);

const listOf = <T>(value: unknown, guard: (entry: unknown) => entry is T, key: string): T[] => {
  if (!Array.isArray(value) || !value.every(guard)) {
    throw new Error(`Unexpected ${key} in upload output`);
  }

  return value;
};

const parseUploadOutput = (text: string): UploadOutput => {
  const data: unknown = JSON.parse(text);

  if (!isRecord(data)) {
    throw new Error('Upload output is not an object');
  }

  return {
    documents: listOf(data.documents, isDocument, 'documents'),
    images: listOf(data.images, isImage, 'images'),
    rejections: listOf(data.rejections, isString, 'rejections'),
  };
};

const UPLOAD_ROOT =
  'xpath=ancestor::*[contains(concat(" ", normalize-space(@class), " "), " nui-upload ")][1]';

const payload = (file: FakeFile) => ({
  name: file.name,
  mimeType: file.mimeType,
  buffer: Buffer.alloc(file.size ?? 16, 1),
});

export class UploadSection {
  readonly documents: Locator;
  readonly images: Locator;
  readonly failToggle: Locator;
  readonly dropToggle: Locator;
  readonly output: Locator;

  constructor(private readonly page: Page) {
    this.documents = page.getByTestId('upload-documents').locator(UPLOAD_ROOT);
    this.images = page.getByTestId('upload-images').locator(UPLOAD_ROOT);
    this.failToggle = page.getByTestId('upload-fail-toggle');
    this.dropToggle = page.getByTestId('upload-drop-toggle');
    this.output = page.getByTestId('upload-output');
  }

  zone(scope: Locator): Locator {
    return scope.locator('.nui-upload__zone');
  }

  browse(scope: Locator): Locator {
    return scope.locator('.nui-upload__browse');
  }

  row(scope: Locator, name: string): Locator {
    return scope.locator('.nui-upload-item').filter({ hasText: name });
  }

  action(scope: Locator, name: string, label: string): Locator {
    return this.row(scope, name).getByRole('button', { name: label });
  }

  description(scope: Locator, name: string): Locator {
    return this.row(scope, name).locator('.nui-row__description');
  }

  thumbnail(scope: Locator, name: string): Locator {
    return this.row(scope, name).locator('img');
  }

  async choose(scope: Locator, ...files: FakeFile[]): Promise<void> {
    await scope.locator('input[type="file"]').setInputFiles(files.map(payload));
  }

  async drop(scope: Locator, ...files: FakeFile[]): Promise<void> {
    const handle = await this.page.evaluateHandle(
      (entries) => {
        const transfer = new DataTransfer();

        for (const entry of entries) {
          transfer.items.add(
            new File([new Uint8Array(entry.size)], entry.name, { type: entry.mimeType }),
          );
        }

        return transfer;
      },
      files.map((file) => ({ name: file.name, mimeType: file.mimeType, size: file.size ?? 16 })),
    );

    const zone = this.zone(scope);
    await zone.dispatchEvent('dragenter', { dataTransfer: handle });
    await zone.dispatchEvent('dragover', { dataTransfer: handle });
    await zone.dispatchEvent('drop', { dataTransfer: handle });
  }

  async dragOver(scope: Locator): Promise<void> {
    const handle = await this.page.evaluateHandle(() => {
      const transfer = new DataTransfer();
      transfer.items.add(new File(['x'], 'hover.txt', { type: 'text/plain' }));
      return transfer;
    });

    await this.zone(scope).dispatchEvent('dragenter', { dataTransfer: handle });
  }

  async dragLeave(scope: Locator): Promise<void> {
    await this.zone(scope).dispatchEvent('dragleave', {});
  }

  async readOutput(): Promise<UploadOutput> {
    return parseUploadOutput(await this.output.innerText());
  }
}
