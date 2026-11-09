import {
  applyStep,
  fromJSON,
  stepFromJSON,
  toJSON,
  type Doc,
  type Schema,
} from '@numior/editor-core';
import type { CollabAlternative } from '@numior/collaboration';
import { finished, openDatabase, requested } from './idb';
import { contiguousSteps, isMeta, isOutbox, isSnapshot, knownAlternatives } from './records';
import type {
  OfflineMeta,
  OfflineOutbox,
  OfflinePlugins,
  OfflineSnapshot,
  OfflineState,
  OfflineStep,
  OfflineStore,
  OfflineStoreOptions,
} from './store.types';

const DATABASE_VERSION = 1;

const COMPACT_AFTER = 500;

const SINGLE_KEY = 'current';

const META = 'meta';

const SNAPSHOT = 'snapshot';

const STEPS = 'steps';

const OUTBOX = 'outbox';

const ALTERNATIVES = 'alternatives';

const NO_PLUGINS: OfflinePlugins = {};

const databaseName = (doc: string): string => `nui-offline:${doc}`;

const upgrade = (database: IDBDatabase): void => {
  database.createObjectStore(META);
  database.createObjectStore(SNAPSHOT);
  database.createObjectStore(STEPS, { keyPath: 'version' });
  database.createObjectStore(OUTBOX);
  database.createObjectStore(ALTERNATIVES, { keyPath: ['version', 'nodeId', 'attr'] });
};

export const replayedDoc = (schema: Schema, state: OfflineState): Doc | undefined => {
  const read = fromJSON(schema, state.snapshot.document);

  return state.steps.reduce<Doc | undefined>(
    (doc, record) => {
      const step = stepFromJSON(schema, record.step);

      if (doc === undefined || step === undefined) {
        return undefined;
      }

      const applied = applyStep(doc, step);

      return applied.ok ? applied.doc : undefined;
    },
    read.ok ? read.doc : undefined,
  );
};

const dropCovered = async (steps: IDBObjectStore, version: number): Promise<void> => {
  const keys = await requested(steps.getAllKeys());

  keys.forEach((key) => {
    if (typeof key === 'number' && key < version) {
      steps.delete(key);
    }
  });
};

export const openOfflineStore = async (
  doc: string,
  options: OfflineStoreOptions,
): Promise<OfflineStore> => {
  const {
    schema,
    plugins = NO_PLUGINS,
    factory = globalThis.indexedDB,
    compactAfter = COMPACT_AFTER,
  } = options;

  const meta: OfflineMeta = { schema: { name: schema.name, version: schema.version }, plugins };
  const database = await openDatabase(factory, databaseName(doc), DATABASE_VERSION, upgrade);

  database.onversionchange = () => {
    database.close();
  };

  let logged = await requested(database.transaction(STEPS).objectStore(STEPS).count());

  const read = async (): Promise<OfflineState | undefined> => {
    const transaction = database.transaction([META, SNAPSHOT, STEPS, OUTBOX, ALTERNATIVES]);

    const [storedMeta, snapshot, steps, outbox, alternatives] = await Promise.all([
      requested<unknown>(transaction.objectStore(META).get(SINGLE_KEY)),
      requested<unknown>(transaction.objectStore(SNAPSHOT).get(SINGLE_KEY)),
      requested<unknown[]>(transaction.objectStore(STEPS).getAll()),
      requested<unknown>(transaction.objectStore(OUTBOX).get(SINGLE_KEY)),
      requested<unknown[]>(transaction.objectStore(ALTERNATIVES).getAll()),
    ]);

    return isMeta(storedMeta) && isSnapshot(snapshot)
      ? {
          meta: storedMeta,
          snapshot,
          steps: contiguousSteps(steps, snapshot.version),
          outbox: isOutbox(outbox) ? outbox : undefined,
          alternatives: knownAlternatives(alternatives).toReversed(),
        }
      : undefined;
  };

  const writeSnapshot = async (snapshot: OfflineSnapshot): Promise<void> => {
    const transaction = database.transaction([META, SNAPSHOT, STEPS], 'readwrite');
    const snapshots = transaction.objectStore(SNAPSHOT);
    const steps = transaction.objectStore(STEPS);
    const current = await requested<unknown>(snapshots.get(SINGLE_KEY));

    if (!isSnapshot(current) || current.version <= snapshot.version) {
      transaction.objectStore(META).put(meta, SINGLE_KEY);
      snapshots.put(snapshot, SINGLE_KEY);
      await dropCovered(steps, snapshot.version);
    }

    const remaining = await requested(steps.count());

    await finished(transaction);
    logged = remaining;
  };

  const compact = async (): Promise<boolean> => {
    const state = await read();
    const replayed = state === undefined ? undefined : replayedDoc(schema, state);

    if (state === undefined || replayed === undefined || state.steps.length === 0) {
      return false;
    }

    await writeSnapshot({
      version: state.snapshot.version + state.steps.length,
      document: toJSON(replayed),
    });

    return true;
  };

  const appendSteps = async (
    records: readonly OfflineStep[],
    outbox?: OfflineOutbox,
    alternatives: readonly CollabAlternative[] = [],
  ): Promise<void> => {
    const transaction = database.transaction([STEPS, OUTBOX, ALTERNATIVES], 'readwrite');
    const steps = transaction.objectStore(STEPS);
    const overwritten = transaction.objectStore(ALTERNATIVES);

    alternatives.forEach((alternative) => {
      overwritten.put(alternative);
    });

    records.forEach((record) => {
      steps.put(record);
    });

    if (outbox !== undefined) {
      transaction.objectStore(OUTBOX).put(outbox, SINGLE_KEY);
    }

    await finished(transaction);
    logged += records.length;

    if (logged > compactAfter) {
      await compact();
    }
  };

  const removeAlternative = async (alternative: CollabAlternative): Promise<void> => {
    const transaction = database.transaction(ALTERNATIVES, 'readwrite');

    transaction
      .objectStore(ALTERNATIVES)
      .delete([alternative.version, alternative.nodeId, alternative.attr]);

    await finished(transaction);
  };

  return {
    read,
    writeSnapshot,
    appendSteps,
    removeAlternative,
    compact,
    close: () => {
      database.close();
    },
  };
};

export const deleteOfflineDocument = async (
  doc: string,
  factory: IDBFactory = globalThis.indexedDB,
): Promise<void> => {
  await requested(factory.deleteDatabase(databaseName(doc)));
};
