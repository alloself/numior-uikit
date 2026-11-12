import { WebSocketServer, type RawData, type WebSocket } from 'ws';
import {
  ClientMessageKind,
  ServerErrorCode,
  ServerMessageKind,
  type HelloMessage,
  type ServerMessage,
} from '../src/protocol/protocol.types.ts';
import { parseClientMessage } from '../src/room/client-messages.ts';
import { createRoom, type Room, type RoomAuthority, type RoomPeer } from '../src/room/room.ts';

interface Session {
  readonly room: Room;
  readonly peer: RoomPeer;
}

export interface CollabServerOptions {
  readonly port: number;
  readonly authorityFor: (doc: string) => RoomAuthority;
  readonly heartbeat?: number | undefined;
  readonly onError?: ((error: unknown) => void) | undefined;
}

export interface CollabServer {
  readonly port: () => number;
  readonly close: () => Promise<void>;
}

const parsed = (data: RawData): unknown => {
  try {
    return Buffer.isBuffer(data) ? JSON.parse(data.toString('utf8')) : undefined;
  } catch {
    return undefined;
  }
};

const INTERNAL_ERROR = 1011;

const SUPERSEDED = 4001;

const HEARTBEAT = 30_000;

const sender =
  (socket: WebSocket) =>
  (message: ServerMessage): void => {
    socket.send(JSON.stringify(message));
  };

export const startCollabServer = async ({
  port,
  authorityFor,
  heartbeat = HEARTBEAT,
  onError,
}: CollabServerOptions): Promise<CollabServer> => {
  const server = new WebSocketServer({ port });
  const rooms = new Map<string, Room>();
  const heard = new WeakSet<WebSocket>();

  const sweep = (): void => {
    for (const client of server.clients) {
      if (heard.delete(client)) {
        client.ping();
      } else {
        client.terminate();
      }
    }
  };

  const beat = heartbeat > 0 ? setInterval(sweep, heartbeat) : undefined;

  const roomOf = (doc: string): Room => {
    const known = rooms.get(doc);

    if (known !== undefined) {
      return known;
    }

    const room = createRoom(authorityFor(doc));

    rooms.set(doc, room);
    return room;
  };

  const joined = (socket: WebSocket, hello: HelloMessage): Session | undefined => {
    const room = roomOf(hello.doc);

    const peer: RoomPeer = {
      clientId: hello.clientId,
      send: sender(socket),
      drop: () => {
        socket.close(SUPERSEDED);
      },
    };

    return room.join(peer, hello) ? { room, peer } : undefined;
  };

  server.on('connection', (socket) => {
    let session: Session | undefined;

    heard.add(socket);

    socket.on('pong', () => {
      heard.add(socket);
    });

    const receive = (data: RawData): void => {
      const message = parseClientMessage(parsed(data));

      if (message === undefined) {
        sender(socket)({ kind: ServerMessageKind.Error, code: ServerErrorCode.Protocol });
      } else if (session !== undefined) {
        session.room.receive(session.peer, message);
      } else if (message.kind === ClientMessageKind.Hello) {
        session = joined(socket, message);
      }
    };

    socket.on('message', (data) => {
      heard.add(socket);

      try {
        receive(data);
      } catch (error) {
        onError?.(error);
        socket.close(INTERNAL_ERROR);
      }
    });

    socket.on('close', () => {
      session?.room.leave(session.peer);
    });
  });

  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });

  return {
    port: () => {
      const address = server.address();

      return address !== null && typeof address === 'object' ? address.port : port;
    },
    close: async () => {
      clearInterval(beat);

      for (const client of server.clients) {
        client.terminate();
      }

      await new Promise((resolve) => {
        server.close(resolve);
      });
    },
  };
};
