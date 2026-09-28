# Upload

`NuiUpload` takes files by drag and drop or through the dialog, checks them and hands each one
to the `upload` adapter. The component makes no requests itself: the model holds items with
statuses.

<Example name="upload/Basic" />

## Installation

```ts
import { NuiUpload } from '@numior/vue';
import '@numior/vue/styles/field.css';
import '@numior/vue/styles/upload.css';
```

## Examples

### Thumbnail grid

`layout="grid"` shows images as thumbnails from object URLs; already uploaded files use their
`url`.

<Example name="upload/Grid" />

### Upload on a button

`auto="false"` keeps files in the `queued` status until `start()` is called through a component
ref.

<Example name="upload/Manual" />

## Behaviour

Files pass the `accept`, `maxSize`, `maxFiles` and custom `validate` checks. Rejected ones stay
listed with the reason under `rejected="list"` and leave the model under `rejected="drop"`.
Accepted files go to the adapter, at most `concurrency` at a time.

Cancelling aborts the request through `signal`. An adapter error keeps the row with a retry
button. Removing a finished file emits `remove`, and the app deletes it on the server.

In single mode a rejected replacement leaves the selected file in place. `disabled` blocks both
receiving files and removing rows.

## Accessibility

The whole zone is clickable; with the keyboard the "Browse files" button picks files and carries
the field label, description and error. Rows announce progress and status, the cancel, retry
and remove buttons have accessible names.

<KeyboardReference name="NuiUpload" />

## API

<ApiReference name="NuiUpload" />
