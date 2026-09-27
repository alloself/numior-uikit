# Загрузка файлов

`NuiUpload` принимает файлы перетаскиванием или через диалог, проверяет их, выстраивает
очередь и отдаёт каждый файл адаптеру `upload`. Сам компонент не делает сетевых запросов:
адаптер получает `File`, колбэк прогресса и `AbortSignal`, а возвращает промис с
результатом. Модель — массив элементов со статусами, поэтому форма видит, что ещё
загружается, что упало и что уже на сервере.

<script setup>
import { ref } from 'vue'

const wait = (ms, signal) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms)
    signal.addEventListener('abort', () => {
      clearTimeout(timer)
      reject(new Error('aborted'))
    }, { once: true })
  })

const demoUpload = async (file, { onProgress, signal }) => {
  for (let step = 1; step <= 5; step += 1) {
    await wait(150, signal)
    onProgress(step / 5)
  }
  if (file.name.includes('fail')) {
    throw new Error('Сервер не принял файл')
  }
  return `https://files.example/${file.name}`
}

const documents = ref([
  { id: 'brief', name: 'brief.pdf', size: 348160, type: 'application/pdf', status: 'done', url: '#brief' },
])
const images = ref([])
</script>

<div class="vp-raw nui-demo nui-demo--stack" data-nui-theme="light">
  <NuiField label="Документы" description="PDF или TXT до 1 МБ, не больше трёх">
    <NuiUpload v-model="documents" :upload="demoUpload" accept=".pdf,.txt" :max-size="1048576" :max-files="3" description="Файл с «fail» в имени завершится ошибкой" />
  </NuiField>
  <NuiField label="Галерея" description="Изображения сеткой">
    <NuiUpload v-model="images" :upload="demoUpload" layout="grid" accept="image/*" drop-label="Перетащите изображения" browse-label="Выбрать изображения" />
  </NuiField>
</div>

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { NuiField, NuiUpload, type NuiUploadAdapter, type NuiUploadItem } from '@numior/vue';
import '@numior/vue/styles/upload.css';

const files = ref<NuiUploadItem<{ url: string }>[]>([]);

const upload: NuiUploadAdapter<{ url: string }> = (file, { onProgress, signal }) =>
  new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    const body = new FormData();

    body.append('file', file);
    request.open('POST', '/api/files');
    request.upload.onprogress = (event) => onProgress(event.loaded / event.total);
    request.onload = () => resolve(JSON.parse(request.responseText));
    request.onerror = () => reject(new Error(request.statusText));
    signal.addEventListener('abort', () => request.abort(), { once: true });
    request.send(body);
  });
</script>

<template>
  <NuiField label="Вложения">
    <NuiUpload v-model="files" :upload="upload" accept=".pdf,image/*" :max-size="5 * 1024 * 1024" />
  </NuiField>
