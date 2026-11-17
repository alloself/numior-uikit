# Versions

Save versions of a document and go back to any of them.

<Example name="collaboration/History" />

Pick a version in the list to open it, or press Save version to keep the current text.

## Store versions

Versions live in your app. The editor reads them through an adapter with `versions` and `load`,
and `save` adds a new one.

Without `save`, the panel has no Save version button, and the list shows only the versions your
app saved itself.

<SignatureReference :names="['HistoryAdapter', 'DocumentVersion']" />

## Connect the panel

Call `useEditorHistory` with the document name, the user and the adapter, and pass the result to
the panel:

```vue
<template>
  <NuiEditor ref="editor" v-model="document" format="json" aria-label="Product description" />
  <NuiEditorHistory :history="history" />
</template>

<script setup lang="ts">
import { computed, shallowRef, useTemplateRef } from 'vue';
import { NuiEditorHistory, useEditorHistory } from '@numior/kit/collaboration/vue';
import type { DocJSON } from '@numior/kit/editor-core';
import { NuiEditor, type NuiEditorApi } from '@numior/kit/editor';
import { versionsOf } from './versions';

const document = shallowRef<DocJSON>();

const editor = useTemplateRef<{ editor: NuiEditorApi }>('editor');

const api = computed(() => editor.value?.editor);

const history = useEditorHistory({
  doc: 'oslo-chair',
  user: { id: 'anna', name: 'Anna Turner' },
  adapter: versionsOf('oslo-chair'),
  editor: () => api.value,
});
</script>
```

An open version shows as a read-only document, with its changes marked on request. Restore this
version puts it into the editor as one edit: Undo brings the text back, and co-authors get it like
any other edit.

<SignatureReference :names="['useEditorHistory', 'UseEditorHistoryOptions', 'CollabHistory']" />

## Overwritten values

When two authors change the same value at once, such as a cell of a document table, the edit
that reaches the server last wins. The client whose edit won keeps the other value as an
alternative.

Pass `alternatives` from `useCollabEditor` to the panel to list these values under the versions:

```vue
<template>
  <NuiEditorHistory :history="history" :alternatives="alternatives" />
</template>
```

Each value can be put back, shown in the document or hidden. The values stay on the device of the
client that found them and do not reach other people.

## API

<ApiReference name="NuiEditorHistory" />
