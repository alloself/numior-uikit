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
import { IDBFactory, IDBObjectStore } from 'fake-indexeddb';
import { vi } from 'vite-plus/test';
import {
  offlinePersistence,
  type OfflineCopy,
  type OfflineLocks,
  type OfflinePersistenceOptions,
} from '../src';
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
  readonly states: readonly OfflineCopy[];
  readonly errors: readonly unknown[];
  readonly refused: () => Promise<void>;
  readonly keptAgain: () => Promise<void>;
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
    settle: (count, _steps, settled) => {
      pending = pending.slice(count);
      version = settled;
      return true;
    },
    add: (step) => {
      pending = [...pending, step];
    },
  };
};

const RETRY = 1000;

const TURNS = 500;

const turn = (): Promise<void> =>
  new Promise((resolve) => {
    setImmediate(resolve);
  });

const until = async (done: () => boolean, turns = TURNS): Promise<void> => {
  if (done() || turns === 0) {
    return;
  }

  await turn();
  await until(done, turns - 1);
};

const refused = function (this: IDBObjectStore): never {
  this.transaction.abort();
  throw new DOMException('The quota has been exceeded', 'QuotaExceededError');
};

const refuseWrites = (count: number): void => {
  vi.restoreAllMocks();

  const put = vi.spyOn(IDBObjectStore.prototype, 'put');

  Array.from({ length: count }, () => put.mockImplementationOnce(refused));
};

export const restoreBrowser = (): void => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
};

export const createPersistenceDriver = (guard: 'locks' | 'channel' | 'none' = 'locks') => {
  const factory = new IDBFactory();
  const locks = guard === 'locks' ? fakeLocks() : undefined;

  if (guard !== 'locks') {
    vi.stubGlobal('navigator', {});
  }

  if (guard === 'none') {
    vi.stubGlobal('BroadcastChannel', undefined);
  }

  const session = async (
    clientId = 'me',
    versions: SessionVersions = {},
  ): Promise<PersistenceSession> => {
    const states: OfflineCopy[] = [];
    const errors: unknown[] = [];

    const persistence: CollabPersistence = offlinePersistence('doc', {
      schema: fixtureSchema,
      factory,
      locks,
      onState: (state) => {
        states.push(state);
      },
      onError: (error) => {
        errors.push(error);
      },
      ...versions,
    });

    const outcome = await persistence.restore();
    const restored = readyOf(outcome);
    const fake = fakeDocument(restored);
    const tracking = persistence.track(fake, clientId);
    const document = tracking?.document ?? fake;

    return {
      restored,
      blocked: outcome?.kind === CollabRestoreKind.Blocked ? outcome : undefined,
      tracking,
      states,
      errors,
      refused: () => until(() => errors.length > 0),
      keptAgain: async () => {
        await vi.advanceTimersByTimeAsync(RETRY);
        await until(() => states.at(-1) === 'kept');
      },
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

  return { session, refuseWrites };
};

export const insertedText = (text: string, at: number): WireStep =>
  inserting(textDoc(''), text, at);
