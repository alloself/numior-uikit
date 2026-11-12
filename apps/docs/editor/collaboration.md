# Совместная работа

Несколько человек правят один документ и видят курсоры друг друга.

<Example name="collaboration/TwoPanes" />

Печатайте в одной панели — текст и курсор появятся в другой.

## Установка

Установите пакет:

::: code-group

```sh [pnpm]
pnpm add @numior/collaboration
```

```sh [npm]
npm install @numior/collaboration
```

```sh [yarn]
yarn add @numior/collaboration
```

```sh [bun]
bun add @numior/collaboration
```

:::

Подключите стили в точке входа приложения:

```ts
import '@numior/collaboration/styles.css';
```

В них курсоры соавторов, отметки комментариев и панель версий.

## Подключение

### Откройте транспорт

Создайте транспорт до сервера, который задаёт порядок правок:

```ts
import { webSocketTransport } from '@numior/collaboration';

const transport = webSocketTransport('wss://shop.example.com/collab');
```

Каждое сообщение уходит кадром WebSocket с JSON внутри. Примеры на этих страницах обходятся без
сервера: комнату в памяти страницы создаёт `createLoopback`, о нём на странице
[«Сервер»](/editor/server#комната-в-странице).

<SignatureReference name="webSocketTransport" />

### Подключите документ

Передайте в `useCollabEditor` ключ документа, автора, схему, транспорт и редактор:

```ts
import { computed, useTemplateRef } from 'vue';
import { useCollabEditor } from '@numior/collaboration/vue';
import { contentSchema } from '@numior/content';
import type { NuiEditorApi } from '@numior/editor-vue';

const editor = useTemplateRef<{ editor: NuiEditorApi }>('editor');
const api = computed(() => editor.value?.editor);

const { ready, document, plugins, ids, peers, status, readOnly, failure, rejoin } = useCollabEditor(
  {
    doc: 'oslo-chair',
    user: { id: 'anna', name: 'Анна Титова' },
    schema: contentSchema,
    transport,
    editor: () => api.value,
  },
);
```

Все, кто открыл один `doc`, правят один документ, а имя из `user` видят соавторы. Композабл
подключается при монтировании компонента и отдаёт документ с плагинами для редактора, соавторов и
состояние связи.

### Покажите редактор, когда документ готов

Выводите редактор после `ready` и передайте ему документ, плагины и `ids`:

```vue
<template>
  <NuiEditor
    v-if="ready"
    ref="editor"
    v-model="document"
    format="json"
    label="Описание товара"
    :plugins="plugins"
    :ids="ids"
    :readonly="readOnly"
  />
</template>
```

Документ и его версию присылает сервер, поэтому до ответа редактору нечего показать. `ids` даёт
новым блокам id с меткой вкладки: блоки двух авторов не получат одинаковых id, и сервер не отвергнет
правку.

### Покажите участников

Поставьте `NuiCollabCarets` в слот `overlay`, а `NuiCollabPresence` — над редактором:

```vue
<template>
  <NuiCollabPresence :peers="peers" />
  <NuiEditor
    v-if="ready"
    ref="editor"
    v-model="document"
    format="json"
    :plugins="plugins"
    :ids="ids"
  >
    <template #overlay>
      <NuiCollabCarets :peers="peers" :editor="api" />
    </template>
  </NuiEditor>
</template>
```

У курсора соавтора флажок с именем, а его выделение подсвечено тем же цветом. Цвет зависит от id
пользователя, поэтому у человека он один во всех вкладках.

## Связь и сбои

Покажите состояние связи из `status`: `connecting`, `online`, `offline` или `failed`.

```ts
import { computed } from 'vue';
import { CollabStatusKind, type CollabStatus } from '@numior/collaboration';
import { NuiTone } from '@numior/vue';

const STATES: Readonly<Record<CollabStatus['kind'], { text: string; tone: NuiTone }>> = {
  [CollabStatusKind.Connecting]: { text: 'Подключение', tone: NuiTone.Neutral },
  [CollabStatusKind.Online]: { text: 'В сети', tone: NuiTone.Success },
  [CollabStatusKind.Offline]: { text: 'Нет связи', tone: NuiTone.Warning },
  [CollabStatusKind.Failed]: { text: 'Сбой', tone: NuiTone.Error },
};

const state = computed(() => STATES[status.value.kind]);
```

```vue
<NuiBadge :tone="state.tone" variant="soft">{{ state.text }}</NuiBadge>
```

Без связи правки копятся во вкладке, а клиент сам переподключается и отправляет их. Живой пример с
переключателем связи — на странице [«Офлайн»](/editor/offline).

Статус `failed` значит, что правки больше не уходят: сервер отклонил правку, схема не совпала или
копии документа разошлись. Редактор переходит в режим чтения, а `failure` хранит причину и число
неотправленных правок.

```vue
<NuiCollabFailure v-if="failure !== undefined" :failure="failure" @rejoin="rejoin" />
```

Кнопка «Открыть заново» вызывает `rejoin`: неотправленные правки пропадают, а документ загружается с
сервера. После сбоя клиент сам заново не входит, чтобы правки не пропали без ведома человека.

## Ограничения

- Каждая вкладка входит со своим `clientId`, и `useCollabEditor` создаёт его сам. Второе соединение
  с тем же `clientId` выбивает первое.
- Текст, набранный внутри фрагмента, который в это время удалил соавтор, пропадает вместе с
  фрагментом.
- Сервер переносит опоздавшую правку не дальше чем через 4096 последних шагов. Правку постарше
  клиент получает обратно, догоняет журнал и отправляет снова.

Книгу правят вместе так же, её подключение описано на странице
[Spreadsheet](/components/spreadsheet#совместная-работа).

## API

<ApiReference :names="['NuiCollabCarets', 'NuiCollabPresence', 'NuiCollabFailure']" />

<SignatureReference :names="['useCollabEditor', 'UseCollabEditorOptions', 'CollabEditor']" />
