# useFileDrop

`useFileDrop(options)` принимает файлы, которые пользователь перетащил на элемент. Повесьте
`attrs` на элемент, и файлы придут в `onFiles` списком.

`dragging` равен `true`, пока файлы над элементом: по нему можно подсветить зону. Перетащенный
текст и ссылки композабл пропускает.

<Example name="composables/FileDrop" />

## Сигнатура

<SignatureReference :names="['useFileDrop', 'FileDropOptions', 'FileDrop']" />

## Поведение

`disabled: true` выключает зону, а `attrs` можно оставить на элементе. На этом композабле
работает зона [Upload](/components/upload), а очередь загрузки — на
[useUploadQueue](/composables/upload-queue).
