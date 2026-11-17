# Rendering a document

A finished document renders without the editor, with the same styles.

<Example name="content/Basic" />

NuiContent takes the document or its JSON and checks the JSON against the schema first. On the
server it renders finished HTML, so the text is on the page before any script runs.

## Installation

```ts install:packages
import { NuiContent } from '@numior/content';
import { fromHTML } from '@numior/editor-core';
```

## Show tables, code and media

Pass components for the blocks that need them in `views`:

<Example name="content/Views" />

Each view lives in an entry of its own, so a page loads only the ones it imports:

- `NuiContentTable` from `@numior/content/table` shows a table with the sort and filters its
  author set.
- `NuiContentCode` from `@numior/content/code` highlights code in its language.
- `contentMediaViews` from `@numior/content/media` opens images full size and shows file cards and
  video frames.

The table view draws with NuiTable, so load `@numior/table/styles.css` with it. Without the media
views, an embedded video renders as a link.

A video shows as a frame only when its service is in `embeds`, the same list the editor takes.

## From HTML to a document

Turn descriptions stored as HTML into a document with `fromHTML`:

```ts
import { contentSchema } from '@numior/content';
import { fromHTML, toJSON } from '@numior/editor-core';

const doc = fromHTML(
  contentSchema,
  '<h2>Oslo armchair</h2><p>A soft armchair on an oak frame.</p>',
);

const json = toJSON(doc);
```

The schema decides what gets into the document: markup it does not describe is dropped, and its
text stays. Pass the result to NuiContent or to the editor, or store its JSON.

`renderContent(doc)` does the reverse and returns the HTML string of a document for a page built
without Vue. It is the same server render as `NuiContent`, so the function is async and icons
arrive in the HTML as ready `<svg>`. Pass your own icons in `icons`, keyed by icon name.

```ts
import { renderContent } from '@numior/content';

const html = await renderContent(doc, { size: 'lg' });
```

That page needs the content styles and `@numior/vue/styles/icon.css` too.

## API

<ApiReference name="NuiContent" />
