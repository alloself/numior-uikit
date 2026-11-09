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
} from '../src/protocol/protocol.types.ts';
import { createStepLog } from './log.ts';

export interface RoomAuthority {
  readonly schema: SchemaStamp;
  readonly snapshot: () => unknown;
  readonly apply: (steps: readonly WireStep[]) => boolean;
}

export interface RoomPeer {
  readonly clientId: string;
  readonly send: (message: ServerMessage) => void;
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

  const protocolError = (peer: RoomPeer): void => {
    peer.send({ kind: ServerMessageKind.Error, code: ServerErrorCode.Protocol });
  };

  const reject = (peer: RoomPeer, seq: number, reason: RejectReason): void => {
    peer.send({ kind: ServerMessageKind.Rejected, seq, reason, version: log.version() });
  };

  const onSteps = (peer: RoomPeer, message: SendStepsMessage): void => {
    const version = log.version();

    if (message.version !== version) {
      reject(peer, message.seq, RejectReason.Stale);
      return;
    }
    if (!authority.apply(message.steps)) {
      reject(peer, message.seq, RejectReason.Invalid);
      return;
    }
    log.append(message.steps, peer.clientId);
    peer.send({ kind: ServerMessageKind.Accepted, seq: message.seq, version: log.version() });

    for (const other of peers) {
      if (other !== peer) {
        other.send({
          kind: ServerMessageKind.Steps,
          version,
          clientId: peer.clientId,
          steps: message.steps,
        });
      }
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

  return {
    join: (peer, hello) => {
      if (!sameStamp(hello.schema, authority.schema)) {
        peer.send({ kind: ServerMessageKind.Error, code: ServerErrorCode.Schema });
        return false;
      }
      peers.add(peer);

      peer.send({
        kind: ServerMessageKind.Welcome,
        version: log.version(),
        ...(hello.version === null ? { snapshot: authority.snapshot() } : {}),
      });

      return true;
    },
    receive: (peer, message) => {
      switch (message.kind) {
        case ClientMessageKind.Steps:
          onSteps(peer, message);
          break;
        case ClientMessageKind.Pull:
          onPull(peer, message);
          break;
        case ClientMessageKind.Hello:
          protocolError(peer);
          break;
      }
    },
    leave: (peer) => {
      peers.delete(peer);
    },
  };
};
