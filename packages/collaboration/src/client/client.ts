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
} from '../protocol/protocol.types';
import {
  CollabFailure,
  CollabStatusKind,
  type CollabClient,
  type CollabClientOptions,
  type CollabStatus,
} from './client.types';
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

  const fail = (reason: CollabFailure): void => {
    setStatus({ kind: CollabStatusKind.Failed, reason });
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

    const own =
      message.clientId === clientId ? Math.min(steps.length, document.pending().length) : 0;

    if (own > 0) {
      document.confirm(own, local + own);
    }
    if (own < steps.length) {
      const batch = { version: local + own, clientId: message.clientId, steps: steps.slice(own) };

      if (!document.receive(batch)) {
        fail(CollabFailure.Document);
        return;
      }
    }
    flush();
  };

  const onAccepted = (message: AcceptedMessage): void => {
    if (message.seq === inFlight?.seq) {
      document.confirm(inFlight.count, message.version);
      inFlight = undefined;
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
    },
    message: (value) => {
      const message = parseServerMessage(value);

      if (message === undefined) {
        fail(CollabFailure.Protocol);
      } else {
        onMessage(message);
      }
    },
    closed: () => {
      inFlight = undefined;
      presence.offline();

      if (status.kind !== CollabStatusKind.Failed) {
        setStatus({ kind: CollabStatusKind.Offline });
      }
    },
  });

  return {
    status: () => status,
    sync: flush,
    refresh: () => {
      const local = document.version();

      if (local !== null && status.kind === CollabStatusKind.Online) {
        link.send({ kind: ClientMessageKind.Pull, from: local });
      }
    },
    setPresence: presence.set,
    stop: () => {
      presence.stop();
      link.stop();
    },
  };
};
