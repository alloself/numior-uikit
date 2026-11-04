# useUploadQueue

`useUploadQueue(options)` uploads files in a queue, several at a time. Use it with your own drop
zone, for example one built on [useFileDrop](/en/composables/file-drop).

`add` puts files into `items`, and uploading starts on its own. `concurrency` sets how many files
upload at once, 3 by default. `retry` uploads a failed file again, `remove` drops a file and
cancels its upload.

Your `upload(file, context)` function makes the request. It receives `onProgress` to report
progress as a fraction from 0 to 1 and a `signal` to cancel the request.

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

`auto: false` holds the upload until you call `start()`. `onDone` and `onError` are called for
each file. [Upload](/en/components/upload) is built on this queue.
