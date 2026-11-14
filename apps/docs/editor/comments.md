# Комментарии

Комментарии привязаны к тексту и едут вместе с ним при правке.

<Example name="collaboration/Comments" />

Выделите текст и нажмите кнопку комментария в панели у выделения.

## Храните комментарии

Сохраняйте обсуждения у себя и передайте редактору адаптер с методами `list`, `create`, `reply`,
`resolve` и `remove`:

<SignatureReference :names="['CommentsAdapter', 'CommentThread']" />

`create`, `reply` и `resolve` возвращают обсуждение целиком, каким его сохранил сервер. Привязку
`anchor` адаптер хранит как есть: в ней id блоков и смещения в тексте.

Добавьте `move`, и новое место отметки после правки переживёт перезагрузку страницы. Через
`subscribe` редактор узнаёт о новых и изменённых обсуждениях соавторов без перезагрузки.

## Подключите к редактору

Передайте адаптер в `useEditorComments`, плагин — в `plugins`, а кнопку комментария — в
`selectionActions`:

```vue
<template>
  <NuiEditor
    ref="editor"
    v-model="document"
    format="json"
    label="Описание товара"
    :plugins="[comments.plugin]"
    :selection-actions="[comments.action.value]"
  >
    <template #overlay>
      <NuiEditorCommentPopover :comments="comments" :editor="api" />
    </template>
  </NuiEditor>
  <NuiEditorComments :comments="comments" />
</template>

<script setup lang="ts">
import { computed, shallowRef, useTemplateRef } from 'vue';
import {
  NuiEditorCommentPopover,
  NuiEditorComments,
  useEditorComments,
} from '@numior/collaboration/vue';
import type { DocJSON } from '@numior/editor-core';
import { NuiEditor, type NuiEditorApi } from '@numior/editor-vue';

const document = shallowRef<DocJSON>();
const editor = useTemplateRef<{ editor: NuiEditorApi }>('editor');
const api = computed(() => editor.value?.editor);

const comments = useEditorComments({
  doc: 'oslo-chair',
  user: { id: 'anna', name: 'Анна Титова' },
  adapter: shopComments,
  editor: () => api.value,
});
</script>
```

Поповер в слоте `overlay` открывает форму нового комментария у выделения и обсуждение по клику на
отмеченный текст. `NuiEditorComments` выводит все обсуждения списком, например в боковой панели.

При совместной работе добавьте плагин к плагинам из `useCollabEditor`:
`[...plugins.value, comments.plugin]`.

<SignatureReference :names="['useEditorComments', 'UseEditorCommentsOptions', 'CollabComments']" />

## Поведение

- Отметка едет вместе с текстом при своих правках и правках соавторов.
- Если отмеченный текст удалили, обсуждение остаётся в списке с пометкой «Текст удалён».
- Решённое обсуждение снимает отметку и уходит в конец списка. «Открыть снова» возвращает отметку на
  сохранённое место.
- Удалить обсуждение может только его автор.
- Документ только для чтения тоже можно комментировать: в панели у выделения останется одна кнопка
  комментария.

## API

<ApiReference :names="['NuiEditorComments', 'NuiEditorCommentPopover']" />
