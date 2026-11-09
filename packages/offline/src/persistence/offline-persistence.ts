import {
  CollabBlockKind,
  CollabRestoreKind,
  type CollabAlternative,
  type CollabBlock,
  type CollabDocument,
  type CollabPersistence,
  type CollabRestoration,
  type CollabTracking,
} from '@numior/collaboration';
import { toJSON } from '@numior/editor-core';
import { openOfflineStore, replayedDoc } from '../store/offline-store';
import { isDocument } from '../store/records';
import { GateKind, passedGate } from './gate';
import type {
  OfflineLocks,
  OfflineMeta,
  OfflineMigration,
  OfflinePersistenceOptions,
  OfflinePlugins,
  OfflineState,
  OfflineStep,
  OfflineStore,
} from '../store/store.types';

type Job = () => Promise<void>;

type Release = () => void;

const acquired = (locks: OfflineLocks, name: string): Promise<Release | undefined> =>
  new Promise((resolve) => {
    void locks.request(name, { ifAvailable: true }, (lock) => {
      if (lock === null) {
        resolve(undefined);
        return undefined;
      }
      return new Promise<void>((release) => {
        resolve(release);
      });
    });
  });

const NO_MIGRATIONS: readonly OfflineMigration[] = [];

const NO_PLUGINS: OfflinePlugins = {};

const defaultLocks = (): OfflineLocks | undefined => globalThis.navigator?.locks;

export const offlinePersistence = (
  doc: string,
  options: OfflinePersistenceOptions,
): CollabPersistence => {
  const { locks = defaultLocks(), onError, migrations = NO_MIGRATIONS, ...storeOptions } = options;

  const currentMeta: OfflineMeta = {
    schema: { name: storeOptions.schema.name, version: storeOptions.schema.version },
    plugins: storeOptions.plugins ?? NO_PLUGINS,
  };

  let store: OfflineStore | undefined;
  let release: Release | undefined;
  let opening: Promise<unknown> = Promise.resolve();
  let tail: Promise<void> = Promise.resolve();

  const blockedRestore = (
    state: OfflineState,
    blocks: readonly CollabBlock[],
  ): CollabRestoration => {
    const replayed = replayedDoc(storeOptions.schema, state);

    return {
      kind: CollabRestoreKind.Blocked,
      version: state.snapshot.version + state.steps.length,
      snapshot: replayed === undefined ? undefined : toJSON(replayed),
      report: { blocks, unsent: state.outbox?.steps.length ?? 0 },
    };
  };

  const restoredOf = (state: OfflineState): CollabRestoration | undefined => {
    const replayed = replayedDoc(storeOptions.schema, state);
    const version = state.snapshot.version + state.steps.length;
    const outbox = state.outbox;

    if (outbox === undefined || (outbox.steps.length === 0 && outbox.baseVersion !== version)) {
      return undefined;
    }
    if (replayed === undefined || outbox.baseVersion !== version) {
      return blockedRestore(state, [{ kind: CollabBlockKind.Damaged }]);
    }

    return {
      kind: CollabRestoreKind.Ready,
      clientId: outbox.clientId,
      version,
      snapshot: toJSON(replayed),
      pending: outbox.steps,
      alternatives: state.alternatives,
    };
  };

  const gated = async (
    opened: OfflineStore,
    state: OfflineState,
  ): Promise<CollabRestoration | undefined> => {
    const result = passedGate(state, currentMeta, migrations);

    switch (result.kind) {
      case GateKind.Blocked:
        return blockedRestore(state, result.blocks);
      case GateKind.Migrated: {
        const restored = restoredOf(result.state);

        if (restored?.kind === CollabRestoreKind.Ready) {
          await opened.replace(result.state);
        }
        return restored;
      }
      case GateKind.Open:
        return restoredOf(result.state);
    }
  };

  const open = async (): Promise<CollabRestoration | undefined> => {
    if (locks !== undefined) {
      release = await acquired(locks, `nui-offline:${doc}`);

      if (release === undefined) {
        return undefined;
      }
    }
    store = await openOfflineStore(doc, storeOptions);

    const state = await store.read();

    return state === undefined ? undefined : gated(store, state);
  };

  const run = async (previous: Promise<void>, job: Job): Promise<void> => {
    await previous;

    try {
      await job();
    } catch (error) {
      onError?.(error);
    }
  };

  const enqueue = (job: Job): void => {
    tail = run(tail, job);
  };

  const tracked = (
    opened: OfflineStore,
    document: CollabDocument,
    clientId: string,
  ): CollabTracking => {
    let log: OfflineStep[] = [];
    let found: CollabAlternative[] = [];
    let scheduled = false;

    const write = async (): Promise<void> => {
      const version = document.version();
      const steps = log;
      const alternatives = found;

      scheduled = false;
      log = [];
      found = [];

      await opened.appendSteps(
        steps,
        version === null
          ? undefined
          : { clientId, baseVersion: version, steps: document.pending() },
        alternatives,
      );
    };

    const schedule = (): void => {
      if (!scheduled) {
        scheduled = true;
        enqueue(write);
      }
    };

    return {
      changed: schedule,
      record: (alternatives) => {
        found.push(...alternatives);
        schedule();
      },
      forget: (alternative) => {
        found = found.filter((item) => item !== alternative);
        enqueue(() => opened.removeAlternative(alternative));
      },
      document: {
        ...document,
        load: (snapshot, version) => {
          const loaded = document.load(snapshot, version);

          if (loaded && isDocument(snapshot)) {
            enqueue(async () => {
              await opened.writeSnapshot({ version, document: snapshot });
              await opened.appendSteps([], { clientId, baseVersion: version, steps: [] });
            });
          }
          return loaded;
        },
        receive: (batch) => {
          const received = document.receive(batch);

          if (received) {
            batch.steps.forEach((step, index) => {
              log.push({ version: batch.version + index, step });
            });

            schedule();
          }
          return received;
        },
        confirm: (count, version) => {
          document
            .pending()
            .slice(0, count)
            .forEach((step, index) => {
              log.push({ version: version - count + index, step });
            });

          document.confirm(count, version);
          schedule();
        },
        settle: (count, steps, version) => {
          const settled = document.settle(count, steps, version);

          if (settled) {
            steps.forEach((step, index) => {
              log.push({ version: version - steps.length + index, step });
            });

            schedule();
          }
          return settled;
        },
      },
    };
  };

  return {
    restore: () => {
      const restoring = open();

      opening = restoring;
      return restoring;
    },
    track: (document, clientId) =>
      store === undefined ? undefined : tracked(store, document, clientId),
    close: async () => {
      await opening;
      await tail;
      store?.close();
      store = undefined;
      release?.();
      release = undefined;
    },
  };
};
