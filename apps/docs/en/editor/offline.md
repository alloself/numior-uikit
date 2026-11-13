# Offline

Edits made without a connection stay in the browser and reach the server once the connection is
back.

<Example name="collaboration/Connection" />

Turn the connection off, edit the text in both panes and turn it back on.

While a client is offline, its edits wait in a queue. Once it reconnects, the client catches up
with the log, rebases the queue and sends it. Without a saved copy, the queue lives only in the
memory of the tab.

## Installation

Install the package next to `@numior/collaboration`:

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

## Keep edits in the browser

Create a copy with `offlinePersistence` and pass it to `useCollabEditor` as `persistence`:

```ts
import { useCollabEditor } from '@numior/collaboration/vue';
import { contentSchema } from '@numior/content';
import { offlinePersistence } from '@numior/offline';

const persistence = offlinePersistence('oslo-chair', { schema: contentSchema });

const { ready, document, plugins, ids, readOnly, report } = useCollabEditor({
  doc: 'oslo-chair',
  user: { id: 'anna', name: 'Anna Turner' },
  schema: contentSchema,
  transport,
  editor: () => api.value,
  persistence,
});
```

The copy lives in IndexedDB: the document, the log of steps, the queue of unsent steps and the
overwritten values. After a reload, the editor opens the saved document at once, with the same
client id, and sends the queue when the connection is back.

The log is compacted into the document after 500 steps. A write the browser refuses is tried again
after 1, 2 and 4 seconds and so on, up to 30. Meanwhile the edits stay in the memory of the tab.

Open again after a failure drops the saved queue as well. Offline copies are for editor documents:
a spreadsheet book has none.

<SignatureReference :names="['offlinePersistence', 'OfflinePersistenceOptions', 'OfflineStoreOptions']" />

## One tab writes

Only one tab keeps the copy of a document. Other tabs with the same document work as plain clients
and save nothing.

`onState` reports what happens to the copy, and your app decides how to show it:

| State         | Meaning                                                |
| ------------- | ------------------------------------------------------ |
| `kept`        | This tab keeps the copy                                |
| `failing`     | The browser refuses to write, and the tab keeps trying |
| `elsewhere`   | Another tab keeps the copy                             |
| `unavailable` | The browser cannot pick a tab, so nothing is saved     |

```ts
import { ref } from 'vue';
import type { OfflineCopy } from '@numior/offline';

const copy = ref<OfflineCopy>();

const persistence = offlinePersistence('oslo-chair', {
  schema: contentSchema,
  onState: (state) => {
    copy.value = state;
  },
});
```

## New schema version

A copy saved by an older version of your app may not fit the new schema. Describe the change in
`migrations`, and the copy is converted on the device before the client connects:

```ts
const persistence = offlinePersistence('oslo-chair', {
  schema: contentSchema,
  migrations: [
    {
      subject: 'schema',
      from: 4,
      to: 5,
      document: (document) => withTableKeys(document),
      step: (step) => step,
    },
  ],
});
```

`subject` is `schema` for the document schema, or the name of a plugin listed in `plugins`.
`document` converts the saved document, and `step` converts each saved step or returns
`undefined` when it cannot.

When no migration fits, the document opens read-only, and `report` of `useCollabEditor` says why.
Show it with NuiCollabReport. The queue stays on the device and does not reach the server.

```vue
<template>
  <NuiCollabReport v-if="report !== undefined" :report="report" />
</template>
```

## API

<ApiReference name="NuiCollabReport" />
