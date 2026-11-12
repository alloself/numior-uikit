import { enableAutoUnmount, flushPromises, renderToString } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vite-plus/test';
import type { CollabAlternative, HistoryAdapter } from '../../src';
import { documentOf } from './comments-adapter';
import { fakeAlternatives, fakeHistoryAdapter, type StoredVersion } from './history-adapter';
import { ANN, HistoryDriver } from './history-driver';
import HistoryHost from './HistoryHost.vue';

const SECONDS = /\d:\d\d:\d\d/u;

const OLD: StoredVersion = {
  id: 'old',
  at: '2026-11-08T10:00:00.000Z',
  label: 'Draft',
  document: documentOf('first text'),
};

const NEW: StoredVersion = {
  id: 'new',
  at: '2026-11-09T10:00:00.000Z',
  label: 'Review',
  document: documentOf('first better text'),
};

const SAME: StoredVersion = { ...NEW, id: 'same', label: 'Same', document: OLD.document };

enableAutoUnmount(afterEach);

describe('NuiEditorHistory', () => {
  it('lists versions from the newest', async () => {
    const view = HistoryDriver.mount(fakeHistoryAdapter([OLD, NEW]));

    await view.loaded();

    expect(view.versions.map((text) => text.split('Ann')[0])).toEqual(['Review', 'Draft']);
  });

  it('dates versions to the minute, as comments are', async () => {
    const view = HistoryDriver.mount(fakeHistoryAdapter([OLD, NEW]));

    await view.loaded();

    expect(view.versions.filter((text) => SECONDS.test(text))).toEqual([]);
  });

  it('says that there are no versions yet', async () => {
    const view = HistoryDriver.mount(fakeHistoryAdapter());

    await view.loaded();

    expect(view.emptyShown).toBe(true);
  });

  it('saves the current document as a version', async () => {
    const adapter = fakeHistoryAdapter();
    const view = HistoryDriver.mount(adapter);

    await view.loaded();
    await view.press('Save version');

    expect(view.versions).toHaveLength(1);
    expect(adapter.saved()).toEqual([documentOf('current')]);
  });

  it('offers no saving without the adapter method', async () => {
    const adapter: HistoryAdapter = {
      versions: () => Promise.resolve([]),
      load: () => Promise.resolve(OLD.document),
    };

    const view = HistoryDriver.mount(adapter);

    await view.loaded();

    expect(view.canSave).toBe(false);
  });

  it('marks what a version changed against the previous one', async () => {
    const view = HistoryDriver.mount(fakeHistoryAdapter([OLD, NEW]));

    await view.loaded();
    await view.pick(0);

    expect(view.additions).toEqual(['better']);
  });

  it('shows the plain version with changes turned off', async () => {
    const view = HistoryDriver.mount(fakeHistoryAdapter([OLD, NEW]));

    await view.loaded();
    await view.pick(0);
    await view.toggleChanges();

    expect(view.additions).toEqual([]);
    expect(view.previewText).toBe('first better text');
  });

  it('shows the oldest version without marks', async () => {
    const view = HistoryDriver.mount(fakeHistoryAdapter([OLD, NEW]));

    await view.loaded();
    await view.pick(1);

    expect(view.previewText).toBe('first text');
    expect(view.additions).toEqual([]);
    expect(view.removals).toEqual([]);
  });

  it('says when a version changed nothing', async () => {
    const view = HistoryDriver.mount(fakeHistoryAdapter([OLD, SAME]));

    await view.loaded();
    await view.pick(0);

    expect(view.noChangesShown).toBe(true);
  });

  it('restores the version into the editor and closes the preview', async () => {
    const view = HistoryDriver.mount(fakeHistoryAdapter([OLD, NEW]));

    await view.loaded();
    await view.pick(1);
    await view.press('Restore this version');

    expect(view.editorText).toBe('first text');
    expect(view.previewShown).toBe(false);
  });

  it('closes the preview', async () => {
    const view = HistoryDriver.mount(fakeHistoryAdapter([OLD, NEW]));

    await view.loaded();
    await view.pick(0);
    await view.press('Close');

    expect(view.previewShown).toBe(false);
  });

  it('shows a skeleton while the version travels', async () => {
    const adapter = fakeHistoryAdapter([OLD, NEW]);
    const release = adapter.holdLoad('new');
    const view = HistoryDriver.mount(adapter);

    await view.loaded();
    await view.pickWithoutWaiting(0);

    expect(view.loadingShown).toBe(true);

    release();
    await flushPromises();

    expect(view.loadingShown).toBe(false);
  });

  it('ignores a version picked before another one', async () => {
    const adapter = fakeHistoryAdapter([OLD, NEW]);
    const release = adapter.holdLoad('new');
    const view = HistoryDriver.mount(adapter);

    await view.loaded();
    await view.pickWithoutWaiting(0);
    await view.pick(1);

    release();
    await flushPromises();

    expect(view.previewText).toBe('first text');
  });

  it('reports a version that cannot be loaded', async () => {
    const adapter = fakeHistoryAdapter([OLD, NEW]);
    const view = HistoryDriver.mount(adapter);

    await view.loaded();
    adapter.failNextLoad();
    await view.pick(0);

    expect(view.failed).toBe(true);
    expect(view.previewShown).toBe(false);
  });

  it('prefers texts passed through labels', async () => {
    const view = HistoryDriver.mount(fakeHistoryAdapter(), { history: 'Versions' });

    await view.loaded();

    expect(view.title).toBe('Versions');
  });

  it('renders on the server', async () => {
    const html = await renderToString(HistoryHost, {
      props: { initial: documentOf('one'), adapter: fakeHistoryAdapter(), user: ANN },
    });

    expect(html).toContain('nui-collab-history');
  });
});

