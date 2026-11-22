# Сервер

Сервер ваш: редактор знает только транспорт и протокол сообщений.

Участник применяет свои правки сразу и отправляет их серверу. Сервер проверяет каждую правку на
своей копии документа, записывает в журнал и рассылает остальным. Опоздавшую правку он переносит
через чужие, и все получают одинаковый документ.

Транспорт и протокол открыты. Напишите сервер на любом языке и разместите где угодно, а на Node
соберите его из готовой комнаты.

## Транспорт

Транспорт доставляет сообщения между редактором и сервером. Это объект с одним методом `open`:
клиент вызывает его при подключении и передаёт слушателя.

- `opened()` — соединение готово, клиент сразу отправляет `hello`.
- `message(value)` — пришло сообщение сервера, уже разобранное из JSON. Поля проверяет клиент.
- `closed()` — связь пропала. Переподключается клиент: через паузу он снова вызовет `open`, пауза
  растёт с каждой попыткой, её границы задаёт опция `retry`.

`open` возвращает соединение с методами `send(message)` и `close()`. Так устроен
`webSocketTransport`:

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

По тому же образцу пишется транспорт поверх Socket.IO, WebRTC или соединения, которое приложение
уже держит. Передайте его в `transport` у `useCollabEditor`.

<SignatureReference :names="['CollabTransport', 'TransportListener', 'TransportConnection']" />

## Протокол

Одно сообщение — один JSON-объект, вид сообщения задаёт поле `kind`. По WebSocket каждое сообщение
идёт отдельным текстовым кадром.

| Сообщение клиента | Поля                                   | Смысл                                          |
| ----------------- | -------------------------------------- | ---------------------------------------------- |
| `hello`           | `doc`, `clientId`, `version`, `schema` | Вход в документ, `version: null` просит снимок |
| `steps`           | `seq`, `version`, `steps`              | Пачка правок, написанных от версии `version`   |
| `pull`            | `from`                                 | Прислать журнал начиная с версии `from`        |
| `presence`        | `state`                                | Курсор и имя участника, `null` убирает их      |
| `ping`            | —                                      | Проверка связи, когда сервер давно молчит      |

| Сообщение сервера | Поля                                    | Смысл                                                         |
| ----------------- | --------------------------------------- | ------------------------------------------------------------- |
| `welcome`         | `version`, `presence`, `snapshot?`      | Ответ на `hello`, снимок — если клиент его просил             |
| `accepted`        | `seq`, `version`, `steps?`              | Пачка записана, `steps` — шаги после переноса                 |
| `rejected`        | `seq`, `reason`, `version`              | Пачка не записана: `stale` или `invalid`                      |
| `steps`           | `version`, `clientId`, `steps`, `sent?` | Шаги из журнала для остальных участников                      |
| `presence`        | `clientId`, `state`                     | Присутствие другого участника, `null` — участник ушёл         |
| `pong`            | —                                       | Ответ на `ping`                                               |
| `error`           | `code`                                  | `schema` — схема не совпала, `protocol` — нарушение протокола |

Версия документа — число шагов в журнале. Что сервер обязан делать:

- обрабатывать сообщения одного документа строго по очереди;
- проверять каждый шаг на своей копии документа и не записывать пачку частично;
- переносить опоздавшую пачку через пропущенные шаги или отвечать `stale`;
- хранить журнал целиком: клиент, долго работавший без сети, запросит `pull` от старой версии;
- закрывать молчащие соединения, иначе курсор ушедшего участника останется у остальных.

Типы всех сообщений экспортирует `@numior/kit/collaboration`: `ClientMessage`, `ServerMessage` и вложенные
в них. `parseClientMessage` из `@numior/kit/collaboration/room` проверяет поля сообщения клиента,
`parseServerMessage` — сообщения сервера.

<SignatureReference :names="['parseClientMessage', 'parseServerMessage']" />

## Сервер на Node

Соберите сервер из `createRoom` и `editorAuthority`: комната держит участников одного документа и
выполняет протокол, а `editorAuthority` проверяет правки по схеме. Пример с пакетом `ws`:

```ts
import { WebSocketServer } from 'ws';
import { ClientMessageKind, type ClientMessage } from '@numior/kit/collaboration';
import {
  createRoom,
  editorAuthority,
  parseClientMessage,
  type Room,
  type RoomPeer,
} from '@numior/kit/collaboration/room';
import { contentSchema } from '@numior/kit/content';
import { createEmptyDoc } from '@numior/kit/editor-core';

const rooms = new Map<string, Room>();

const newRoom = (): Room => createRoom(editorAuthority(createEmptyDoc(contentSchema)));

const roomOf = (doc: string): Room => {
  const room = rooms.get(doc) ?? newRoom();

  rooms.set(doc, room);
  return room;
};

const readFrame = (data: unknown): ClientMessage | undefined => {
  try {
    return parseClientMessage(JSON.parse(String(data)));
  } catch {
    return undefined;
  }
};

const server = new WebSocketServer({ port: 4175 });

server.on('connection', (socket) => {
  let session: { readonly room: Room; readonly peer: RoomPeer } | undefined;

  const receive = (message: ClientMessage): void => {
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
      send: (reply) => socket.send(JSON.stringify(reply)),
      drop: () => socket.close(4001),
    };

    session = room.join(peer, message) ? { room, peer } : undefined;
  };

  socket.on('message', (data) => {
    const message = readFrame(data);

    if (message === undefined) {
      socket.close(1008);
      return;
    }
    receive(message);
  });

  socket.on('close', () => {
    session?.room.leave(session.peer);
  });
});
```

