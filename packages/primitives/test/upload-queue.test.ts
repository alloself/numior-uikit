import { describe, expect, it } from 'vitest';
import { UploadQueueHarness, fileOf } from './harness/upload';

describe('useUploadQueue', () => {
  it('uploads added files up to the concurrency limit and continues as uploads settle', async () => {
    const queue = UploadQueueHarness.mount({ concurrency: 2 });
    const created = queue.add('a.txt', 'b.txt', 'c.txt');

    expect(created.map((item) => item.name)).toEqual(['a.txt', 'b.txt', 'c.txt']);
    expect(queue.statuses).toEqual(['uploading', 'uploading', 'queued']);
    expect(queue.calls.map((call) => call.file.name)).toEqual(['a.txt', 'b.txt']);
    expect(queue.busy).toBe(true);
    await queue.progress(0, 0.5);
    expect(queue.item('a.txt')).toMatchObject({ status: 'uploading', progress: 0.5 });
    await queue.progress(0, 7);
    expect(queue.item('a.txt')).toMatchObject({ status: 'uploading', progress: 1 });
    queue.calls[0]?.resolve('ok');
    await queue.flush();
    expect(queue.item('a.txt')).toEqual(expect.objectContaining({ status: 'done', result: 'ok' }));
    expect(queue.item('a.txt')).not.toHaveProperty('progress');
    expect(queue.calls.map((call) => call.file.name)).toEqual(['a.txt', 'b.txt', 'c.txt']);
    expect(queue.settled).toEqual(['done:a.txt']);
    queue.calls[1]?.reject(new Error('boom'));
    await queue.flush();

    expect(queue.item('b.txt')).toMatchObject({
      status: 'error',
      error: { reason: 'upload', message: 'boom' },
    });

    expect(queue.settled).toEqual(['done:a.txt', 'error:b.txt']);
    queue.calls[2]?.resolve('ok');
    await queue.flush();
    expect(queue.busy).toBe(false);
    queue.unmount();
  });

  it('folds the progress reports of one frame into a single model write with the latest value', async () => {
    const queue = UploadQueueHarness.mount({ concurrency: 2 });
    queue.add('a.txt', 'b.txt');

    const before = queue.modelWrites;

    await queue.progressBurst(0, [0.1, 0.2, 0.3]);

    expect(queue.modelWrites - before).toBe(1);
    expect(queue.item('a.txt')).toMatchObject({ status: 'uploading', progress: 0.3 });
    expect(queue.item('b.txt')).toMatchObject({ status: 'uploading', progress: 0 });
    queue.unmount();
  });

  it('retries failed uploads, removes items and aborts a running upload on removal', async () => {
    const queue = UploadQueueHarness.mount({ concurrency: 1 });
    queue.add('a.txt', 'b.txt');
    queue.calls[0]?.reject('offline');
    await queue.flush();

    expect(queue.item('a.txt')).toMatchObject({
      status: 'error',
      error: { reason: 'upload', message: 'offline' },
    });

    expect(queue.item('b.txt').status).toBe('uploading');
    queue.queue.retry(queue.item('a.txt').id);
    expect(queue.item('a.txt').status).toBe('queued');
    expect(queue.item('a.txt')).not.toHaveProperty('error');
    queue.queue.remove(queue.item('b.txt').id);
    expect(queue.calls[1]?.context.signal.aborted).toBe(true);
    expect(queue.items.map((item) => item.name)).toEqual(['a.txt']);
    expect(queue.item('a.txt').status).toBe('uploading');
    expect(queue.calls).toHaveLength(3);
    queue.calls[2]?.resolve('again');
    await queue.flush();
    expect(queue.item('a.txt')).toMatchObject({ status: 'done', result: 'again' });
    expect(queue.settled).toEqual(['error:a.txt', 'done:a.txt']);
    queue.unmount();
  });

  it('waits for start when auto is off and adopts an external replacement of the list', async () => {
    const queue = UploadQueueHarness.mount({ auto: false });
    queue.add('a.txt', 'b.txt');
    expect(queue.statuses).toEqual(['queued', 'queued']);
    expect(queue.calls).toHaveLength(0);
    queue.queue.start();
    expect(queue.statuses).toEqual(['uploading', 'uploading']);
    queue.replace([]);
    await queue.flush();
    expect(queue.calls.every((call) => call.context.signal.aborted)).toBe(true);
    queue.calls[0]?.resolve('late');
    await queue.flush();
    expect(queue.items).toEqual([]);
    expect(queue.settled).toEqual([]);
    queue.unmount();
  });

  it('keeps its own view of the list while a controlled model flows back later', async () => {
    const queue = UploadQueueHarness.mount({ controlled: true, concurrency: 1 });
    queue.add('a.txt', 'b.txt');
    expect(queue.items).toEqual([]);
    expect(queue.calls.map((call) => call.file.name)).toEqual(['a.txt']);
    queue.commit();
    await queue.flush();
    expect(queue.statuses).toEqual(['uploading', 'queued']);
    queue.calls[0]?.resolve('ok');
    await queue.flush();
    queue.commit();
    await queue.flush();
    expect(queue.statuses).toEqual(['done', 'uploading']);
    expect(queue.calls).toHaveLength(2);
    queue.unmount();
  });

  it('keeps rejected entries in order as errors that never reach the adapter or retry', () => {
    const queue = UploadQueueHarness.mount();

    const items = queue.addEntries(
      { file: fileOf('big.bin'), error: { reason: 'size' } },
      { file: fileOf('ok.txt') },
    );

    expect(items.map((item) => [item.name, item.status])).toEqual([
      ['big.bin', 'error'],
      ['ok.txt', 'queued'],
    ]);

    expect(queue.item('big.bin')).toMatchObject({ status: 'error', error: { reason: 'size' } });
    expect(queue.calls.map((call) => call.file.name)).toEqual(['ok.txt']);
    queue.queue.retry(queue.item('big.bin').id);
    expect(queue.item('big.bin').status).toBe('error');
    expect(queue.calls).toHaveLength(1);
    queue.unmount();
  });

  it('aborts running uploads when the owning scope is disposed', () => {
    const queue = UploadQueueHarness.mount();
    queue.add('a.txt');
    queue.unmount();
    expect(queue.calls[0]?.context.signal.aborted).toBe(true);
  });
});
