# Upload

File uploads by drag and drop or from the file picker.

<Example name="upload/Basic" />

Your `upload` function sends each file to the server:

```ts
type NuiUploadAdapter<R> = (
  file: File,
  context: { onProgress: (fraction: number) => void; signal: AbortSignal },
) => Promise<R>;
```

Report the uploaded share from 0 to 1 to `onProgress`, and pass `signal` to `fetch` so a canceled
file stops its request. The returned value becomes the `result` of the file in the model.

## Installation

```ts
import { NuiUpload } from '@numior/vue';
import '@numior/vue/styles/field.css';
import '@numior/vue/styles/upload.css';
```

## Usage

Add a few photos, then change the look of the field and the layout of the files.

<Configurator name="NuiUpload" />

## Examples

### Show thumbnails

Set `layout="grid"`.

<Example name="upload/Grid" />

An image shows as a thumbnail as soon as it is picked, before the upload ends. Files that are
already on the server take the thumbnail from their `url`.

### Upload on a button press

Turn off `auto` and start the upload yourself.

<Example name="upload/Manual" />

Picked files wait in the `queued` status until you call `start()` on the component ref.

### Keep only a button

Set `variant="button"`.

<Example name="upload/Button" />

Such a field takes no dropped files, and the file list stays below the button.

### Upload an avatar

Use `NuiAvatarUpload`.

<Example name="upload/Avatar" />

Click the avatar or drop an image on it to replace the photo. A file that fails the checks shows
the reason and leaves the current photo in place.

## Behavior

- Each file goes through the checks: the type against `accept`, the size against `maxSize`, the
  count against `maxFiles`, then your `validate`. A rejected file stays in the list with the
  reason, and with `rejected="drop"` it never gets there.
- At most `concurrency` files upload at once, and the rest wait in the queue.
- Canceling stops the request through `signal` and takes the file off the list. A failed upload
  gets a retry button that sends the same file again.
- Removing a file emits `remove`, so delete an uploaded file on the server in its handler. With
  `:multiple="false"` a new file takes the place of the old one, and `disabled` blocks both adding
  and removing.

## Accessibility

A click anywhere in the zone opens the file picker, and on the keyboard the browse button does the
same. The label, the hint and the error are linked to that button.

Each row shows the upload progress, and a screen reader announces when a file is uploaded or
fails. The cancel, retry and remove buttons have names for screen readers.

<KeyboardReference name="NuiUpload" />

## API

<ApiReference name="NuiUpload" />

<ApiReference name="NuiAvatarUpload" />