Первое сообщение клиента — `hello` с ключом документа, по нему сервер выбирает комнату.
`parseClientMessage` проверяет поля сообщения по протоколу: сообщение, которое не разбирается,
закрывает соединение.

Документ для новой комнаты прочитайте из своей базы: `editorAuthority` принимает его как `Doc`.
Чтобы сохранять правки, держите ссылку на `editorAuthority` и пишите в базу её `snapshot()`.

Комната держит журнал правок в памяти процесса. После перезапуска сервера открытые вкладки получат
сбой `diverged`. Если журнал должен пережить перезапуск, напишите комнату по
[протоколу](#протокол) и храните журнал в базе.

<SignatureReference :names="['createRoom', 'Room', 'RoomPeer']" />

### Проверка правок

Каждую пачку правок комната передаёт объекту `RoomAuthority`. Его `apply` применяет шаги к своей
копии документа и возвращает `false`, если шаг не подходит, а `snapshot` отдаёт документ новым
участникам. `rebase` переносит опоздавшую пачку через пропущенные шаги; без него комната отвечает
на такую пачку `stale`.

`editorAuthority` проверяет документы редактора, `workbookAuthority` — книги. Для своего вида
документа напишите свой объект с теми же методами.

`editorAuthority` переносит опоздавшую правку через 4096 последних шагов. Окно меняет опция
`window`: правку старше окна клиент переносит сам и отправляет снова.

<SignatureReference :names="['RoomAuthority', 'editorAuthority', 'EditorAuthorityOptions']" />

### Книга

Для документов книги передайте в комнату `workbookAuthority` из `@numior/kit/spreadsheet/core`:

```ts
import { workbookAuthority } from '@numior/kit/spreadsheet/core';

const room = createRoom(workbookAuthority([{ kind: 'addSheet', name: 'Лист1', index: 0 }]));
```

Комната та же, меняется только проверка правок. Шаги, которые передаются в `workbookAuthority`,
строят начальную книгу.

## Проверьте доступ

Проверяйте пользователя при подключении: в протоколе нет токенов и прав.

```ts
server.on('connection', (socket, request) => {
  const user = userFromCookie(request.headers.cookie);

  if (user === undefined) {
    socket.close(4401);
    return;
  }

  serve(socket, user);
});
```

Там же решите, можно ли пользователю в документ из `hello`. `clientId` присылает браузер, поэтому
его связь с пользователем храните на сервере.

## Комната в странице

Создайте комнаты в памяти страницы через `createLoopback`, когда сервер не нужен: в демо и тестах.

```ts
import { createLoopback, editorAuthority } from '@numior/kit/collaboration/room';
import { contentSchema } from '@numior/kit/content';
import { fromHTML } from '@numior/kit/editor-core';

const loopback = createLoopback({
  authorityFor: () => editorAuthority(fromHTML(contentSchema, product.descriptionHtml)),
  latency: 80,
});

const annaLink = loopback.link();
const mariaLink = loopback.link();
```

Каждый `link()` — транспорт одного участника, его передают в `transport` у `useCollabEditor`.
Сообщения идут через JSON и таймер, как по сети, а `latency` задаёт задержку в миллисекундах.
`setOnline(false)` обрывает связь участника, `setOnline(true)` возвращает её.

<SignatureReference :names="['createLoopback', 'LoopbackOptions', 'LoopbackLink']" />

## Yjs

Подключите `yjsBinding` из `@numior/kit/collaboration/yjs`, если документы уже живут в Yjs. Документ
хранится в `Y.Doc`, а доставку правок и сервер выбираете вы.

Yjs в Numior UI не входит, поставьте его рядом:

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
import * as Y from 'yjs';
import { yjsBinding } from '@numior/kit/collaboration/yjs';

const ydoc = new Y.Doc();

const binding = yjsBinding(ydoc, 'document', {
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

Передайте `binding.plugin` в `plugins` редактора без `useCollabEditor`, а `api` получите через
`useTemplateRef`, как при подключении документа. Пустой `Y.Doc` заполняет `seed(doc)`, а `read()`
читает из него документ для редактора.

Второй аргумент — имя документа в `Y.Doc`. Блоки лежат в `Y.Map` с этим именем, каждый под своим id,
а порядок блоков верхнего уровня — в `Y.Array` с именем `document:order`.

Строка блока — `Y.XmlText`, у контейнера свой список id детей. Тип блока лежит в поле `nui:type`,
у абзаца этого поля нет.

Перенос блока переставляет id в списках, а сам блок не трогает: текст, который соавтор набирает
в переносимом блоке, остаётся на месте.

Если двое одновременно перенесли один блок в разные места, он остаётся на первом из них по порядку
документа. Блок, перенесённый в цитату, которую соавтор в это же время удалил, встаёт в конец документа.

Если дерево Yjs не подходит к схеме, связка вызывает `onInvalid` и ничего в него не пишет: закройте
редактор для правки. Курсоров соавторов и списка участников связка не даёт, а `destroy()` отписывает
её от `Y.Doc`.

<SignatureReference :names="['yjsBinding', 'YjsBindingOptions', 'YjsBinding']" />
