# Files and links

Images, files, videos and link cards sit in the document next to the text.

<Example name="editor/Uploads" />

Paste or drop a file into the text, or pick Image or File in the slash menu or the + menu. The
`upload` function receives the file with `onProgress` and `signal` and returns the address of the
stored file.

While the upload runs, the file shows as a card with its progress and a cancel button. A failed
upload offers Retry. Without `upload`, images and files can only be inserted by link.

A file that fails `accept` or `maxSize` still takes its place as a card with the reason and a
Remove button. Screen readers hear the file name and the reason. When such a file is picked to
replace an image, the image stays and a toast gives the reason, so the app needs a `NuiToaster`.

<SignatureReference :names="['NuiEditorUploadAdapter', 'UploadContext', 'NuiEditorUploaded']" />

## Image in the text

Click an image to open its bar. The bar sets how the text flows around the image: in line with
the text, wrapped around it, or on a line of its own.

An image outside the line can be aligned and gets a caption. The bar also replaces the image,
downloads it and sets the alternative text that screen readers announce.

Drag a corner to resize the image, from a fifth of the text width to the full width. The corner
grip is a slider too: the arrow keys, Page Up, Page Down, Home and End change the width.

## Embed a video

List the services you allow in `embeds`:

<Example name="editor/Embeds" />

Paste a link on an empty line, and the editor offers to embed it, show it as a bookmark or keep
it as a link. Without `embeds`, nothing is embedded, and a link to a service off the list stays a
link.

Add your own service as a rule. `source` turns the address of a page into the address of the
frame, or returns nothing for a link it does not know:

```ts
import type { NuiEmbedProvider } from '@numior/kit/content';

const showroom: NuiEmbedProvider = {
  id: 'showroom',
  label: 'Showroom tour',
  aspect: 16 / 9,
  source: (url) =>
    url.hostname === 'tours.shop.example'
      ? `https://tours.shop.example/embed${url.pathname}`
      : undefined,
};
```

Pass the same list to NuiContent so that the published page shows the frames as well.

## Link card

Return the title, description and picture of a link from `linkMetadata`:

<Example name="editor/Bookmarks" />

Without the function, a card shows only the address and the domain. The author can edit the
title and description of a card or refresh them.

<SignatureReference :names="['NuiEditorLinkMetadata', 'NuiEditorLinkPreview']" />
