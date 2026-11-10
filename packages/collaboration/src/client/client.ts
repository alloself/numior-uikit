import { parseServerMessage } from '../protocol/server-messages';
import {
  ClientMessageKind,
  RejectReason,
  ServerErrorCode,
  ServerMessageKind,
  type AcceptedMessage,
  type RejectedMessage,
  type ServerMessage,
  type StepsMessage,
  type WelcomeMessage,
  type WireStep,
} from '../protocol/protocol.types';
import {
  CollabFailure,
  CollabStatusKind,
  type CollabBatch,
  type CollabClient,
  type CollabClientOptions,
  type CollabStatus,
} from './client.types';
import { createLiveness } from './liveness';
import { createPresenceChannel } from './presence-channel';
import { createReconnecting } from './reconnecting';

interface InFlight {
  readonly seq: number;
  readonly count: number;
}

export const createCollabClient = (options: CollabClientOptions): CollabClient => {
  const { doc, clientId, schema, document, onStatus, onPresence } = options;

  let status: CollabStatus = { kind: CollabStatusKind.Connecting };
  let inFlight: InFlight | undefined;
  let seq = 0;
  let target = 0;

  const setStatus = (next: CollabStatus): void => {
    status = next;
    onStatus?.(next);
  };

  const liveness = createLiveness({
    settings: options.liveness,
    ping: () => {
      link.send({ kind: ClientMessageKind.Ping });
    },
    lost: () => {
      link.restart();
    },
  });

  const fail = (reason: CollabFailure): void => {
    setStatus({ kind: CollabStatusKind.Failed, reason });
    liveness.stop();
    link.stop();
  };

  const presence = createPresenceChannel({
    send: (state) => {
      link.send({ kind: ClientMessageKind.Presence, state });
    },
    ready: () =>
      status.kind === CollabStatusKind.Online &&
      document.pending().length === (inFlight?.count ?? 0),
    onPeers: onPresence,
  });

  const flush = (): void => {
    const version = document.version();

    if (
      status.kind !== CollabStatusKind.Online ||
      inFlight !== undefined ||
      version === null ||
      version < target
    ) {
      return;
    }

    const steps = document.pending();

    if (steps.length > 0) {
      seq += 1;
      inFlight = { seq, count: steps.length };
      link.send({ kind: ClientMessageKind.Steps, seq, version, steps });
      liveness.expect();
    }
    presence.offer();
  };

  const catchUp = (version: number): void => {
    const local = document.version();

    if (local !== null && local < version) {
      target = version;
      link.send({ kind: ClientMessageKind.Pull, from: local });
    }
  };

  const refresh = (): void => {
    const local = document.version();

    if (local !== null && status.kind === CollabStatusKind.Online) {
      link.send({ kind: ClientMessageKind.Pull, from: local });
    }
  };

  const onWelcome = (message: WelcomeMessage): void => {
    const local = document.version();

    link.settle();
    setStatus({ kind: CollabStatusKind.Online });

    if (local === null) {
      if (!document.load(message.snapshot, message.version)) {
        fail(CollabFailure.Document);
        return;
      }
    } else if (local > message.version) {
      fail(CollabFailure.Diverged);
      return;
    }
    presence.welcome(message.presence);
    catchUp(message.version);
    flush();
  };

  const taken = (batch: CollabBatch, sent: number | undefined): boolean => {
    const queued = batch.clientId === clientId ? document.pending().length : 0;
    const end = batch.version + batch.steps.length;

    if (queued > 0 && sent !== undefined) {
      return document.settle(Math.min(sent, queued), batch.steps, end);
    }

    const own = Math.min(batch.steps.length, queued);

    if (own > 0) {
      document.confirm(own, batch.version + own);
    }
    return (
      own === batch.steps.length ||
      document.receive({ ...batch, version: batch.version + own, steps: batch.steps.slice(own) })
    );
  };

  const onSteps = (message: StepsMessage): void => {
    const local = document.version();

    if (local === null) {
      return;
    }
    if (message.version > local) {
      catchUp(message.version);
      return;
    }

    const steps = message.steps.slice(local - message.version);

    if (steps.length === 0) {
      return;
    }

    const sent = message.version === local ? message.sent : undefined;

    if (!taken({ version: local, clientId: message.clientId, steps }, sent)) {
      fail(CollabFailure.Document);
      return;
    }
    flush();
  };

  const settled = (count: number, steps: readonly WireStep[], version: number): boolean => {
    const local = document.version();

    if (local === null || local + steps.length !== version) {
      fail(CollabFailure.Protocol);
      return false;
    }
    if (!document.settle(count, steps, version)) {
      fail(CollabFailure.Document);
      return false;
    }
    return true;
  };

  const onAccepted = (message: AcceptedMessage): void => {
    if (message.seq !== inFlight?.seq) {
      return;
    }

    const { count } = inFlight;

    inFlight = undefined;

    if (message.steps === undefined) {
      document.confirm(count, message.version);
      flush();
    } else if (settled(count, message.steps, message.version)) {
      flush();
    }
  };

  const onRejected = (message: RejectedMessage): void => {
    if (message.seq !== inFlight?.seq) {
      return;
    }
    inFlight = undefined;

    if (message.reason === RejectReason.Invalid) {
      fail(CollabFailure.Invalid);
      return;
    }
    catchUp(message.version);
    flush();
  };

  const onMessage = (message: ServerMessage): void => {
    switch (message.kind) {
      case ServerMessageKind.Welcome:
        onWelcome(message);
        break;
      case ServerMessageKind.Steps:
        onSteps(message);
        break;
      case ServerMessageKind.Accepted:
        onAccepted(message);
        break;
      case ServerMessageKind.Rejected:
        onRejected(message);
        break;
      case ServerMessageKind.Presence:
        presence.peer(message.clientId, message.state);
        break;
      case ServerMessageKind.Pong:
        break;
      case ServerMessageKind.Error:
        fail(
          message.code === ServerErrorCode.Schema ? CollabFailure.Schema : CollabFailure.Protocol,
        );

        break;
    }
  };

  const link = createReconnecting(options.transport, options.retry, {
    opened: () => {
      link.send({
        kind: ClientMessageKind.Hello,
        doc,
        clientId,
        version: document.version(),
        schema,
      });

      liveness.expect();
    },
    message: (value) => {
      const message = parseServerMessage(value);

      if (message === undefined) {
        fail(CollabFailure.Protocol);
      } else {
        liveness.heard();
        onMessage(message);
      }
    },
    closed: () => {
      inFlight = undefined;
      liveness.stop();
      presence.offline();

      if (status.kind !== CollabStatusKind.Failed) {
        setStatus({ kind: CollabStatusKind.Offline });
      }
    },
  });

  link.start();

  return {
    status: () => status,
    sync: flush,
    refresh,
    setPresence: presence.set,
    stop: () => {
      presence.stop();
      liveness.stop();
      link.stop();
    },
  };
};
