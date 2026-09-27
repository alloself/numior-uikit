# useFileDrop

`useFileDrop(options)` turns any element into a file drop zone. `attrs` go on the element,
`dragging` tells that files hover over the zone, `onFiles` receives the list. Dragged text
and links are ignored.

<Example name="composables/FileDrop" />

## Signature

<SignatureReference :names="['useFileDrop', 'FileDropOptions', 'FileDrop']" />

## Behaviour

`disabled` switches the zone off without removing the handlers. The [Upload](/en/components/upload)
zone is built on this composable, and the upload queue on
[useUploadQueue](/en/composables/upload-queue).
