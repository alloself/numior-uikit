# Server

The server is yours: the editor knows only the transport and the protocol of messages.

The server sets the one order of edits. It keeps a log of steps, and the version of a document is
the number of steps in the log. A client applies its own steps at once and sends them from the
version it knows.

When someone else was first, the server rebases the late batch over the steps it missed and
writes the result. The author gets the written steps back, and they replace the ones it sent.

The contract is open, so the server can run in any language and on any hosting. On Node, build it
from the ready room in `@numior/kit/collaboration/room`.

## Transport

A transport is an object with one method, `open(listener)`. It opens a connection, reports its
events to the listener and returns an object with `send` and `close`:

| Listener event   | When to call it                                                       |
| ---------------- | --------------------------------------------------------------------- |
| `opened()`       | The connection is open; the client sends `hello` right away           |
| `message(value)` | A message arrived; pass the parsed JSON, the client checks its fields |
| `closed()`       | The connection is gone; the client reconnects by itself               |

The events may come at any moment, even before `open` returns. A transport must keep the order of
messages within one connection.

`webSocketTransport` from `@numior/kit/collaboration` is the whole transport for WebSocket:

```ts
import type { CollabTransport } from '@numior/kit/collaboration';

const parsed = (data: unknown): unknown => {
  if (typeof data !== 'string') {
    return undefined;
  }
  try {
    return JSON.parse(data);
  } catch {
    return undefined;
  }
};

export const webSocketTransport = (url: string | URL): CollabTransport => ({
  open: (listener) => {
    const socket = new WebSocket(url);

    socket.addEventListener('open', () => {
      listener.opened();
    });

    socket.addEventListener('message', (event) => {
      listener.message(parsed(event.data));
    });

    socket.addEventListener('close', () => {
      listener.closed();
    });

    return {
      send: (message) => {
        socket.send(JSON.stringify(message));
      },
      close: () => {
        socket.close();
      },
    };
  },
});
```

A transport over WebRTC or over a connection your app already keeps is written the same way.
After a close, the client waits a pause that grows from 200 ms to 10 s and opens the transport
again.

<SignatureReference :names="['CollabTransport', 'TransportListener', 'TransportConnection']" />

## Protocol

Each message is one JSON object, and its `kind` field names the message. Over WebSocket a message
travels as one text frame.

The client sends:

| `kind`     | Fields                                 | Meaning                                                          |
| ---------- | -------------------------------------- | ---------------------------------------------------------------- |
| `hello`    | `doc`, `clientId`, `version`, `schema` | Opens the session; `version: null` asks for a snapshot           |
| `steps`    | `seq`, `version`, `steps`              | A batch of steps written from `version`; `seq` matches the reply |
| `pull`     | `from`                                 | Asks for the log from version `from`                             |
| `presence` | `state`                                | Where the sender is, as any JSON; `null` removes it              |
| `ping`     | none                                   | Checks a connection that has been silent for a while             |

The server replies:

| `kind`     | Fields                                  | Meaning                                                                    |
| ---------- | --------------------------------------- | -------------------------------------------------------------------------- |
| `welcome`  | `version`, `presence`, `snapshot?`      | Answers `hello`; the snapshot comes only for `version: null`               |
| `accepted` | `seq`, `version`, `steps?`              | The batch is written; `steps` are the steps written in its place           |
| `rejected` | `seq`, `reason`, `version`              | The batch is refused as `stale` or `invalid`; `version` is the current one |
| `steps`    | `version`, `clientId`, `steps`, `sent?` | Steps from the log; `version` is the one before the first step             |
| `presence` | `clientId`, `state`                     | Where another participant is; `null` when they leave                       |
| `pong`     | none                                    | Answers `ping`                                                             |
| `error`    | `code`                                  | `schema` when the schemas differ, `protocol` when a rule is broken         |

For an editor document, the snapshot is what `toJSON` from `@numior/kit/editor-core` returns. The
server does not need to read presence: it passes the state on as it came.

### What the server does

1. Handle the messages of one document strictly one by one. Checking the version and writing to
   the log is one atomic operation.
2. On `hello`, compare `schema` with the document and answer `error` with `schema` when they
   differ, or `welcome` otherwise.
3. When a `hello` comes with a `clientId` that is already in the room, drop the old connection.
   The others get its presence as `null`.
4. On `steps` from the current version, apply the steps, answer `accepted` and send `steps` to
   everyone else. A step that does not apply means `rejected` with `invalid`, and the log stays.
