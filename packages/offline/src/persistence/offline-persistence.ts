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
import { defaultChannel, defaultLocks, ownershipOf } from './ownership';
import { createWriteQueue } from './write-queue';
import {
  OfflineCopy,
  type OfflineMeta,
  type OfflineMigration,
  type OfflinePersistenceOptions,
  type OfflinePlugins,
  type OfflineState,
  type OfflineStep,
  type OfflineStore,
} from '../store/store.types';

const NO_MIGRATIONS: readonly OfflineMigration[] = [];

const NO_PLUGINS: OfflinePlugins = {};

export const offlinePersistence = (
  doc: string,
  options: OfflinePersistenceOptions,
): CollabPersistence => {
  const {
    locks = defaultLocks(),
    channel = defaultChannel(),
    onError,
    onState,
    migrations = NO_MIGRATIONS,
    ...storeOptions
  } = options;

  const currentMeta: OfflineMeta = {
    schema: { name: storeOptions.schema.name, version: storeOptions.schema.version },
    plugins: storeOptions.plugins ?? NO_PLUGINS,
  };

  let store: OfflineStore | undefined;
  let release: (() => void) | undefined;
  let opening: Promise<unknown> = Promise.resolve();

  const told = (state: OfflineCopy): void => {
    onState?.(state);
  };

  const queue = createWriteQueue({ onError, onState: told });

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
    const ownership = await ownershipOf(`nui-offline:${doc}`, locks, channel);

    told(ownership.state);

    if (ownership.state !== OfflineCopy.Kept) {
      return undefined;
    }

    release = ownership.release;
    store = await openOfflineStore(doc, storeOptions);

    const state = await store.read();

    return state === undefined ? undefined : gated(store, state);
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

      try {
        await opened.appendSteps(
          steps,
          version === null
            ? undefined
            : { clientId, baseVersion: version, steps: document.pending() },
          alternatives,
        );
      } catch (error) {
        log = [...steps, ...log];
        found = [...alternatives, ...found];
        throw error;
      }
    };

    const schedule = (): void => {
      if (scheduled) {
        return;
      }

      scheduled = true;
      queue.add(write);
    };

    return {
      changed: schedule,
      record: (alternatives) => {
        found.push(...alternatives);
        schedule();
      },
      forget: (alternative) => {
        found = found.filter((item) => item !== alternative);
        queue.add(() => opened.removeAlternative(alternative));
      },
      document: {
        ...document,
        load: (snapshot, version) => {
          const loaded = document.load(snapshot, version);

          if (loaded && isDocument(snapshot)) {
            queue.add(async () => {
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
      await queue.drained();
      store?.close();
      store = undefined;
      release?.();
      release = undefined;
    },
  };
};
