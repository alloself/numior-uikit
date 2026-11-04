# useFileDrop

`useFileDrop(options)` accepts files the user drags onto an element. Put `attrs` on the element,
and the files arrive in `onFiles` as a list.

`dragging` is `true` while files are over the element, so you can highlight the zone. Dragged
text and links are skipped.

<Example name="composables/FileDrop" />

## Signature

<SignatureReference :names="['useFileDrop', 'FileDropOptions', 'FileDrop']" />

## Behaviour

`disabled: true` turns the zone off, and `attrs` can stay on the element. The
[Upload](/en/components/upload) zone is built on this composable, and its upload queue on
[useUploadQueue](/en/composables/upload-queue).
