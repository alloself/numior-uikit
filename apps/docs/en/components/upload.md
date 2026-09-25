# Upload

`NuiUpload` takes files from a drop or the system dialog, validates them, queues them and
hands each file to the `upload` adapter. The component itself makes no network requests:
the adapter receives the `File`, a progress callback and an `AbortSignal` and returns a
promise with the result. The model is an array of items with statuses, so a form knows what
is still uploading, what failed and what is already on the server.

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
    throw new Error('The server rejected the file')
  }
  return `https://files.example/${file.name}`
}

const documents = ref([
  { id: 'brief', name: 'brief.pdf', size: 348160, type: 'application/pdf', status: 'done', progress: 1, url: '#brief' },
])
const images = ref([])
</script>

<div class="vp-raw nui-demo nui-demo--stack" data-nui-theme="light">
  <NuiField label="Documents" description="PDF or TXT up to 1 MB, three files at most">
    <NuiUpload v-model="documents" :upload="demoUpload" accept=".pdf,.txt" :max-size="1048576" :max-files="3" hint="A file with “fail” in its name ends with an error" />
  </NuiField>
  <NuiField label="Gallery" description="Images in a grid">
    <NuiUpload v-model="images" :upload="demoUpload" layout="grid" accept="image/*" drop-label="Drop images here" browse-label="Choose images" />
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
  <NuiField label="Attachments">
    <NuiUpload v-model="files" :upload="upload" accept=".pdf,image/*" :max-size="5 * 1024 * 1024" />
  </NuiField>
</template>
```

## Behaviour

The whole zone is clickable and opens the system dialog; from the keyboard the “Choose
files” button does it, and `NuiField` puts the `id`, description and error on that button.
Chosen or dropped files pass `accept` (extensions such as `.pdf`, exact types such as
`image/png`, masks such as `image/*`), `maxSize`, `maxFiles` counted together with the files
already in the model, and a custom `validate`. Accepted files join the queue and go to the
adapter at once, at most `concurrency` at a time; `auto=false` leaves them `queued` until
`start()` is called. Rejected files stay in the list with their reason and a remove button
under `rejected="list"` (the default) and never reach the model under `rejected="drop"`; the
`reject` event fires in both cases.

While uploading, a row shows progress and a cancel button: cancelling aborts the request
through `signal` and removes the item. An adapter error keeps the row with the error text and
a retry button; validation errors cannot be retried. Removing a finished file changes the
model and emits `remove`; deleting it on the server is up to the app, for example on form
submit. With `multiple=false` a new file replaces the previous one. Images get a thumbnail
from an object URL that is revoked on removal and unmount; already uploaded files use their
`url`.

## Accessibility

The hidden `<input type="file">` is out of the tab order; a regular button takes focus.
Status changes (uploaded, failed) are announced through `aria-live`, progress is a
native `<progress>` named after the file. Cancel, retry and remove buttons carry
`aria-label`; in the grid they appear on hover and on focus.

## API

| Prop                                       | Type                                           | Default             | Description                               |
| ------------------------------------------ | ---------------------------------------------- | ------------------- | ----------------------------------------- |
| `v-model`                                  | `NuiUploadItem<R>[]`                           | `[]`                | Items with statuses                       |
| `upload`                                   | `(file, { onProgress, signal }) => Promise<R>` | —                   | Upload adapter                            |
| `accept`                                   | `string`                                       | —                   | Comma-separated extensions and types      |
| `multiple`                                 | `boolean`                                      | `true`              | Several files; `false` replaces the file  |
| `maxSize`                                  | `number`                                       | —                   | Size limit in bytes                       |
| `maxFiles`                                 | `number`                                       | —                   | Limit on the number of files in the model |
| `validate`                                 | `(file) => string \| undefined`                | —                   | Custom check, a string is the error text  |
| `rejected`                                 | `'list' \| 'drop'`                             | `'list'`            | Show rejected files or drop them          |
| `auto`                                     | `boolean`                                      | `true`              | Upload at once                            |
| `concurrency`                              | `number`                                       | `3`                 | Parallel uploads                          |
| `layout`                                   | `'list' \| 'grid'`                             | `'list'`            | List or a grid of thumbnails              |
| `size`                                     | `'sm' \| 'md' \| 'lg'`                         | `'md'`              | Size step                                 |
| `dropLabel`                                | `string`                                       | `'Drop files here'` | Zone text                                 |
| `browseLabel`                              | `string`                                       | `'Choose files'`    | Button label                              |
| `hint`                                     | `string`                                       | —                   | Hint under the button                     |
| `cancelLabel`, `retryLabel`, `removeLabel` | `string`                                       | English labels      | `aria-label` of the actions               |
| `doneLabel`                                | `string`                                       | `'Uploaded'`        | Announcement once a file is done          |
| `errorLabel`                               | `(error, item) => string`                      | English texts       | Error text by reason                      |
| `id`, `disabled`, `required`, `invalid`    | from the field                                 | —                   | Link to `NuiField`                        |

Events: `update:modelValue`, `reject(rejections)`, `done(item)`, `error(item)`,
`remove(item)`. Slots: default (`{ open, dragging }`) replaces the zone content, `item`
(`{ item, preview, cancel, retry, remove }`) the file row. Methods `open()`, `start()`,
`retry(id)`, `remove(id)`. A `NuiUploadItem` holds `id`, `name`, `size`, `type`, `status`
(`queued` | `uploading` | `done` | `error`), `progress` `0…1`, `file?`, `url?`, `result?`
and `error?` (`reason`: `type` | `size` | `count` | `custom` | `upload`, `message?`).

Block `nui-upload` (modifiers `--layout-*`, `--size-*`, `--dragging`, `--busy`, `--invalid`,
`--disabled`; elements `__zone`, `__input`, `__icon`, `__text`, `__browse`, `__hint`,
`__items`, `__live`; variables `--_zone-padding`, `--_gap`, `--_thumb`, `--_icon`) and
`nui-upload-item` (modifiers `--status-*`, `--preview`; elements `__thumb`, `__icon`,
`__actions`, `__progress`).

Primitives from `@numior/primitives`: `validateFiles`, `useFileDrop`, `useUploadQueue`,
`formatFileSize`.
