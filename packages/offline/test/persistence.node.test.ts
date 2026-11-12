import type { CollabAlternative } from '@numior/collaboration';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { createPersistenceDriver, insertedText, restoreBrowser } from './persistence-driver';

const LOST: CollabAlternative = {
  version: 3,
  nodeId: 'cell',
  attr: 'value',
  value: 'Борис',
  clientId: 'boris',
  author: { id: 'boris', name: 'Борис' },
  createdAt: '2026-11-09T10:00:00.000Z',
};

afterEach(restoreBrowser);

describe('offlinePersistence', () => {
  it('has nothing to restore for a new document', async () => {
    const driver = createPersistenceDriver();

    const first = await driver.session();

    expect(first.restored).toBeUndefined();
  });

  it('restores the document loaded from the server without anyone typing', async () => {
    const driver = createPersistenceDriver();
    const first = await driver.session();

    first.loadFromServer('Текст', 7);
    await first.restart();

    const second = await driver.session();

    expect(second.restored?.version).toBe(7);
    expect(second.restored?.clientId).toBe('me');
    expect(second.restored?.pending).toEqual([]);
  });

  it('restores steps nobody confirmed, under the same client id', async () => {
    const driver = createPersistenceDriver();
    const first = await driver.session('anna');

    first.loadFromServer('', 0);
    first.type('a', 1);
    first.type('b', 1);
    await first.restart();

    const second = await driver.session('other-session');

    expect(second.restored?.clientId).toBe('anna');
    expect(second.restored?.pending).toHaveLength(2);
    expect(second.restored?.version).toBe(0);
  });

  it('moves confirmed steps out of the queue and into the log', async () => {
    const driver = createPersistenceDriver();
    const first = await driver.session();

    first.loadFromServer('', 0);
    first.type('a', 1);
    first.type('b', 1);
    first.confirm(1);
    await first.restart();

    const second = await driver.session();

    expect(second.restored?.version).toBe(1);
    expect(second.restored?.pending).toHaveLength(1);
  });

  it('counts steps from other people in the restored version', async () => {
    const driver = createPersistenceDriver();
    const first = await driver.session();

    first.loadFromServer('', 0);
    first.receive(insertedText('x', 1));
    await first.restart();

    const second = await driver.session();

    expect(second.restored?.version).toBe(1);
    expect(second.restored?.snapshot).toMatchObject({ format: expect.any(Number) });
  });

  it('keeps overwritten values through a restart', async () => {
    const driver = createPersistenceDriver();
    const first = await driver.session();

    first.loadFromServer('', 0);
    first.tracking?.record([LOST]);
    await first.restart();

    const second = await driver.session();

    expect(second.restored?.alternatives).toEqual([LOST]);
  });

  it('forgets a value the user dismissed', async () => {
    const driver = createPersistenceDriver();
    const first = await driver.session();

    first.loadFromServer('', 0);
    first.tracking?.record([LOST]);
    await first.restart();

    const second = await driver.session();

    second.tracking?.forget(LOST);
    await second.restart();

    const third = await driver.session();

    expect(third.restored?.alternatives).toEqual([]);
  });

  it('leaves a second tab without storage while the first one owns it', async () => {
    const driver = createPersistenceDriver();
    const first = await driver.session();

    first.loadFromServer('', 0);

    const second = await driver.session();

    expect(second.restored).toBeUndefined();
    expect(second.tracking).toBeUndefined();
  });

  it('hands the storage over once the first tab closes', async () => {
    const driver = createPersistenceDriver();
    const first = await driver.session();

    first.loadFromServer('Текст', 3);
    await first.restart();

    const second = await driver.session();

    expect(second.tracking).toBeDefined();
    expect(second.restored?.version).toBe(3);
  });

  it('stores a change the browser refused to write together with the next one', async () => {
    const driver = createPersistenceDriver();
    const first = await driver.session();

    first.loadFromServer('', 0);
    await first.restart();

    const second = await driver.session();

    driver.refuseWrites(1);
    second.receive(insertedText('x', 1));
    await second.refused();

    second.type('a', 1);
    await second.restart();

    const third = await driver.session();

    expect(third.blocked).toBeUndefined();
    expect(third.restored?.version).toBe(1);
    expect(third.restored?.pending).toHaveLength(1);
  });

  it('says the copy is not being written and writes it again a second later', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });

    const driver = createPersistenceDriver();
    const first = await driver.session();

    first.loadFromServer('', 0);
    await first.restart();

    const second = await driver.session();

    driver.refuseWrites(1);
    second.receive(insertedText('x', 1));
    await second.refused();

    expect(second.states).toEqual(['kept', 'failing']);

    await second.keptAgain();
    await second.restart();

    const third = await driver.session();

    expect(second.states).toEqual(['kept', 'failing', 'kept']);
    expect(third.restored?.version).toBe(1);
  });

  it('closes while the browser keeps refusing and leaves the earlier copy readable', async () => {
    const driver = createPersistenceDriver();
    const first = await driver.session();

    first.loadFromServer('Текст', 3);
    await first.restart();

    const second = await driver.session();

    driver.refuseWrites(100);
    second.receive(insertedText('x', 1));
    await second.refused();
    await second.restart();

    driver.refuseWrites(0);

    const third = await driver.session();

    expect(third.blocked).toBeUndefined();
    expect(third.restored?.version).toBe(3);
  });

  it('keeps one writer among tabs of a browser without locks', async () => {
    const driver = createPersistenceDriver('channel');
    const first = await driver.session();

    first.loadFromServer('Текст', 3);

    const second = await driver.session();

    expect(first.states).toEqual(['kept']);
    expect(second.states).toEqual(['elsewhere']);
    expect(second.tracking).toBeUndefined();

    await first.restart();

    const third = await driver.session();

    expect(third.restored?.version).toBe(3);

    await third.restart();
  });

  it('lets one of two tabs opened at the same moment write', async () => {
    const driver = createPersistenceDriver('channel');

    const tabs = await Promise.all([driver.session(), driver.session(), driver.session()]);

    expect(tabs.filter((tab) => tab.tracking !== undefined)).toHaveLength(1);
    expect(tabs.filter((tab) => tab.states[0] === 'elsewhere')).toHaveLength(2);

    await Promise.all(tabs.map((tab) => tab.restart()));
  });

  it('keeps no copy in a browser that cannot tell its tabs apart', async () => {
    const driver = createPersistenceDriver('none');

    const first = await driver.session();

    expect(first.states).toEqual(['unavailable']);
    expect(first.tracking).toBeUndefined();
  });
});
