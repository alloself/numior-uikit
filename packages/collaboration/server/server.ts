import { WebSocketServer, type RawData, type WebSocket } from 'ws';
import {
  ClientMessageKind,
  ServerErrorCode,
  ServerMessageKind,
  type HelloMessage,
  type ServerMessage,
} from '../src/protocol/protocol.types.ts';
import { parseClientMessage } from './client-messages.ts';
import { createRoom, type Room, type RoomAuthority, type RoomPeer } from './room.ts';

interface Session {
  readonly room: Room;
  readonly peer: RoomPeer;
}

export interface CollabServerOptions {
  readonly port: number;
  readonly authorityFor: (doc: string) => RoomAuthority;
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

const sender =
  (socket: WebSocket) =>
  (message: ServerMessage): void => {
    socket.send(JSON.stringify(message));
  };

export const startCollabServer = async ({
  port,
  authorityFor,
}: CollabServerOptions): Promise<CollabServer> => {
  const server = new WebSocketServer({ port });
  const rooms = new Map<string, Room>();

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
    const peer: RoomPeer = { clientId: hello.clientId, send: sender(socket) };

    return room.join(peer, hello) ? { room, peer } : undefined;
  };

  server.on('connection', (socket) => {
    let session: Session | undefined;

    socket.on('message', (data) => {
      const message = parseClientMessage(parsed(data));

      if (message === undefined) {
        sender(socket)({ kind: ServerMessageKind.Error, code: ServerErrorCode.Protocol });
      } else if (session !== undefined) {
        session.room.receive(session.peer, message);
      } else if (message.kind === ClientMessageKind.Hello) {
        session = joined(socket, message);
      }
    });

    socket.on('close', () => {
      session?.room.leave(session.peer);
    });
  });

  await new Promise((resolve) => {
    server.once('listening', resolve);
  });

  return {
    port: () => {
      const address = server.address();

      return address !== null && typeof address === 'object' ? address.port : port;
    },
    close: async () => {
      for (const client of server.clients) {
        client.terminate();
      }

      await new Promise((resolve) => {
        server.close(resolve);
      });
    },
  };
};
