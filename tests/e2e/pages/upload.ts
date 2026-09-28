import type { Locator, Page } from '@playwright/test';
import {
  isNumber,
  isString,
  listOf,
  nullable,
  parseAs,
  shapeOf,
  type Guarded,
} from '../../../packages/primitives/test/support/guards';

const isDocument = shapeOf({
  name: isString,
  status: isString,
  progress: isNumber,
  result: nullable(isString),
  error: nullable(isString),
});

const isImage = shapeOf({ name: isString, status: isString });

const isUploadOutput = shapeOf({
  documents: listOf(isDocument),
  images: listOf(isImage),
  report: listOf(isImage),
  avatar: nullable(isImage),
  rejections: listOf(isString),
});

export type UploadDocumentOutput = Guarded<typeof isDocument>;

export type UploadImageOutput = Guarded<typeof isImage>;

export type UploadOutput = Guarded<typeof isUploadOutput>;

const parseUploadOutput = (text: string): UploadOutput =>
  parseAs(text, isUploadOutput, 'upload output');

export interface FakeFile {
  readonly name: string;
  readonly mimeType: string;
  readonly size?: number;
  readonly image?: boolean;
}

const UPLOAD_ROOT =
  'xpath=ancestor::*[contains(concat(" ", normalize-space(@class), " "), " nui-upload ")][1]';

const AVATAR_ROOT =
  'xpath=ancestor::*[contains(concat(" ", normalize-space(@class), " "), " nui-avatar-upload ")][1]';

const PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

const payload = (file: FakeFile) => ({
  name: file.name,
  mimeType: file.mimeType,
  buffer: file.image === true ? PIXEL_PNG : Buffer.alloc(file.size ?? 16, 1),
});

export class UploadSection {
  readonly documents: Locator;
  readonly images: Locator;
  readonly report: Locator;
  readonly avatar: Locator;
  readonly failToggle: Locator;
  readonly dropToggle: Locator;
  readonly output: Locator;

  constructor(private readonly page: Page) {
    this.documents = page.getByTestId('upload-documents').locator(UPLOAD_ROOT);
    this.images = page.getByTestId('upload-images').locator(UPLOAD_ROOT);
    this.report = page.getByTestId('upload-button').locator(UPLOAD_ROOT);
    this.avatar = page.getByTestId('upload-avatar').locator(AVATAR_ROOT);
    this.failToggle = page.getByTestId('upload-fail-toggle');
    this.dropToggle = page.getByTestId('upload-drop-toggle');
    this.output = page.getByTestId('upload-output');
  }

  zone(scope: Locator): Locator {
    return scope.locator('.nui-upload__zone');
  }

  get avatarTrigger(): Locator {
    return this.avatar.locator('.nui-avatar-upload__trigger');
  }

  get avatarImage(): Locator {
    return this.avatar.locator('img');
  }

  get avatarInitials(): Locator {
    return this.avatar.locator('.nui-avatar__initials');
  }

  get avatarRemove(): Locator {
    return this.avatar.getByRole('button', { name: 'Удалить изображение' });
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
