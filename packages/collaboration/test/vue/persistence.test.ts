import { describe, expect, it } from 'vite-plus/test';
import { ClientMessageKind, type CollabAlternative } from '../../src';
import { createPersistenceDriver, headingSnapshot, snapshotOfFixture } from './persistence-driver';

const RESTORED = {
  clientId: 'saved',
  version: 5,
  snapshot: snapshotOfFixture(),
  pending: [],
  alternatives: [],
};

const LOST: CollabAlternative = {
  version: 3,
  nodeId: 'title',
  attr: 'level',
  value: 3,
  clientId: 'other',
  author: undefined,
  createdAt: '2026-11-09T10:00:00.000Z',
};

describe('useCollabEditor with persistence', () => {
  it('connects at once when nothing was saved', async () => {
    const driver = createPersistenceDriver(undefined);

    await driver.loaded();

    expect(driver.opened()).toBe(1);
    expect(driver.collab().ready.value).toBe(false);
  });

  it('shows the saved document before any connection', async () => {
    const driver = createPersistenceDriver(RESTORED);

    await driver.loaded();

    expect(driver.collab().ready.value).toBe(true);
    expect(driver.opened()).toBe(0);
  });

  it('says hello with the saved version and client once the editor is there', async () => {
    const driver = createPersistenceDriver(RESTORED);

    await driver.loaded();
    await driver.mountEditor();

    expect(driver.sent().at(0)).toMatchObject({
      kind: ClientMessageKind.Hello,
      clientId: 'saved',
      version: 5,
    });
  });

  it('falls back to the server when the saved document cannot be read', async () => {
    const driver = createPersistenceDriver({ ...RESTORED, snapshot: { root: 'nothing' } });

    await driver.loaded();

    expect(driver.collab().ready.value).toBe(false);
    expect(driver.opened()).toBe(1);
  });

  it('brings saved overwritten values back with the document', async () => {
    const driver = createPersistenceDriver({ ...RESTORED, alternatives: [LOST] });

    await driver.loaded();

    expect(driver.collab().alternatives.list.value).toEqual([LOST]);
  });

  it('puts a value back into the node it came from and forgets it', async () => {
    const driver = createPersistenceDriver({
      ...RESTORED,
      snapshot: headingSnapshot(),
      alternatives: [LOST],
    });

    await driver.loaded();
    await driver.mountEditor();
    driver.putBack(LOST);

    expect(driver.headingLevel()).toBe(3);
    expect(driver.collab().alternatives.list.value).toEqual([]);
    expect(driver.forgotten()).toEqual([LOST]);
  });

  it('forgets a value whose node is gone', async () => {
    const stray = { ...LOST, nodeId: 'gone' };

    const driver = createPersistenceDriver({
      ...RESTORED,
      snapshot: headingSnapshot(),
      alternatives: [stray],
    });

    await driver.loaded();
    await driver.mountEditor();
    driver.putBack(stray);

    expect(driver.headingLevel()).toBe(1);
    expect(driver.collab().alternatives.list.value).toEqual([]);
  });

  it('releases the storage on unmount', async () => {
    const driver = createPersistenceDriver(undefined);

    await driver.loaded();
    driver.unmount();

    expect(driver.closed()).toBe(1);
  });
});
