import { describe, expect, it } from 'vitest';
import { UploadDriver, fileOf } from './drivers/upload';
import { fieldTextsOf } from './support/field-texts';

describe('NuiUpload', () => {
  it('queues chosen files, uploads up to the concurrency limit and reports progress and results', async () => {
    const upload = UploadDriver.mount({ props: { concurrency: 2 } });
    await upload.addFiles(fileOf('a.txt', 1536), fileOf('b.txt'), fileOf('c.txt'));
    expect(upload.names).toEqual(['a.txt', 'b.txt', 'c.txt']);
    expect(upload.statuses).toEqual(['uploading', 'uploading', 'queued']);
    expect(upload.hasModifier('busy')).toBe(true);
    expect(upload.calls.map((call) => call.file.name)).toEqual(['a.txt', 'b.txt']);
    expect(upload.description('a.txt')).toBe('1.5 kB');
    expect(upload.actions('a.txt')).toEqual(['Cancel upload']);
    await upload.progress(0, 0.4);
    expect(upload.progressValue('a.txt')).toBe('40');
    await upload.resolve(0, 'stored');
    expect(upload.item('a.txt')).toMatchObject({ status: 'done', result: 'stored' });
    expect(upload.progressValue('a.txt')).toBeUndefined();
    expect(upload.actions('a.txt')).toEqual(['Remove']);
    expect(upload.statuses).toEqual(['done', 'uploading', 'uploading']);
    expect(upload.liveText).toBe('a.txt: Uploaded');
    expect(upload.events).toEqual(['done:a.txt']);
    upload.unmount();
  });

  it('shows adapter errors with a retry, and cancelling removes the item and aborts its request', async () => {
    const upload = UploadDriver.mount({ props: { concurrency: 1 } });
    await upload.addFiles(fileOf('a.txt'), fileOf('b.txt'));
    await upload.fail(0, new Error('Server is down'));
    expect(upload.rowStatusModifier('a.txt')).toBe('nui-upload-item--status-error');
    expect(upload.description('a.txt')).toBe('Server is down');
    expect(upload.actions('a.txt')).toEqual(['Retry', 'Remove']);
    expect(upload.liveText).toBe('a.txt: Server is down');
    expect(upload.statuses).toEqual(['error', 'uploading']);
    await upload.clickCancel('b.txt');
    expect(upload.aborted(1)).toBe(true);
    expect(upload.names).toEqual(['a.txt']);
    await upload.clickRetry('a.txt');
    expect(upload.statuses).toEqual(['uploading']);
    expect(upload.calls).toHaveLength(3);
    await upload.resolve(2, 'ok');
    expect(upload.statuses).toEqual(['done']);
    expect(upload.events).toEqual(['error:a.txt', 'remove:b.txt', 'done:a.txt']);
    upload.unmount();
  });

  it('lists rejected files with a reason or drops them, and always emits reject', async () => {
    const listed = UploadDriver.mount({
      props: { accept: '.txt,image/*', maxSize: 1024, maxFiles: 1 },
    });

    await listed.dropFiles(
      fileOf('big.txt', 4096),
      fileOf('clip.mp4', 3, 'video/mp4'),
      fileOf('ok.txt'),
      fileOf('extra.txt'),
    );

    expect(listed.names).toEqual(['big.txt', 'clip.mp4', 'ok.txt', 'extra.txt']);
    expect(listed.statuses).toEqual(['error', 'error', 'uploading', 'error']);
    expect(listed.description('big.txt')).toBe('Larger than 1 kB');
    expect(listed.description('clip.mp4')).toBe('Unsupported file type');
    expect(listed.description('extra.txt')).toBe('More than 1 file');
    expect(listed.actions('big.txt')).toEqual(['Remove']);
    expect(listed.calls).toHaveLength(1);
    expect(listed.events).toEqual(['reject:big.txt,clip.mp4,extra.txt']);
    listed.unmount();

    const dropped = UploadDriver.mount({
      props: {
        rejected: 'drop',
        validate: (file) => (file.name.startsWith('draft') ? 'Drafts stay local' : undefined),
      },
    });

    await dropped.addFiles(fileOf('draft.txt'), fileOf('final.txt'));
    expect(dropped.names).toEqual(['final.txt']);
    expect(dropped.events).toEqual(['reject:draft.txt']);
    dropped.unmount();
  });

  it('waits for start when auto is off, replaces the file in single mode and removes finished items', async () => {
    const manual = UploadDriver.mount({ props: { auto: false } });
    await manual.addFiles(fileOf('a.txt'), fileOf('b.txt'));
    expect(manual.statuses).toEqual(['queued', 'queued']);
    expect(manual.calls).toHaveLength(0);
    await manual.start();
    expect(manual.statuses).toEqual(['uploading', 'uploading']);
    await manual.resolve(0, 'ok');
    await manual.clickRemove('a.txt');
    expect(manual.names).toEqual(['b.txt']);
    expect(manual.events).toEqual(['done:a.txt', 'remove:a.txt']);
    manual.unmount();

    const single = UploadDriver.mount({ props: { multiple: false } });
    expect(single.input.attributes('multiple')).toBeUndefined();
    await single.addFiles(fileOf('first.txt'));
    await single.addFiles(fileOf('second.txt'), fileOf('third.txt'));
    expect(single.names).toEqual(['second.txt', 'third.txt']);
    expect(single.statuses).toEqual(['uploading', 'error']);
    expect(single.aborted(0)).toBe(true);
    single.unmount();
  });

  it('shows thumbnails for images, keeps remote urls for existing files and revokes object urls', async () => {
    const upload = UploadDriver.mount({
      props: { layout: 'grid' },
      modelValue: [
        {
          id: 'remote-1',
          name: 'cover.jpg',
          size: 2048,
          type: 'image/jpeg',
          status: 'done',
          url: 'https://cdn.example/cover.jpg',
        },
        {
          id: 'remote-2',
          name: 'report.pdf',
          size: 4096,
          type: 'application/pdf',
          status: 'done',
          url: 'https://cdn.example/report.pdf',
        },
      ],
    });

    expect(upload.hasModifier('layout-grid')).toBe(true);
    expect(upload.thumb('cover.jpg')).toBe('https://cdn.example/cover.jpg');
    expect(upload.thumb('report.pdf')).toBeUndefined();
    expect(upload.actions('cover.jpg')).toEqual(['Remove']);
    await upload.addFiles(fileOf('shot.png', 10, 'image/png'), fileOf('notes.txt'));
    expect(upload.thumb('shot.png')).toBe('blob:mock-1');
    expect(upload.thumb('notes.txt')).toBeUndefined();
    expect(upload.actions('shot.png')).toEqual(['Cancel upload']);
    await upload.resolve(0, 'ok');
    await upload.clickRemove('shot.png');
    expect(upload.urls.revoked).toEqual(['blob:mock-1']);
    await upload.addFiles(fileOf('again.png', 10, 'image/png'));
    upload.unmount();
    expect(upload.urls.revoked).toEqual(['blob:mock-1', 'blob:mock-2']);
  });

  it('opens the dialog from the zone or the button, tracks dragging and wires the field', async () => {
    const upload = UploadDriver.mount({
      field: { label: 'Attachments', description: 'PDF up to 1 MB', invalid: true },
    });

    const labelFor = upload.wrapper.find('label').attributes('for');
    expect(upload.browse.attributes('id')).toBe(labelFor);
    expect(upload.browse.attributes('aria-describedby')).toBeTruthy();
    expect(upload.browse.attributes('aria-invalid')).toBe('true');
    expect(upload.hasModifier('invalid')).toBe(true);
    await upload.clickZone();
    await upload.clickBrowse();
    expect(upload.openCount).toBe(2);
    await upload.dragEnter();
    expect(upload.hasModifier('dragging')).toBe(true);
    await upload.dragLeave();
    expect(upload.hasModifier('dragging')).toBe(false);
    upload.unmount();

    const disabled = UploadDriver.mount({ props: { disabled: true } });
    expect(disabled.hasModifier('disabled')).toBe(true);
    await disabled.clickZone();
    disabled.open();
    expect(disabled.openCount).toBe(0);
    await disabled.dropFiles(fileOf('a.txt'));
    expect(disabled.names).toEqual([]);
    disabled.unmount();
  });

  it('speaks the configured language for the zone, actions, rejections and announcements', async () => {
    const upload = UploadDriver.mount({
      props: { accept: '.txt', maxSize: 1024, maxFiles: 2 },
      config: { locale: 'ru-RU' },
    });

    expect(upload.zone.text()).toContain('Перетащите файлы сюда');
    expect(upload.browse.text()).toBe('Выбрать файлы');

    await upload.dropFiles(
      fileOf('big.txt', 4096),
      fileOf('clip.mp4', 3, 'video/mp4'),
      fileOf('a.txt'),
      fileOf('b.txt'),
      fileOf('c.txt'),
    );

    expect(upload.description('big.txt')).toBe('Файл больше 1 кБ');
    expect(upload.description('clip.mp4')).toBe('Неподдерживаемый тип файла');
    expect(upload.description('c.txt')).toBe('Не больше 2 файлов');
    expect(upload.actions('big.txt')).toEqual(['Удалить']);
    await upload.resolve(0, 'ok');
    expect(upload.liveText).toBe('a.txt: Загружено');
    upload.unmount();
  });

  it('renders its own label, description and error and links them to the control', () => {
    const control = UploadDriver.mount({
      props: { label: 'Имя', description: 'Подсказка', error: 'Ошибка' },
    });

    expect(fieldTextsOf(control.wrapper)).toEqual({
      label: 'Имя',
      description: 'Подсказка',
      error: 'Ошибка',
      linked: true,
      group: false,
    });
  });

  it('keeps the chosen file when a single-mode replacement is rejected and blocks removal while disabled', async () => {
    const single = UploadDriver.mount({
      modelValue: [{ id: 'one', name: 'old.txt', type: 'text/plain', size: 10, status: 'done' }],
      props: { multiple: false, accept: '.txt', rejected: 'drop', auto: false },
    });

    await single.addFiles(fileOf('bad.exe', 3, 'application/octet-stream'));
    expect(single.names).toEqual(['old.txt']);
    expect(single.events).toEqual(['reject:bad.exe']);
    await single.addFiles(fileOf('new.txt'));
    expect(single.names).toEqual(['new.txt']);
    single.unmount();

    const off = UploadDriver.mount({
      modelValue: [{ id: 'one', name: 'old.txt', type: 'text/plain', size: 10, status: 'done' }],
      props: { disabled: true },
    });

    expect(off.actionsDisabled('old.txt')).toBe(true);
    await off.clickRemove('old.txt');
    await off.removeById('one');
    expect(off.names).toEqual(['old.txt']);
    expect(off.events).toEqual([]);
    off.unmount();
  });

  it('neither picks nor accepts files while readonly', async () => {
    const upload = UploadDriver.mount({ props: { readonly: true } });
    expect(upload.hasModifier('readonly')).toBe(true);
    await upload.clickZone();
    upload.open();
    expect(upload.openCount).toBe(0);
    await upload.dropFiles(fileOf('a.txt'));
    expect(upload.names).toEqual([]);
    upload.unmount();
  });
});