const LOST: CollabAlternative = {
  version: 3,
  nodeId: 'cell',
  attr: 'value',
  value: 'Boris',
  clientId: 'b',
  author: { id: 'b', name: 'Boris' },
  createdAt: '2026-11-09T10:00:00.000Z',
};

describe('NuiEditorHistory overwritten values', () => {
  it('shows the value and who wrote it', () => {
    const driver = HistoryDriver.mount(
      fakeHistoryAdapter([]),
      undefined,
      undefined,
      fakeAlternatives([LOST]),
    );

    expect(driver.overwritten).toHaveLength(1);
    expect(driver.overwritten[0]).toMatch(/^Boris \| Boris, /);
  });

  it('shows nothing while no value was overwritten', () => {
    const driver = HistoryDriver.mount(
      fakeHistoryAdapter([]),
      undefined,
      undefined,
      fakeAlternatives([]),
    );

    expect(driver.overwritten).toEqual([]);
  });

  it('names an empty value and an author who has left', () => {
    const driver = HistoryDriver.mount(
      fakeHistoryAdapter([]),
      undefined,
      undefined,
      fakeAlternatives([{ ...LOST, value: null, author: undefined }]),
    );

    expect(driver.overwritten[0]).toMatch(/^Empty \| Another participant, /);
  });

  it('puts the value back on request', async () => {
    const alternatives = fakeAlternatives([LOST]);
    const driver = HistoryDriver.mount(fakeHistoryAdapter([]), undefined, undefined, alternatives);

    await driver.press('Put back');

    expect(alternatives.applied()).toEqual([LOST]);
  });

  it('shows the node in the document', async () => {
    const alternatives = fakeAlternatives([LOST]);
    const driver = HistoryDriver.mount(fakeHistoryAdapter([]), undefined, undefined, alternatives);

    await driver.pressLabelled('Show in the document');

    expect(alternatives.revealed()).toEqual([LOST]);
  });

  it('hides a value without touching the document', async () => {
    const alternatives = fakeAlternatives([LOST]);
    const driver = HistoryDriver.mount(fakeHistoryAdapter([]), undefined, undefined, alternatives);

    await driver.pressLabelled('Hide');

    expect(driver.overwritten).toEqual([]);
    expect(alternatives.applied()).toEqual([]);
  });
});
