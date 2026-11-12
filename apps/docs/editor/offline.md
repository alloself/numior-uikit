# Офлайн

Правки без связи сохраняются в браузере и уходят на сервер, когда связь вернётся.

<Example name="collaboration/Connection" />

Выключите связь, поправьте текст в обеих панелях и включите её.

Пока у Марии нет связи, её правки копятся во вкладке. Когда связь возвращается, клиент получает
правки Анны, переносит свои поверх них и отправляет.

## Установка

Установите пакет:

::: code-group

```sh [pnpm]
pnpm add @numior/offline
```

```sh [npm]
npm install @numior/offline
```

```sh [yarn]
yarn add @numior/offline
```

```sh [bun]
bun add @numior/offline
```

:::

## Сохраните правки в браузере

Передайте `offlinePersistence` в `useCollabEditor`:

```ts
import { useCollabEditor } from '@numior/collaboration/vue';
import { contentSchema } from '@numior/content';
import { offlinePersistence } from '@numior/offline';

const collab = useCollabEditor({
  doc: 'oslo-chair',
  user,
  schema: contentSchema,
  transport,
  editor: () => api.value,
  persistence: offlinePersistence('oslo-chair', { schema: contentSchema }),
});
```

Копия документа, журнал правок и неотправленные правки лежат в IndexedDB. После перезагрузки
документ открывается из копии даже без сети, а неотправленные правки уходят, когда сервер ответит.

Если браузер не принял запись, она повторяется с растущей паузой, но не реже раза в 30 секунд. Пока
запись не удалась, правки есть только в памяти вкладки.

Когда пользователь выходит из аккаунта, удалите копию через `deleteOfflineDocument('oslo-chair')`.
Копию в браузере хранит только редактор: у книги в `useCollabWorkbook` её нет.

<SignatureReference :names="['offlinePersistence', 'OfflinePersistenceOptions', 'OfflineStoreOptions']" />

## Одна вкладка пишет

Копию документа ведёт одна вкладка, остальные вкладки с тем же документом работают без неё.
Состояние копии приходит в `onState`, а показывать ли его, решает приложение:

```ts
import { ref } from 'vue';
import { OfflineCopy, offlinePersistence } from '@numior/offline';

const copy = ref<OfflineCopy>();

const persistence = offlinePersistence('oslo-chair', {
  schema: contentSchema,
  onState: (state) => {
    copy.value = state;
  },
});
```

| Состояние     | Что с копией                                                         |
| ------------- | -------------------------------------------------------------------- |
| `kept`        | Эта вкладка пишет копию                                              |
| `failing`     | Браузер не принял запись, правки пока только в памяти вкладки        |
| `elsewhere`   | Копию ведёт другая вкладка, эта работает без неё                     |
| `unavailable` | В браузере нет ни Web Locks, ни `BroadcastChannel`: копия не пишется |

## Новая версия схемы

Передайте `migrations`, когда схема документа меняется с выпуском приложения:

```ts
const persistence = offlinePersistence('oslo-chair', {
  schema: contentSchema,
  migrations: [{ subject: 'schema', from: 4, to: 5, document: upgradeDocument, step: upgradeStep }],
});
```

Копия помнит версии схемы и плагинов из `plugins`, с которыми её записали. Миграции переводят
документ и неотправленные правки до входа на сервер, а шаг, который перевести нельзя, `step`
возвращает как `undefined`.

Если подходящей миграции нет, документ открывается только для чтения, а неотправленные правки
остаются на устройстве. Причину объясняет `report` из `useCollabEditor`:

```vue
<NuiCollabReport v-if="report !== undefined" :report="report" />
```

## API

<ApiReference name="NuiCollabReport" />
