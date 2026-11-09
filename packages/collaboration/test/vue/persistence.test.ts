import { describe, expect, it } from 'vite-plus/test';
import { ClientMessageKind } from '../../src';
import { createPersistenceDriver, snapshotOfFixture } from './persistence-driver';

const RESTORED = { clientId: 'saved', version: 5, snapshot: snapshotOfFixture(), pending: [] };

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

  it('releases the storage on unmount', async () => {
    const driver = createPersistenceDriver(undefined);

    await driver.loaded();
    driver.unmount();

    expect(driver.closed()).toBe(1);
  });
});
