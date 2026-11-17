# Версии

Сохраняйте версии документа и возвращайтесь к любой из них.

<Example name="collaboration/History" />

Поправьте описание, сохраните версию и откройте «Размеры», чтобы увидеть изменения.

## Храните версии

Храните версии у себя и передайте адаптер: `versions` отдаёт список, `load` — документ версии,
`save` сохраняет текущий документ.

<SignatureReference :names="['HistoryAdapter', 'DocumentVersion']" />

Без `save` кнопки «Сохранить версию» в панели нет, и версии создаёт только сервер, например раз в
час. Название из `label` встаёт в первую строку, а дата — рядом с именем автора.

## Подключите панель

Передайте адаптер в `useEditorHistory`, а результат — в `NuiEditorHistory`:

```vue
<template>
  <NuiEditor ref="editor" v-model="document" format="json" label="Описание товара" />
  <NuiEditorHistory :history="history" />
</template>

<script setup lang="ts">
import { computed, shallowRef, useTemplateRef } from 'vue';
import { NuiEditorHistory, useEditorHistory } from '@numior/kit/collaboration/vue';
import type { DocJSON } from '@numior/kit/editor-core';
import { NuiEditor, type NuiEditorApi } from '@numior/kit/editor';

const document = shallowRef<DocJSON>();
const editor = useTemplateRef<{ editor: NuiEditorApi }>('editor');
const api = computed(() => editor.value?.editor);

const history = useEditorHistory({
  doc: 'oslo-chair',
  user: { id: 'anna', name: 'Анна Титова' },
  adapter: shopHistory,
  editor: () => api.value,
});
</script>
```

Версии в панели идут от новых к старым. Открытая версия показывает, что поменялось с предыдущей, а
«Показать изменения» выключает отметки.

Восстановление — одна правка документа: её отменяет Ctrl+Z, а соавторы получают её, как любую
другую.

<SignatureReference :names="['useEditorHistory', 'UseEditorHistoryOptions', 'CollabHistory']" />

## Потерянные значения

Передайте в панель `alternatives` из `useCollabEditor`, чтобы видеть перезаписанные значения:

```vue
<NuiEditorHistory :history="history" :alternatives="alternatives" />
```

Когда двое одновременно меняют одно значение, например ячейку таблицы, остаётся то, что сервер
записал последним. Перезаписанное значение видит тот, чья правка победила: в панели под списком
версий его можно вернуть или показать в документе.

Набор текста к таким значениям не относится: одновременные правки текста сливаются, и остаются обе.
Перезаписанные значения на сервер не уходят: их хранит вкладка, а с
[`@numior/kit/offline`](/editor/offline) — ещё и браузер.

## API

<ApiReference name="NuiEditorHistory" />
