import { vi } from 'vite-plus/test';
import type { Room, RoomPeer } from '../../src/room';
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
  readonly cut: () => void;
  readonly relink: () => void;
  readonly late: () => boolean;
  readonly toServer: () => boolean;
  readonly toClient: () => boolean;
}

interface Pumped {
  readonly toServer: () => boolean;
  readonly toClient: () => boolean;
}

interface Mended extends Pumped {
  readonly relink: () => void;
  readonly late: () => boolean;
}

interface Line {
  readonly peer: RoomPeer;
  readonly listener: TransportListener;
  readonly toServer: ClientMessage[];
  readonly toClient: ServerMessage[];
  opened: boolean;
}

export const RETRY = { base: 1, max: 1 };

const overTheWire = (value: unknown): unknown => JSON.parse(JSON.stringify(value));

export const createTraffic = (): TrafficCount => ({ submits: 0, rejections: 0, deliveries: 0 });

export const createWire = (room: Room, clientId: string, traffic: TrafficCount): Wire => {
  const ghosts: Line[] = [];
  let live: Line | undefined;

  const retire = (line: Line): void => {
    if (live !== line) {
      return;
    }

    live = undefined;
    ghosts.push(line);
  };

  const lose = (line: Line): void => {
    line.toServer.length = 0;

    if (live !== line) {
      return;
    }

    live = undefined;
    line.listener.closed();
  };

  const lineOf = (listener: TransportListener): Line => {
    const line: Line = {
      listener,
      toServer: [],
      toClient: [],
      opened: false,
      peer: {
        clientId,
        send: (message) => {
          line.toClient.push(message);
        },
        drop: () => {
          lose(line);
        },
      },
    };

    return line;
  };

  const deliver = (line: Line, message: ClientMessage): void => {
    if (message.kind === ClientMessageKind.Hello) {
      room.join(line.peer, message);
      return;
    }

    traffic.submits += Number(message.kind === ClientMessageKind.Steps);
    room.receive(line.peer, message);
  };

  const show = (): void => {
    const line = live;

    if (line === undefined || line.opened) {
      return;
    }

    line.opened = true;
    line.listener.opened();
  };

  return {
    transport: {
      open: (listener) => {
        const line = lineOf(listener);

        live = line;

        return {
          send: (message) => {
            line.toServer.push(message);
          },
          close: () => {
            retire(line);
          },
        };
      },
    },
    open: show,
    cut: () => {
      const line = live;

      if (line?.opened !== true) {
        return;
      }

      retire(line);
      line.listener.closed();
    },
    relink: () => {
      vi.advanceTimersByTime(RETRY.max);
      show();
    },
    late: () => {
      const [ghost] = ghosts;
      const message = ghost?.toServer.shift();

      if (ghost === undefined) {
        return false;
      }
      if (message === undefined) {
        ghosts.shift();
        room.leave(ghost.peer);
        return true;
      }

      deliver(ghost, message);
      return true;
    },
    toServer: () => {
      const line = live;
      const message = line?.toServer.shift();

      if (line === undefined || message === undefined) {
        return false;
      }

      deliver(line, message);
      return true;
    },
    toClient: () => {
      const line = live;
      const message = line?.toClient.shift();

      if (line === undefined || message === undefined) {
        return false;
      }

      traffic.rejections += Number(message.kind === ServerMessageKind.Rejected);
      traffic.deliveries += 1;
      line.listener.message(overTheWire(message));
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

export const mendAll = (clients: readonly Mended[]): void => {
  let late = true;

  while (late) {
    clients.forEach((client) => {
      client.relink();
    });

    settleAll(clients);
    late = clients.reduce((any, client) => client.late() || any, false);
  }
};
