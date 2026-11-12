import {
  ClientMessageKind,
  ServerErrorCode,
  ServerMessageKind,
  type ClientMessage,
  type HelloMessage,
  type ServerMessage,
} from '../protocol/protocol.types.ts';
import type { CollabTransport, TransportListener } from '../client/client.types.ts';
import { parseClientMessage } from './client-messages.ts';
import { createRoom, type Room, type RoomAuthority, type RoomPeer } from './room.ts';

export interface LoopbackOptions {
  readonly authorityFor: (doc: string) => RoomAuthority;
  readonly latency?: number | undefined;
}

export interface LoopbackLink extends CollabTransport {
  readonly online: () => boolean;
  readonly setOnline: (online: boolean) => void;
}

export interface Loopback {
  readonly link: () => LoopbackLink;
}

interface Session {
  readonly room: Room;
  readonly peer: RoomPeer;
}

interface Line {
  readonly listener: TransportListener;
  session: Session | undefined;
  live: boolean;
}

const overTheWire = (value: unknown): unknown => JSON.parse(JSON.stringify(value));

export const createLoopback = ({ authorityFor, latency = 0 }: LoopbackOptions): Loopback => {
  const rooms = new Map<string, Room>();

  const deliver = (act: () => void): void => {
    setTimeout(act, latency);
  };

  const roomOf = (doc: string): Room => {
    const known = rooms.get(doc);

    if (known !== undefined) {
      return known;
    }

    const room = createRoom(authorityFor(doc));

    rooms.set(doc, room);
    return room;
  };

  const link = (): LoopbackLink => {
    const lines = new Set<Line>();
    const waiting = new Set<Line>();
    let online = true;

    const toClient = (line: Line, message: ServerMessage): void => {
      deliver(() => {
        if (!line.live) {
          return;
        }

        line.listener.message(overTheWire(message));
      });
    };

    const end = (line: Line): void => {
      if (!line.live) {
        return;
      }

      line.live = false;
      lines.delete(line);
      waiting.delete(line);
      line.session?.room.leave(line.session.peer);
      deliver(line.listener.closed);
    };

    const joined = (line: Line, hello: HelloMessage): Session | undefined => {
      const room = roomOf(hello.doc);

      const peer: RoomPeer = {
        clientId: hello.clientId,
        send: (message) => {
          toClient(line, message);
        },
        drop: () => {
          end(line);
        },
      };

      return room.join(peer, hello) ? { room, peer } : undefined;
    };

    const receive = (line: Line, value: unknown): void => {
      if (!line.live) {
        return;
      }

      const message = parseClientMessage(overTheWire(value));

      if (message === undefined) {
        toClient(line, { kind: ServerMessageKind.Error, code: ServerErrorCode.Protocol });
        return;
      }

      if (line.session !== undefined) {
        line.session.room.receive(line.session.peer, message);
        return;
      }

      if (message.kind !== ClientMessageKind.Hello) {
        return;
      }

      line.session = joined(line, message);
    };

    const start = (line: Line): void => {
      lines.add(line);

      deliver(() => {
        if (!line.live) {
          return;
        }

        line.listener.opened();
      });
    };

    return {
      open: (listener) => {
        const line: Line = { listener, session: undefined, live: true };

        if (online) {
          start(line);
        } else {
          waiting.add(line);
        }

        return {
          send: (message: ClientMessage) => {
            deliver(() => {
              receive(line, message);
            });
          },
          close: () => {
            end(line);
          },
        };
      },
      online: () => online,
      setOnline: (next) => {
        online = next;

        if (!next) {
          for (const line of lines) {
            end(line);
          }
          return;
        }

        for (const line of waiting) {
          start(line);
        }
        waiting.clear();
      },
    };
  };

  return { link };
};
