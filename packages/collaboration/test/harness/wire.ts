import type { Room, RoomPeer } from '../../server/room';
import {
  ClientMessageKind,
  ServerMessageKind,
  type ClientMessage,
  type CollabTransport,
  type ServerMessage,
  type TransportListener,
} from '../../src';

export interface NetworkTraffic {
  readonly submits: number;
  readonly rejections: number;
  readonly deliveries: number;
}

export interface TrafficCount {
  submits: number;
  rejections: number;
  deliveries: number;
}

export interface Wire {
  readonly transport: CollabTransport;
  readonly open: () => void;
  readonly toServer: () => boolean;
  readonly toClient: () => boolean;
}

interface Pumped {
  readonly toServer: () => boolean;
  readonly toClient: () => boolean;
}

const overTheWire = (value: unknown): unknown => JSON.parse(JSON.stringify(value));

export const createTraffic = (): TrafficCount => ({ submits: 0, rejections: 0, deliveries: 0 });

export const createWire = (room: Room, clientId: string, traffic: TrafficCount): Wire => {
  const toServer: ClientMessage[] = [];
  const toClient: ServerMessage[] = [];
  let listener: TransportListener | undefined;

  const peer: RoomPeer = {
    clientId,
    send: (message) => {
      toClient.push(message);
    },
  };

  return {
    transport: {
      open: (opened) => {
        listener = opened;

        return {
          send: (message) => {
            toServer.push(message);
          },
          close: () => {
            listener = undefined;
          },
        };
      },
    },
    open: () => {
      listener?.opened();
    },
    toServer: () => {
      const message = toServer.shift();

      if (message === undefined) {
        return false;
      }
      if (message.kind === ClientMessageKind.Hello) {
        room.join(peer, message);
      } else {
        traffic.submits += Number(message.kind === ClientMessageKind.Steps);
        room.receive(peer, message);
      }
      return true;
    },
    toClient: () => {
      const message = toClient.shift();

      if (message === undefined) {
        return false;
      }
      traffic.rejections += Number(message.kind === ServerMessageKind.Rejected);
      traffic.deliveries += 1;
      listener?.message(overTheWire(message));
      return true;
    },
  };
};

export const settleAll = (clients: readonly Pumped[]): void => {
  let moved = true;

  while (moved) {
    moved = clients.reduce(
      (any, client) => [client.toServer(), client.toClient()].some(Boolean) || any,
      false,
    );
  }
};
