# useFileDrop

`useFileDrop(options)` превращает любой элемент в зону перетаскивания файлов: `attrs`
вешаются на элемент, `dragging` говорит, что файлы над зоной, `onFiles` получает список.
Перетаскивание текста и ссылок игнорируется.

<Example name="composables/FileDrop" />

## Сигнатура

<SignatureReference :names="['useFileDrop', 'FileDropOptions', 'FileDrop']" />

## Поведение

`disabled` выключает зону без снятия обработчиков. Зона [Upload](/components/upload)
построена на этом композабле, а очередь загрузки — на [useUploadQueue](/composables/upload-queue).
