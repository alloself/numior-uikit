import { CollabBlockKind, type CollabBlock, type WireStep } from '@numior/collaboration';
import type { DocJSON } from '@numior/editor-core';
import type {
  OfflineMeta,
  OfflineMigration,
  OfflineOutbox,
  OfflineState,
  OfflineStep,
} from '../store/store.types';

export type GateResult =
  | { readonly kind: typeof GateKind.Open; readonly state: OfflineState }
  | { readonly kind: typeof GateKind.Migrated; readonly state: OfflineState }
  | { readonly kind: typeof GateKind.Blocked; readonly blocks: readonly CollabBlock[] };

interface VersionGap {
  readonly subject: string;
  readonly stored: number;
  readonly current: number;
}

export const GateKind = { Open: 'open', Migrated: 'migrated', Blocked: 'blocked' } as const;

const SCHEMA_SUBJECT = 'schema';

const versionGaps = (stored: OfflineMeta, current: OfflineMeta): readonly VersionGap[] => {
  const plugins = new Set([...Object.keys(stored.plugins), ...Object.keys(current.plugins)]);

  const gaps = Array.from(plugins).reduce<VersionGap[]>((found, subject) => {
    const from = stored.plugins[subject] ?? 0;
    const to = current.plugins[subject] ?? 0;

    if (from !== to) {
      found.push({ subject, stored: from, current: to });
    }
    return found;
  }, []);

  return stored.schema.version === current.schema.version
    ? gaps
    : [
        { subject: SCHEMA_SUBJECT, stored: stored.schema.version, current: current.schema.version },
        ...gaps,
      ];
};

const versionBlock = (gap: VersionGap): CollabBlock => ({
  kind: CollabBlockKind.Version,
  subject: gap.subject,
  stored: gap.stored,
  current: gap.current,
});

const chainFor = (
  migrations: readonly OfflineMigration[],
  gap: VersionGap,
): readonly OfflineMigration[] | undefined => {
  const chain: OfflineMigration[] = [];
  let at = gap.stored;

  while (at !== gap.current) {
    const version = at;

    const next = migrations.find(
      (migration) =>
        migration.subject === gap.subject && migration.from === version && migration.to > version,
    );

    if (next === undefined) {
      return undefined;
    }
    chain.push(next);
    at = next.to;
  }

  return chain;
};

const migratedStep = (chain: readonly OfflineMigration[], step: WireStep): WireStep | undefined =>
  chain.reduce<WireStep | undefined>(
    (current, migration) => (current === undefined ? undefined : migration.step(current)),
    step,
  );

const migratedSteps = (
  chain: readonly OfflineMigration[],
  steps: readonly WireStep[],
): readonly WireStep[] | undefined =>
  steps.reduce<WireStep[] | undefined>((done, step) => {
    const moved = migratedStep(chain, step);

    if (done === undefined || moved === undefined) {
      return undefined;
    }
    done.push(moved);
    return done;
  }, []);

const migratedLog = (
  chain: readonly OfflineMigration[],
  log: readonly OfflineStep[],
): readonly OfflineStep[] | undefined => {
  const steps = migratedSteps(
    chain,
    log.map((record) => record.step),
  );

  return steps?.map((step, index) => ({ version: log[index]?.version ?? 0, step }));
};

const migratedOutbox = (
  chain: readonly OfflineMigration[],
  outbox: OfflineOutbox,
): OfflineOutbox | undefined => {
  const steps = migratedSteps(chain, outbox.steps);

  return steps === undefined ? undefined : { ...outbox, steps };
};

const migratedDocument = (
  chain: readonly OfflineMigration[],
  document: DocJSON,
  current: OfflineMeta,
): DocJSON => ({
  ...chain.reduce((doc, migration) => migration.document(doc), document),
  schema: current.schema,
});

const migrated = (
  chain: readonly OfflineMigration[],
  state: OfflineState,
  current: OfflineMeta,
): OfflineState | undefined => {
  const steps = migratedLog(chain, state.steps);
  const outbox = state.outbox === undefined ? undefined : migratedOutbox(chain, state.outbox);

  if (steps === undefined || (state.outbox !== undefined && outbox === undefined)) {
    return undefined;
  }

  return {
    ...state,
    meta: current,
    snapshot: {
      version: state.snapshot.version,
      document: migratedDocument(chain, state.snapshot.document, current),
    },
    steps,
    outbox,
  };
};

export const passedGate = (
  state: OfflineState,
  current: OfflineMeta,
  migrations: readonly OfflineMigration[],
): GateResult => {
  if (state.meta.schema.name !== current.schema.name) {
    return {
      kind: GateKind.Blocked,
      blocks: [
        {
          kind: CollabBlockKind.Version,
          subject: SCHEMA_SUBJECT,
          stored: state.meta.schema.version,
          current: current.schema.version,
        },
      ],
    };
  }

  const gaps = versionGaps(state.meta, current);

  if (gaps.length === 0) {
    return { kind: GateKind.Open, state };
  }

  const chains = gaps.map((gap) => chainFor(migrations, gap));

  const blocks = gaps.reduce<CollabBlock[]>((found, gap, index) => {
    if (chains[index] === undefined) {
      found.push(versionBlock(gap));
    }
    return found;
  }, []);

  if (blocks.length > 0) {
    return { kind: GateKind.Blocked, blocks };
  }

  const next = migrated(
    chains.flatMap((chain) => chain ?? []),
    state,
    current,
  );

  return next === undefined
    ? {
        kind: GateKind.Blocked,
        blocks: [{ kind: CollabBlockKind.Step, subject: gaps[0]?.subject ?? SCHEMA_SUBJECT }],
      }
    : { kind: GateKind.Migrated, state: next };
};
