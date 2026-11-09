import type {
  CollabBatch,
  CollabBlocked,
  CollabDocument,
  CollabPersistence,
  CollabRestoration,
  CollabRestored,
  CollabTracking,
  WireStep,
} from '@numior/collaboration';
import { CollabRestoreKind } from '@numior/collaboration';
import { toJSON } from '@numior/editor-core';
import { fixtureSchema } from '@numior/editor-core/fixtures';
import { IDBFactory } from 'fake-indexeddb';
import { offlinePersistence, type OfflineLocks, type OfflinePersistenceOptions } from '../src';
import { inserting, textDoc } from './support';

type SessionVersions = Partial<
  Pick<OfflinePersistenceOptions, 'plugins' | 'migrations' | 'schema'>
>;

interface FakeDocument extends CollabDocument {
  readonly add: (step: WireStep) => void;
}

interface PersistenceSession {
  readonly restored: CollabRestored | undefined;
  readonly blocked: CollabBlocked | undefined;
  readonly tracking: CollabTracking | undefined;
  readonly pending: () => readonly WireStep[];
  readonly version: () => number | null;
  readonly loadFromServer: (text: string, version: number) => void;
  readonly type: (text: string, at: number) => void;
  readonly receive: (step: WireStep) => void;
  readonly confirm: (count: number) => void;
  readonly restart: () => Promise<void>;
}

const readyOf = (outcome: CollabRestoration | undefined): CollabRestored | undefined =>
  outcome?.kind === CollabRestoreKind.Ready ? outcome : undefined;

const fakeLocks = (): OfflineLocks => {
  const held = new Set<string>();

  return {
    request: async (name, _options, callback) => {
      if (held.has(name)) {
        return callback(null);
      }
      held.add(name);
      await callback(held);
      held.delete(name);
      return undefined;
    },
  };
};

const fakeDocument = (restored: CollabRestored | undefined): FakeDocument => {
  let version: number | null = restored?.version ?? null;
  let pending = restored?.pending ?? [];

  return {
    version: () => version,
    pending: () => pending,
    load: (_snapshot, loaded) => {
      version = loaded;
      return true;
    },
    receive: (batch: CollabBatch) => {
      version = batch.version + batch.steps.length;
      return true;
    },
    confirm: (count, confirmed) => {
      pending = pending.slice(count);
      version = confirmed;
    },
    add: (step) => {
      pending = [...pending, step];
    },
  };
};

export const createPersistenceDriver = () => {
  const factory = new IDBFactory();
  const locks = fakeLocks();

  const persistenceOf = (versions: SessionVersions): CollabPersistence =>
    offlinePersistence('doc', { schema: fixtureSchema, factory, locks, ...versions });

  const session = async (
    clientId = 'me',
    versions: SessionVersions = {},
  ): Promise<PersistenceSession> => {
    const persistence = persistenceOf(versions);
    const outcome = await persistence.restore();
    const restored = readyOf(outcome);
    const fake = fakeDocument(restored);
    const tracking = persistence.track(fake, clientId);
    const document = tracking?.document ?? fake;

    return {
      restored,
      blocked: outcome?.kind === CollabRestoreKind.Blocked ? outcome : undefined,
      tracking,
      pending: fake.pending,
      version: fake.version,
      loadFromServer: (text, version) => {
        document.load(toJSON(textDoc(text)), version);
      },
      type: (text, at) => {
        fake.add(inserting(textDoc(''), text, at));
        tracking?.changed();
      },
      receive: (step) => {
        const version = document.version() ?? 0;

        document.receive({ version, clientId: 'other', steps: [step] });
      },
      confirm: (count) => {
        document.confirm(count, (document.version() ?? 0) + count);
      },
      restart: () => persistence.close(),
    };
  };

  return { session };
};

export const insertedText = (text: string, at: number): WireStep =>
  inserting(textDoc(''), text, at);
