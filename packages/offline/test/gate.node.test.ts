import { CollabBlockKind, type WireStep } from '@numior/collaboration';
import { createSchema, toJSON, type DocJSON } from '@numior/editor-core';
import { fixtureSchema } from '@numior/editor-core/fixtures';
import { describe, expect, it, vi } from 'vite-plus/test';
import type { OfflineMigration } from '../src';
import { createPersistenceDriver } from './persistence-driver';
import { textDoc } from './support';

const V1 = { plugins: { tables: 1 } };

const V2 = { plugins: { tables: 2 } };

const keepStep = (step: WireStep): WireStep => step;

const migrationOf = (
  from: number,
  to: number,
  overrides: Partial<OfflineMigration> = {},
): OfflineMigration => ({
  subject: 'tables',
  from,
  to,
  document: (document: DocJSON) => document,
  step: keepStep,
  ...overrides,
});

const savedSession = async (driver: ReturnType<typeof createPersistenceDriver>): Promise<void> => {
  const first = await driver.session('me', V1);

  first.loadFromServer('', 0);
  first.type('a', 1);
  await first.restart();
};

describe('offline version gate', () => {
  it('opens a copy saved with the same versions', async () => {
    const driver = createPersistenceDriver();

    await savedSession(driver);

    const second = await driver.session('me', V1);

    expect(second.blocked).toBeUndefined();
    expect(second.restored?.pending).toHaveLength(1);
  });

  it('blocks a plugin version without a migration and reports it', async () => {
    const driver = createPersistenceDriver();

    await savedSession(driver);

    const second = await driver.session('me', V2);

    expect(second.restored).toBeUndefined();

    expect(second.blocked?.report).toEqual({
      blocks: [{ kind: CollabBlockKind.Version, subject: 'tables', stored: 1, current: 2 }],
      unsent: 1,
    });
  });

  it('keeps showing a blocked copy whose schema still reads', async () => {
    const driver = createPersistenceDriver();

    await savedSession(driver);

    const second = await driver.session('me', V2);

    expect(second.blocked?.snapshot).toEqual(toJSON(textDoc('')));
  });

  it('gives no snapshot when the schema has moved on', async () => {
    const driver = createPersistenceDriver();

    await savedSession(driver);

    const second = await driver.session('me', {
      ...V1,
      schema: createSchema({ ...fixtureSchema.spec, version: fixtureSchema.version + 1 }),
    });

    expect(second.blocked?.snapshot).toBeUndefined();
    expect(second.blocked?.report.blocks).toMatchObject([{ subject: 'schema' }]);
  });

  it('leaves the queue intact behind a block', async () => {
    const driver = createPersistenceDriver();

    await savedSession(driver);

    const blocked = await driver.session('me', V2);

    await blocked.restart();

    const back = await driver.session('me', V1);

    expect(back.restored?.pending).toHaveLength(1);
  });

  it('follows a chain of migrations through the snapshot and the queue', async () => {
    const driver = createPersistenceDriver();
    const seen = vi.fn<(step: WireStep) => WireStep>(keepStep);

    await savedSession(driver);

    const second = await driver.session('me', {
      plugins: { tables: 3 },
      migrations: [
        migrationOf(2, 3, { document: () => toJSON(textDoc('two')) }),
        migrationOf(1, 2, { step: seen }),
      ],
    });

    expect(second.blocked).toBeUndefined();
    expect(second.restored?.snapshot).toEqual(toJSON(textDoc('two')));
    expect(seen).toHaveBeenCalledTimes(1);
  });

  it('remembers the migration so it runs once', async () => {
    const driver = createPersistenceDriver();
    const document = vi.fn<(value: DocJSON) => DocJSON>((value) => value);
    const versions = { ...V2, migrations: [migrationOf(1, 2, { document })] };

    await savedSession(driver);

    const second = await driver.session('me', versions);

    await second.restart();

    const third = await driver.session('me', versions);

    expect(third.restored?.pending).toHaveLength(1);
    expect(document).toHaveBeenCalledTimes(1);
  });

  it('blocks instead of dropping a step that cannot be converted', async () => {
    const driver = createPersistenceDriver();

    await savedSession(driver);

    const second = await driver.session('me', {
      ...V2,
      migrations: [migrationOf(1, 2, { step: () => undefined })],
    });

    expect(second.blocked?.report.blocks).toEqual([
      { kind: CollabBlockKind.Step, subject: 'tables' },
    ]);
  });

  it('does not write a failed migration back', async () => {
    const driver = createPersistenceDriver();

    await savedSession(driver);

    const failed = await driver.session('me', {
      ...V2,
      migrations: [migrationOf(1, 2, { step: () => undefined })],
    });

    await failed.restart();

    const back = await driver.session('me', V1);

    expect(back.blocked).toBeUndefined();
    expect(back.restored?.pending).toHaveLength(1);
  });

  it('does not walk a newer copy backwards', async () => {
    const driver = createPersistenceDriver();

    await savedSession(driver);

    const second = await driver.session('me', {
      plugins: { tables: 0 },
      migrations: [migrationOf(1, 2)],
    });

    expect(second.blocked?.report.blocks).toMatchObject([{ stored: 1, current: 0 }]);
  });

  it('counts a plugin added later as version zero', async () => {
    const driver = createPersistenceDriver();

    await savedSession(driver);

    const second = await driver.session('me', {
      plugins: { tables: 1, comments: 1 },
      migrations: [{ ...migrationOf(0, 1), subject: 'comments' }],
    });

    expect(second.blocked).toBeUndefined();
  });
});