5. On `steps` from an older version, rebase the batch over the missed steps, write it and return
   the written steps in `accepted`. When rebasing is impossible, answer `rejected` with `stale`.
6. Check every step against the schema and apply it to the server copy before writing it. Never
   trust the steps of a client.
7. On `pull`, send every step from `from` in `steps` messages. A `from` past the current version
   is a `protocol` error.
8. On `presence`, remember the state and pass it on, and send `state: null` when a participant
   disconnects.
9. On `ping`, answer `pong` at once. Close connections that stop answering, or a lost participant
   stays present for everyone else.
10. Answer `error` with `protocol` to a message that cannot be read and to a second `hello`.
11. Never cut the log. A client that worked offline for a long time asks for steps from its old
    version.

The message types come from `@numior/kit/collaboration`: `ClientMessage`, `ServerMessage` and the
types of single messages, such as `HelloMessage` and `StepsMessage`.

`parseClientMessage` from `@numior/kit/collaboration/room` turns a parsed JSON value into a client
message, and `parseServerMessage` does the same on the client side. Both return `undefined` for a
message that breaks the format.

<SignatureReference :names="['parseClientMessage', 'parseServerMessage']" />

## Server on Node

`createRoom` takes an authority over one document and returns a room. Call `join` with the peer
and its `hello`, `receive` for every next message and `leave` when the socket closes:

```ts
import { WebSocketServer, type RawData } from 'ws';
import {
  ClientMessageKind,
  ServerErrorCode,
  ServerMessageKind,
  type ServerMessage,
} from '@numior/kit/collaboration';
import {
  createRoom,
  editorAuthority,
  parseClientMessage,
  type Room,
  type RoomAuthority,
  type RoomPeer,
} from '@numior/kit/collaboration/room';
import { readDocument } from './documents';

const UNREADABLE = 1008;

const REPLACED = 4001;

const authorities = new Map<string, RoomAuthority>();

const rooms = new Map<string, Room>();

const roomOf = (doc: string): Room => {
  const known = rooms.get(doc);

  if (known !== undefined) {
    return known;
  }

  const authority = editorAuthority(readDocument(doc));
  const room = createRoom(authority);

  authorities.set(doc, authority);
  rooms.set(doc, room);
  return room;
};

const parsed = (data: RawData): unknown => {
  try {
    return JSON.parse(data.toString());
  } catch {
    return undefined;
  }
};

const server = new WebSocketServer({ port: 4175 });

server.on('connection', (socket) => {
  let session: { readonly room: Room; readonly peer: RoomPeer } | undefined;

  const send = (message: ServerMessage) => {
    socket.send(JSON.stringify(message));
  };

  socket.on('message', (data) => {
    const message = parseClientMessage(parsed(data));

    if (message === undefined) {
      send({ kind: ServerMessageKind.Error, code: ServerErrorCode.Protocol });
      socket.close(UNREADABLE);
      return;
    }
    if (session !== undefined) {
      session.room.receive(session.peer, message);
      return;
    }
    if (message.kind !== ClientMessageKind.Hello) {
      return;
    }

    const room = roomOf(message.doc);

    const peer: RoomPeer = {
      clientId: message.clientId,
      send,
      drop: () => {
        socket.close(REPLACED);
      },
    };

    session = room.join(peer, message) ? { room, peer } : undefined;
  });

  socket.on('close', () => {
    session?.room.leave(session.peer);
  });
});
```

`readDocument` stands for your database: it returns the saved document, for example
`fromHTML(contentSchema, html)`. Store `snapshot()` of each authority from time to time:

```ts
import { writeDocument } from './documents';

const saveDocuments = () => {
  for (const [doc, authority] of authorities) {
    writeDocument(doc, authority.snapshot());
  }
};

setInterval(saveDocuments, 30_000);
```

The room keeps its log in memory and starts again from version 0 after a restart. Clients that
knew a later version then stop with `diverged` and open the document anew with Open again.

<SignatureReference :names="['createRoom', 'Room', 'RoomPeer']" />

### Check the edits

The room knows the document only through an authority with `schema`, `snapshot`, `apply` and an
optional `rebase`. `apply` returns `false` for a step that does not fit, and the batch is rejected
as `invalid`.

`rebase` moves a late batch over the steps it missed and returns the written steps. Without it,
the room answers `stale` to every late batch, and the client catches up and sends it again.

