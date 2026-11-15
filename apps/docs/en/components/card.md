# Card

A frame around one thing on the screen, such as an order or a product.

<Example name="card/Basic" />

## Installation

```ts install
import { NuiCard, NuiCardContent, NuiCardHeader, NuiCardTitle } from '@numior/vue';
```

## Usage

Change the look and the padding.

<Configurator name="NuiCard" />

## Anatomy

| Part                 | What it holds                                         |
| -------------------- | ----------------------------------------------------- |
| `NuiCard`            | The frame, the padding, the link or the button        |
| `NuiCardHeader`      | The title and the description, `actions` on the right |
| `NuiCardTitle`       | The title, an `<h3>` by default                       |
| `NuiCardDescription` | A muted line under the title                          |
| `NuiCardContent`     | The main text                                         |
| `NuiCardFooter`      | Buttons at the bottom                                 |
| `NuiCardMedia`       | An edge-to-edge image with a set aspect ratio         |

## Examples

### Add an image

Put `NuiCardMedia` first and set its `aspect`.

<Example name="card/Media" />

### Make the card a link

Pass `href` or `to`.

<Example name="card/Link" />

Buttons inside a link card press on their own and do not follow the link.

### Make the card a button

Add `interactive` and listen to `click`.

<Example name="card/Interactive" />

The card emits `click` only for a click on the card itself: buttons and links inside it press on
their own.

### Show a loading state

Add `loading`.

<Example name="card/Loading" />

Each placeholder takes the height of a text line, so the header keeps its height when the data
arrives. The placeholders need `@numior/vue/styles/skeleton.css`.

### Fill the header from props

Pass `title` and `description`.

<Example name="card/Props" />

## Accessibility

A link card and a button card need a title, a `NuiCardTitle` or the `title` prop. A screen
reader names the link or the button by this title, not by the whole card text. The focus ring
goes around the whole card.

A card with `loading` tells a screen reader that its content is still loading.

<KeyboardReference name="NuiCard" />

## API

<ApiReference
  :names="[
    'NuiCard',
    'NuiCardHeader',
    'NuiCardTitle',
    'NuiCardDescription',
    'NuiCardContent',
    'NuiCardFooter',
    'NuiCardMedia',
  ]"
/>
