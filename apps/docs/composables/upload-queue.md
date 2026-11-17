# useUploadQueue

`useUploadQueue(options)` загружает файлы по очереди, по несколько сразу. Используйте его со
своей зоной загрузки, например на [useFileDrop](/composables/file-drop).

`add` добавляет файлы в `items`, и загрузка начинается сама. `concurrency` задаёт, сколько
файлов грузится одновременно, по умолчанию 3. `retry` повторяет загрузку после ошибки, `remove`
убирает файл и отменяет его загрузку.

Сам запрос делает ваша функция `upload(file, context)`. Она получает `onProgress`, чтобы
сообщать прогресс долей от 0 до 1, и `signal`, чтобы отменить запрос.

## Сигнатура

<SignatureReference :names="['useUploadQueue', 'UploadQueueOptions', 'UploadQueue']" />

## Использование

```ts
import { ref } from 'vue';
import { useUploadQueue, type UploadItem } from '@numior/kit';

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

`auto: false` откладывает загрузку до вызова `start()`. `onDone` и `onError` вызываются для
каждого файла. На этой очереди работает [Upload](/components/upload).
