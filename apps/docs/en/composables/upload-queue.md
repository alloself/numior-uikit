# useUploadQueue

`useUploadQueue(options)` runs an upload queue: `add` puts files into `items`, `start` begins
uploading with `concurrency` parallel jobs, `retry` and `remove` manage the entries. The
`upload(file, context)` adapter receives `onProgress` and a `signal` for cancellation.

## Signature

<SignatureReference :names="['useUploadQueue', 'UploadQueueOptions', 'UploadQueue']" />

## Usage

```ts
import { ref } from 'vue';
import { useUploadQueue, type UploadItem } from '@numior/vue';

const items = ref<UploadItem<{ url: string }>[]>([]);

const queue = useUploadQueue({
  items,
  concurrency: 2,
  upload: async (file, { onProgress, signal }) => {
    const response = await api.upload(file, { onProgress, signal });

    return { url: response.url };
  },
});
```

`auto: false` delays the start until `start()`, `onDone` and `onError` fire per entry.
[Upload](/en/components/upload) uses this queue under the hood.
