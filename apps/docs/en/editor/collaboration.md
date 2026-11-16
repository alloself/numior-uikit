# Collaboration

Several people edit one document and see each other's carets.

<Example name="collaboration/TwoPanes" />

Type in one pane, and the text and the caret show up in the other.

## Installation

Install it next to the [editor packages](/en/editor/#installation):

```ts install:packages
import { NuiCollabPresence } from '@numior/collaboration/vue';
```

The `@numior/collaboration` styles draw the carets, avatars and panels of collaborators.

## Connecting

### Open a transport

Create a transport to your server with `webSocketTransport`:

```ts
import { webSocketTransport } from '@numior/collaboration';

const transport = webSocketTransport('wss://shop.example/collab');
```

The demos on these pages run without a server: `createLoopback` keeps the room in the memory of
the page. The [Server](/en/editor/server) page describes both, along with the protocol your
server speaks.

<SignatureReference name="webSocketTransport" />

### Connect the document

Call `useCollabEditor` with the document name, the user and the transport:

```ts
import { computed, useTemplateRef } from 'vue';
import { useCollabEditor } from '@numior/collaboration/vue';
import { contentSchema } from '@numior/content';
import type { NuiEditorApi } from '@numior/editor-vue';

const editor = useTemplateRef<{ editor: NuiEditorApi }>('editor');

const api = computed(() => editor.value?.editor);

const { ready, document, plugins, ids, peers, readOnly } = useCollabEditor({
  doc: 'oslo-chair',
  user: { id: 'anna', name: 'Anna Turner' },
  schema: contentSchema,
  transport,
  editor: () => api.value,
});
```

`doc` names the document on the server, and others see `user` next to your caret. The composable
connects when the component mounts and returns the document, the editor plugins and the
co-authors.

### Show the editor once the document is ready

Mount the editor when `ready` turns true, and pass it what the composable returned:

```vue
<template>
  <NuiEditor
    v-if="ready"
    ref="editor"
    v-model="document"
    format="json"
    aria-label="Product description"
    :plugins="plugins"
    :ids="ids"
    :readonly="readOnly"
  />
</template>
```

The document arrives with the first reply of the server, and the editor reads `plugins` and
`ids` only when it mounts. `ids` gives every client its own node ids, so the blocks two authors
add at once never clash.

### Show who is here

Put the carets in the `overlay` slot of the editor and the avatars anywhere next to it:

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

Each co-author gets a caret with a name flag in one of the eight chart colors. Two tabs of one
person show one avatar.

## Connection and failures

`status` tells how the client is doing: `connecting`, `online`, `offline` or `failed`. Show it
next to the editor, for example as a badge:

```ts
import { computed } from 'vue';
import { CollabStatusKind, type CollabStatus } from '@numior/collaboration';
import { NuiTone } from '@numior/vue';

const STATES: Readonly<Record<CollabStatus['kind'], { text: string; tone: NuiTone }>> = {
  [CollabStatusKind.Connecting]: { text: 'Connecting', tone: NuiTone.Neutral },
  [CollabStatusKind.Online]: { text: 'Online', tone: NuiTone.Success },
  [CollabStatusKind.Offline]: { text: 'Offline', tone: NuiTone.Warning },
  [CollabStatusKind.Failed]: { text: 'Failed', tone: NuiTone.Error },
};

const state = computed(() => STATES[status.value.kind]);
```

After a lost connection the client reconnects by itself and sends the edits made meanwhile. The
[Offline](/en/editor/offline) page has a live demo with a connection switch.

After a failure the client stops for good. The editor turns read-only, and `failure` holds the
reason and the number of edits that never reached the server:

| Reason     | When                                                                   |
| ---------- | ---------------------------------------------------------------------- |
| `schema`   | The page and the server use different document schemas                 |
| `invalid`  | The server refused one of the edits                                    |
| `protocol` | The server broke the protocol or sent a message the client cannot read |
| `diverged` | The client knows a later version than the server                       |
| `document` | A snapshot or an edit from the server did not fit the local copy       |

Show NuiCollabFailure with the reason and an Open again button:

```vue
<template>
  <NuiCollabFailure v-if="failure !== undefined" :failure="failure" @rejoin="rejoin" />
</template>
```

`rejoin` drops the local copy together with the unsent edits and opens the document from the
server again. There is no button for `schema`: only a page reload helps there.

## Limits

- `useCollabEditor` gives every tab its own client id. A second connection with the same id
  replaces the first.
- Text typed inside a range that another author deletes at the same moment is lost.
- `editorAuthority` on the server rebases a late batch over the last 4096 steps. An older batch
  comes back as `stale`, and the client catches up and sends it again.
- After a failure the client does not reconnect until `rejoin` is called.

A spreadsheet book is edited together through `useCollabWorkbook`, described on the
[Spreadsheet](/en/components/spreadsheet) page.

## API

<ApiReference :names="['NuiCollabCarets', 'NuiCollabPresence', 'NuiCollabFailure']" />

<SignatureReference :names="['useCollabEditor', 'UseCollabEditorOptions', 'CollabEditor']" />
