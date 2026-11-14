import type { SchemaStamp } from '@numior/editor-core';
import {
  ClientMessageKind,
  RejectReason,
  ServerErrorCode,
  ServerMessageKind,
  type ClientMessage,
  type HelloMessage,
  type PullMessage,
  type SendStepsMessage,
  type ServerMessage,
  type WireStep,
} from '../protocol/protocol.types.ts';
import { createStepLog } from './log.ts';

export interface RoomAuthority {
  readonly schema: SchemaStamp;
  readonly snapshot: () => unknown;
  readonly apply: (steps: readonly WireStep[]) => boolean;
  readonly rebase?:
    | ((steps: readonly WireStep[], behind: number) => readonly WireStep[] | undefined)
    | undefined;
}

export interface RoomPeer {
  readonly clientId: string;
  readonly send: (message: ServerMessage) => void;
  readonly drop?: (() => void) | undefined;
}

export interface Room {
  readonly join: (peer: RoomPeer, hello: HelloMessage) => boolean;
  readonly receive: (peer: RoomPeer, message: ClientMessage) => void;
  readonly leave: (peer: RoomPeer) => void;
}

const sameStamp = (left: SchemaStamp, right: SchemaStamp): boolean =>
  left.name === right.name && left.version === right.version;

export const createRoom = (authority: RoomAuthority): Room => {
  const log = createStepLog();
  const peers = new Set<RoomPeer>();
  const presence = new Map<RoomPeer, unknown>();

  const announce = (from: RoomPeer, state: unknown): void => {
    for (const other of peers) {
      if (other === from) {
        continue;
      }

      other.send({ kind: ServerMessageKind.Presence, clientId: from.clientId, state });
    }
  };

  const onPresence = (peer: RoomPeer, state: unknown): void => {
    if (state === null) {
      presence.delete(peer);
    } else {
      presence.set(peer, state);
    }
    announce(peer, state);
  };

  const protocolError = (peer: RoomPeer): void => {
    peer.send({ kind: ServerMessageKind.Error, code: ServerErrorCode.Protocol });
  };

  const reject = (peer: RoomPeer, seq: number, reason: RejectReason): void => {
    peer.send({ kind: ServerMessageKind.Rejected, seq, reason, version: log.version() });
  };

  const taken = (message: SendStepsMessage, behind: number): readonly WireStep[] | undefined => {
    if (behind === 0) {
      return authority.apply(message.steps) ? message.steps : undefined;
    }
    return behind > 0 ? authority.rebase?.(message.steps, behind) : undefined;
  };

  const onSteps = (peer: RoomPeer, message: SendStepsMessage): void => {
    const version = log.version();
    const behind = version - message.version;
    const steps = taken(message, behind);

    if (steps === undefined) {
      reject(peer, message.seq, behind === 0 ? RejectReason.Invalid : RejectReason.Stale);
      return;
    }
    log.append(steps, peer.clientId, message.steps.length);

    peer.send({
      kind: ServerMessageKind.Accepted,
      seq: message.seq,
      version: log.version(),
      ...(behind === 0 ? {} : { steps }),
    });

    if (steps.length === 0) {
      return;
    }
    for (const other of peers) {
      if (other === peer) {
        continue;
      }

      other.send({ kind: ServerMessageKind.Steps, version, clientId: peer.clientId, steps });
    }
  };

  const onPull = (peer: RoomPeer, message: PullMessage): void => {
    if (message.from > log.version()) {
      protocolError(peer);
      return;
    }
    for (const batch of log.batchesSince(message.from)) {
      peer.send({ kind: ServerMessageKind.Steps, ...batch });
    }
  };

  const leave = (peer: RoomPeer): void => {
    peers.delete(peer);

    if (!presence.delete(peer)) {
      return;
    }

    announce(peer, null);
  };

  const supersede = (peer: RoomPeer): void => {
    for (const old of peers) {
      if (old.clientId !== peer.clientId) {
        continue;
      }

      leave(old);
      old.drop?.();
    }
  };

  return {
    join: (peer, hello) => {
      if (!sameStamp(hello.schema, authority.schema)) {
        peer.send({ kind: ServerMessageKind.Error, code: ServerErrorCode.Schema });
        return false;
      }
      supersede(peer);
      peers.add(peer);

      peer.send({
        kind: ServerMessageKind.Welcome,
        version: log.version(),
        presence: [...presence].map(([owner, state]) => ({ clientId: owner.clientId, state })),
        ...(hello.version === null ? { snapshot: authority.snapshot() } : {}),
      });

      return true;
    },
    receive: (peer, message) => {
      if (!peers.has(peer)) {
        return;
      }

      switch (message.kind) {
        case ClientMessageKind.Steps:
          onSteps(peer, message);
          break;
        case ClientMessageKind.Pull:
          onPull(peer, message);
          break;
        case ClientMessageKind.Presence:
          onPresence(peer, message.state);
          break;
        case ClientMessageKind.Ping:
          peer.send({ kind: ServerMessageKind.Pong });
          break;
        case ClientMessageKind.Hello:
          protocolError(peer);
          break;
      }
    },
    leave,
  };
};