`editorAuthority(doc)` is the authority for an editor document. It checks each step against the
schema and keeps the last 4096 steps for rebasing; the `window` option changes that number. For
a document of your own kind, write an object with the same fields.

<SignatureReference :names="['RoomAuthority', 'editorAuthority', 'EditorAuthorityOptions']" />

### Workbook

A spreadsheet book goes through the same room with `workbookAuthority` from
`@numior/kit/spreadsheet/core`:

```ts
import { createRoom } from '@numior/kit/collaboration/room';
import { bookSteps, workbookAuthority } from '@numior/kit/spreadsheet/core';
import { readBook } from './books';

const { book, calculator } = readBook('price-list');

const room = createRoom(workbookAuthority(bookSteps(book, calculator)));
```

`bookSteps` returns the steps that build the saved book from an empty one. The client side of a
book is on the [Spreadsheet](/en/components/spreadsheet) page.

## Check access

The protocol carries no tokens and no rights: `hello` names only the document and the client.
Check the user from the request of the connection, by a cookie or a parameter of the address:

```ts
import type { IncomingMessage } from 'node:http';
import { mayOpen, userOf } from './users';

const FORBIDDEN = 4401;

const allowed = (request: IncomingMessage, doc: string): boolean => {
  const user = userOf(request.headers.cookie);

  return user !== undefined && mayOpen(user, doc);
};
```

Take `request` as the second argument of the `connection` handler, and check it on `hello`
before the socket joins the room:

```ts
if (!allowed(request, message.doc)) {
  socket.close(FORBIDDEN);
  return;
}
```

`clientId` comes from the client, so tie it to the user on the server yourself.

The client takes a closed socket for a lost connection and keeps trying with a growing pause.

## Room in the page

`createLoopback` keeps rooms in the memory of the page, so demos and tests run without a server.
Each `link()` is the transport of one client:

```ts
import { contentSchema } from '@numior/kit/content';
import { createLoopback, editorAuthority } from '@numior/kit/collaboration/room';
import { fromHTML } from '@numior/kit/editor-core';

const room = createLoopback({
  authorityFor: () => editorAuthority(fromHTML(contentSchema, '<p>Oslo armchair</p>')),
  latency: 80,
});

const annaLink = room.link();
const mariaLink = room.link();
```

Messages pass through JSON and a timer, as over a network, and `latency` sets the delay in
milliseconds. `setOnline(false)` cuts one link off until `setOnline(true)` brings it back.

<SignatureReference :names="['createLoopback', 'LoopbackOptions', 'LoopbackLink']" />

## Yjs

`@numior/kit/collaboration/yjs` keeps the document in a shared Yjs document. It works without this
protocol: there are no steps and no log, and you choose how the Yjs document travels.

Yjs does not ship with Numior UI, so add it to your app:

::: code-group

```sh [pnpm]
pnpm add yjs
```

```sh [npm]
npm install yjs
```

```sh [yarn]
yarn add yjs
```

```sh [bun]
bun add yjs
```

:::

```ts
import { computed, useTemplateRef } from 'vue';
import { Doc } from 'yjs';
import { yjsBinding } from '@numior/kit/collaboration/yjs';
import { contentSchema } from '@numior/kit/content';
import type { NuiEditorApi } from '@numior/kit/editor';

const editor = useTemplateRef<{ editor: NuiEditorApi }>('editor');

const api = computed(() => editor.value?.editor);

const shared = new Doc();

const binding = yjsBinding(shared, 'description', {
  schema: contentSchema,
  getState: () => api.value?.state(),
  dispatch: (tr) => {
    api.value?.run((_state, apply) => {
      apply?.(tr);
      return true;
    });
  },
});
```

Give `binding.plugin` to the editor in `plugins`. `read()` returns the shared document once it has
arrived, and `seed(doc)` fills an empty one. There is no presence: carets and avatars need a
channel of your own.

The second argument names the document inside the `Y.Doc`. Blocks live in a `Y.Map` of that name,
each under its id. The order of top-level blocks lives in a `Y.Array` named `description:order`.

A block with a line of text is a `Y.XmlText`, and a container keeps a list of its children's ids.
Moving a block moves only its id between lists. Text a coauthor types into the block while it moves
stays put.

When two people move one block to different places at once, it stays at the first of them in
document order. A block moved into a quote that a coauthor deleted at the same time goes to the end
of the document.

<SignatureReference :names="['yjsBinding', 'YjsBindingOptions', 'YjsBinding']" />
