import {
  ClientMessageKind,
  ServerMessageKind,
  createCollabClient,
  type ClientMessage,
  type CollabBatch,
  type CollabClient,
  type CollabLiveness,
  type CollabStatus,
  type RejectReason,
  type ServerMessage,
  type TransportListener,
  type WireStep,
} from '../../src';

export interface SettledBatch {
  readonly count: number;
  readonly steps: readonly WireStep[];
}

export interface ClientDriverOptions {
  readonly version?: number | null | undefined;
  readonly loadable?: boolean | undefined;
  readonly receivable?: boolean | undefined;
  readonly liveness?: CollabLiveness | undefined;
  readonly eager?: boolean | undefined;
}

export interface ClientDriver {
  readonly client: CollabClient;
  readonly sent: () => readonly ClientMessage[];
  readonly statuses: () => readonly CollabStatus['kind'][];
  readonly version: () => number | null;
  readonly received: () => readonly CollabBatch[];
  readonly settled: () => readonly SettledBatch[];
  readonly peers: () => ReadonlyMap<string, unknown>;
  readonly pending: () => number;
  readonly opens: () => number;
  readonly open: () => void;
  readonly drop: () => void;
  readonly edit: (count?: number) => void;
  readonly deliver: (value: unknown) => void;
  readonly deliverLate: (value: unknown) => void;
  readonly dropLate: () => void;
  readonly pong: () => void;
  readonly welcome: (version: number, snapshot?: unknown) => void;
  readonly accept: (seq: number, version: number, rebased?: number) => void;
  readonly reject: (seq: number, reason: RejectReason, version: number) => void;
  readonly steps: (version: number, clientId: string, count?: number, sent?: number) => void;
}

const STEP: WireStep = { kind: 'replace' };

const stepsOf = (count: number): readonly WireStep[] => Array.from({ length: count }, () => STEP);

const SCHEMA = { name: 'fixture', version: 1 };

export const createClientDriver = (options: ClientDriverOptions = {}): ClientDriver => {
  const sent: ClientMessage[] = [];
  const statuses: CollabStatus['kind'][] = [];
  const received: CollabBatch[] = [];
  const settled: SettledBatch[] = [];
  const listeners: TransportListener[] = [];
  let peers: ReadonlyMap<string, unknown> = new Map();
  let version = options.version === undefined ? 0 : options.version;
  let pending: readonly WireStep[] = [];

  const client = createCollabClient({
    doc: 'doc',
    clientId: 'me',
    schema: SCHEMA,
    liveness: options.liveness,
    transport: {
      open: (listener) => {
        listeners.push(listener);

        if (options.eager === true) {
          listener.opened();
        }

        return {
          send: (message) => {
            sent.push(message);
          },
          close: () => {
            listener.closed();
          },
        };
      },
    },
    document: {
      version: () => version,
      pending: () => pending,
      load: (_snapshot, loaded) => {
        if (options.loadable !== false) {
          version = loaded;
        }
        return options.loadable !== false;
      },
      receive: (batch) => {
        received.push(batch);
        version = batch.version + batch.steps.length;
        return options.receivable !== false;
      },
      confirm: (count, confirmed) => {
        pending = pending.slice(count);
        version = confirmed;
      },
      settle: (count, steps, settledAt) => {
        settled.push({ count, steps });
        pending = pending.slice(count);
        version = settledAt;
        return options.receivable !== false;
      },
    },
    onStatus: (status) => {
      statuses.push(status.kind);
    },
    onPresence: (next) => {
      peers = next;
    },
  });

  const deliver = (value: unknown): void => {
    listeners.at(-1)?.message(value);
  };

  const server = (message: ServerMessage): void => {
    deliver(message);
  };

  return {
    client,
    sent: () => sent,
    statuses: () => statuses,
    version: () => version,
    received: () => received,
    settled: () => settled,
    peers: () => peers,
    pending: () => pending.length,
    opens: () => listeners.length,
    open: () => {
      listeners.at(-1)?.opened();
    },
    drop: () => {
      listeners.at(-1)?.closed();
    },
    edit: (count = 1) => {
      pending = [...pending, ...stepsOf(count)];
      client.sync();
    },
    deliver,
    deliverLate: (value) => {
      listeners.at(-2)?.message(value);
    },
    dropLate: () => {
      listeners.at(-2)?.closed();
    },
    pong: () => {
      server({ kind: ServerMessageKind.Pong });
    },
    welcome: (at, snapshot) => {
      server({ kind: ServerMessageKind.Welcome, version: at, snapshot, presence: [] });
    },
    accept: (seq, at, rebased) => {
      server({
        kind: ServerMessageKind.Accepted,
        seq,
        version: at,
        ...(rebased === undefined ? {} : { steps: stepsOf(rebased) }),
      });
    },
    reject: (seq, reason, at) => {
      server({ kind: ServerMessageKind.Rejected, seq, reason, version: at });
    },
    steps: (at, clientId, count = 1, authored) => {
      server({
        kind: ServerMessageKind.Steps,
        version: at,
        clientId,
        steps: stepsOf(count),
        sent: authored,
      });
    },
  };
};

export const sentOfKind = (
  driver: ClientDriver,
  kind: ClientMessage['kind'],
): readonly ClientMessage[] => driver.sent().filter((message) => message.kind === kind);

export const lastPull = (driver: ClientDriver): number | undefined => {
  const pull = sentOfKind(driver, ClientMessageKind.Pull).at(-1);

  return pull?.kind === ClientMessageKind.Pull ? pull.from : undefined;
};
