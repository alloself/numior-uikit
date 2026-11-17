# Comments

Comments hold on to a piece of text and move with it as the document changes.

<Example name="collaboration/Comments" />

Select some text and press Add comment, or open Discussions to read every thread.

## Store comments

Comments live in your app. The editor reads and writes them through an adapter with `list`,
`create`, `reply`, `resolve` and `remove`, each of which returns a promise.

`move` saves an anchor after an edit shifted it, and `subscribe` brings in the threads that other
people change. Both are optional.

An anchor ties a thread to the text with the ids of text blocks and offsets in them. Store it as
it came: the adapter does not need to read it.

<SignatureReference :names="['CommentsAdapter', 'CommentThread']" />

## Connect to the editor

Call `useEditorComments` with the document name, the user and the adapter:

```ts
import { computed, useTemplateRef } from 'vue';
import { useEditorComments } from '@numior/kit/collaboration/vue';
import type { NuiEditorApi } from '@numior/kit/editor';
import { commentsOf } from './comments';

const editor = useTemplateRef<{ editor: NuiEditorApi }>('editor');

const api = computed(() => editor.value?.editor);

const comments = useEditorComments({
  doc: 'oslo-chair',
  user: { id: 'anna', name: 'Anna Turner' },
  adapter: commentsOf('oslo-chair'),
  editor: () => api.value,
});
```

Add `comments.plugin` to the editor plugins and `comments.action.value` to its selection actions.
The bar over the selection then gets Add comment:

```vue
<template>
  <NuiEditor
    ref="editor"
    v-model="document"
    format="json"
    aria-label="Product description"
    :plugins="[comments.plugin]"
    :selection-actions="[comments.action.value]"
  >
    <template #overlay>
      <NuiEditorCommentPopover :comments="comments" :editor="api" />
    </template>
  </NuiEditor>
  <NuiEditorComments :comments="comments" />
</template>
```

NuiEditorCommentPopover opens a thread at its text, and NuiEditorComments lists every thread of
the document. With co-authors, put `comments.plugin` next to the plugins of `useCollabEditor`.

<SignatureReference :names="['useEditorComments', 'UseEditorCommentsOptions', 'CollabComments']" />

## Behavior

- A thread moves with its text when anyone edits around it. When the text is deleted, the thread
  stays in the list and says that the text was removed.
- A resolved thread lets go of its text. Reopen it, and it marks the text its saved anchor points
  to.
- A read-only copy can be commented on as well: the selection actions stay in `readonly`.

## API

<ApiReference :names="['NuiEditorComments', 'NuiEditorCommentPopover']" />
