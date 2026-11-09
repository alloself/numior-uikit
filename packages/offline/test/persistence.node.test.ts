import type { CollabAlternative } from '@numior/collaboration';
import { describe, expect, it } from 'vite-plus/test';
import { createPersistenceDriver, insertedText } from './persistence-driver';

const LOST: CollabAlternative = {
  version: 3,
  nodeId: 'cell',
  attr: 'value',
  value: 'Борис',
  clientId: 'boris',
  author: { id: 'boris', name: 'Борис' },
  createdAt: '2026-11-09T10:00:00.000Z',
};

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
});