</template>
```

## Поведение

Вся зона кликабельна и открывает системный диалог; с клавиатуры это делает кнопка «Выбрать
файлы», на которую `NuiField` вешает `id`, описание и ошибку. Выбранные или сброшенные
файлы проходят проверку `accept` (расширения `.pdf`, точные типы `image/png`, маски
`image/*`), `maxSize`, `maxFiles` с учётом уже лежащих в модели файлов и свой `validate`.
Прошедшие встают в очередь и уходят в адаптер сразу, не больше `concurrency` одновременно;
`auto=false` оставляет их в статусе `queued` до вызова `start()`. Отклонённые файлы при
`rejected="list"` (по умолчанию) видны в списке с причиной и крестиком, при
`rejected="drop"` не попадают в модель; событие `reject` приходит в обоих случаях.

Во время загрузки строка показывает прогресс и кнопку отмены: отмена абортит запрос через
`signal` и убирает элемент. Ошибка адаптера оставляет строку с текстом ошибки и кнопкой
повтора; ошибки проверки повторить нельзя. Удаление готового файла меняет модель и шлёт
`remove` — удалить его на сервере должно приложение, например при отправке формы. При
`multiple=false` новый файл заменяет предыдущий. Изображения получают миниатюру из object
URL, который отзывается при удалении и размонтировании; для уже загруженных файлов
используется их `url`.

## Доступность

Скрытый `<input type="file">` не участвует в табуляции; фокус получает обычная кнопка.
Смена статуса (загружен, ошибка) объявляется через `aria-live`, прогресс — нативный
`<progress>` с именем файла. Кнопки отмены, повтора и удаления подписаны через
`aria-label`; в сетке они появляются по наведению и по фокусу.

## API

| Prop                                       | Тип                                            | По умолчанию                                             | Описание                                |
| ------------------------------------------ | ---------------------------------------------- | -------------------------------------------------------- | --------------------------------------- |
| `v-model`                                  | `NuiUploadItem<R>[]`                           | `[]`                                                     | Элементы со статусами                   |
| `upload`                                   | `(file, { onProgress, signal }) => Promise<R>` | —                                                        | Адаптер загрузки                        |
| `accept`                                   | `string`                                       | —                                                        | Расширения и типы через запятую         |
| `multiple`                                 | `boolean`                                      | `true`                                                   | Несколько файлов; `false` заменяет файл |
| `maxSize`                                  | `number`                                       | —                                                        | Предел размера в байтах                 |
| `maxFiles`                                 | `number`                                       | —                                                        | Предел числа файлов в модели            |
| `validate`                                 | `(file) => string \| undefined`                | —                                                        | Своя проверка, строка — текст ошибки    |
| `rejected`                                 | `'list' \| 'drop'`                             | `'list'`                                                 | Показывать отклонённые или отбрасывать  |
| `auto`                                     | `boolean`                                      | `true`                                                   | Загружать сразу                         |
| `concurrency`                              | `number`                                       | `3`                                                      | Параллельных загрузок                   |
| `layout`                                   | `'list' \| 'grid'`                             | `'list'`                                                 | Список или сетка миниатюр               |
| `size`                                     | `'sm' \| 'md' \| 'lg'`                         | `'md'`                                                   | Ступень размера                         |
| `dropLabel`                                | `string`                                       | [словарь](/localization#upload): «Перетащите файлы сюда» | Текст зоны                              |
| `browseLabel`                              | `string`                                       | [словарь](/localization#upload): «Выбрать файлы»         | Подпись кнопки                          |
| `hint`                                     | `string`                                       | —                                                        | Подсказка под кнопкой                   |
| `cancelLabel`, `retryLabel`, `removeLabel` | `string`                                       | [словарь](/localization#upload)                          | `aria-label` действий                   |
| `doneLabel`                                | `string`                                       | [словарь](/localization#upload): «Загружено»             | Текст объявления о готовности           |
| `errorLabel`                               | `(error, item) => string`                      | [словарь](/localization#upload)                          | Текст ошибки по причине                 |
| `id`, `disabled`, `required`, `invalid`    | из поля                                        | —                                                        | Связь с `NuiField`                      |

События: `update:modelValue`, `reject(rejections)`, `done(item)`, `error(item)`,
`remove(item)`. Слоты: default (`{ open, dragging }`) заменяет содержимое зоны, `item`
(`{ item, preview, cancel, retry, remove }`) — строку файла. Методы `open()`, `start()`,
`retry(id)`, `remove(id)`. Элемент `NuiUploadItem`: `id`, `name`, `size`, `type`, `status`
и `file?`, `url?` плюс поля своего `status`: `queued` — ничего, `uploading` — `progress` `0…1`,
`done` — `result?`, `error` — `error` (`reason`: `type` | `size` | `count` | `custom` | `upload`,
`message?`). Поля чужого статуса у элемента нет, поэтому ошибка не остаётся после повтора.
Прогресс попадает в модель не чаще одного раза за кадр: отчёты `onProgress` между кадрами
складываются, в элементе остаётся последний.

Блок `nui-upload` (модификаторы `--layout-*`, `--size-*`, `--dragging`, `--busy`,
`--invalid`, `--disabled`; элементы `__zone`, `__input`, `__icon`, `__text`, `__browse`,
`__hint`, `__items`, `__live`; переменные `--_zone-padding`, `--_gap`, `--_thumb`,
`--_icon`) и `nui-upload-item` (модификаторы `--status-*`, `--preview`; элементы `__thumb`,
`__icon`, `__actions`, `__progress`).

Примитивы из `@numior/primitives`: `validateFiles`, `useFileDrop`, `useUploadQueue`,
`formatFileSize`.
