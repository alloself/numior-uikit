# Upload

`NuiUpload` is a field for uploading files. Files can be dropped onto a zone on the page or
chosen in a dialog, and the list below shows their upload progress and errors.

<Example name="upload/Basic" />

The component sends no requests itself: each file goes to the `upload` function. It uploads the
file, reports progress through `onProgress` and returns a result such as the file URL. `v-model`
holds an array of files with the `queued`, `uploading`, `done` and `error` statuses.

## Installation

```ts
import { NuiUpload } from '@numior/vue';
import '@numior/vue/styles/field.css';
import '@numior/vue/styles/upload.css';
```

## Examples

### Thumbnail grid

With `layout="grid"` images show as thumbnails right after they are chosen, before the upload.
Files that are already uploaded take the thumbnail from their `url`.

<Example name="upload/Grid" />

### Upload on a button

With `:auto="false"` chosen files wait in the `queued` status. The upload starts when the
application calls the `start()` method on a component ref.

<Example name="upload/Manual" />

### Button only

With `variant="button"` the drop zone gives way to a single browse button and the file list.
Files cannot be dropped onto such a field.

<Example name="upload/Button" />

### Avatar

`NuiAvatarUpload` uploads one image and shows it in an [Avatar](/en/components/avatar). To
replace the photo, click the avatar or drop a new file onto it; a separate button removes the
photo.

When a new file fails the checks, the current image stays in place.

<Example name="upload/Avatar" />

## Behaviour

Every file goes through the checks: the type against `accept`, the size against `maxSize`, the
count against `maxFiles` and the `validate` function. With the default `rejected="list"` rejected
files stay in the list with the reason, and with `rejected="drop"` they never reach the model.

At most `concurrency` files upload at the same time, 3 by default. Cancelling aborts the request
through `signal`, and on an error the row shows a "Retry" button.

Removing an uploaded file emits the `remove` event, and the application deletes the file on the
server. With `:multiple="false"` a new file replaces the previous one, but a rejected file leaves
it in place. The `disabled` prop blocks both adding and removing files.

## Accessibility

A click anywhere in the zone opens the file dialog. On the keyboard the "Choose files" button
picks files, and the field label, hint and error are linked to it.

Rows announce the upload progress and status. The cancel, retry and remove buttons have names
for screen readers.

<KeyboardReference name="NuiUpload" />

## API

<ApiReference name="NuiUpload" />

<ApiReference name="NuiAvatarUpload" />
