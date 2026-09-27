# useUploadQueue

`useUploadQueue(options)` ведёт очередь загрузок: `add` кладёт файлы в `items`, `start`
запускает загрузку с параллельностью `concurrency`, `retry` и `remove` управляют элементами.
Адаптер `upload(file, context)` получает `onProgress` и `signal` для отмены.

## Сигнатура

<SignatureReference :names="['useUploadQueue', 'UploadQueueOptions', 'UploadQueue']" />

## Использование

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

`auto: false` откладывает старт до `start()`, `onDone` и `onError` вызываются на каждый
элемент. [Upload](/components/upload) использует эту очередь под капотом.
