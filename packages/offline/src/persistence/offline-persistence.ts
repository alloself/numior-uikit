import type {
  CollabDocument,
  CollabPersistence,
  CollabRestored,
  CollabTracking,
} from '@numior/collaboration';
import { toJSON } from '@numior/editor-core';
import { openOfflineStore, replayedDoc } from '../store/offline-store';
import { isDocument } from '../store/records';
import type {
  OfflineLocks,
  OfflinePersistenceOptions,
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

const defaultLocks = (): OfflineLocks | undefined => globalThis.navigator?.locks;

export const offlinePersistence = (
  doc: string,
  options: OfflinePersistenceOptions,
): CollabPersistence => {
  const { locks = defaultLocks(), onError, ...storeOptions } = options;

  let store: OfflineStore | undefined;
  let release: Release | undefined;
  let opening: Promise<unknown> = Promise.resolve();
  let tail: Promise<void> = Promise.resolve();

  const restoredOf = (state: OfflineState): CollabRestored | undefined => {
    const replayed = replayedDoc(storeOptions.schema, state);
    const version = state.snapshot.version + state.steps.length;

    if (replayed === undefined || state.outbox?.baseVersion !== version) {
      return undefined;
    }

    return {
      clientId: state.outbox.clientId,
      version,
      snapshot: toJSON(replayed),
      pending: state.outbox.steps,
    };
  };

  const open = async (): Promise<CollabRestored | undefined> => {
    if (locks !== undefined) {
      release = await acquired(locks, `nui-offline:${doc}`);

      if (release === undefined) {
        return undefined;
      }
    }
    store = await openOfflineStore(doc, storeOptions);

    const state = await store.read();

    return state === undefined ? undefined : restoredOf(state);
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
    let scheduled = false;

    const write = async (): Promise<void> => {
      const version = document.version();
      const steps = log;

      scheduled = false;
      log = [];

      await opened.appendSteps(
        steps,
        version === null
          ? undefined
          : { clientId, baseVersion: version, steps: document.pending() },
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
