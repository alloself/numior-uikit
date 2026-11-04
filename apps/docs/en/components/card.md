# Card

`NuiCard` is a card with a title, text and actions: a plan, a project, an article. The whole
card can lead to a link or act as a button.

<Example name="card/Basic" />

## Installation

```ts
import { NuiCard, NuiCardContent, NuiCardHeader, NuiCardTitle } from '@numior/vue';
import '@numior/vue/styles/card.css';
```

## Usage

<Configurator name="NuiCard" />

## Anatomy

| Part                 | What it holds                                                 |
| -------------------- | ------------------------------------------------------------- |
| `NuiCard`            | The card frame, inner padding, a link or a button             |
| `NuiCardHeader`      | The title with a description, the `actions` slot on the right |
| `NuiCardTitle`       | The card title, an `<h3>` by default                          |
| `NuiCardDescription` | A line under the title in a muted colour                      |
| `NuiCardContent`     | The main text of the card                                     |
| `NuiCardFooter`      | Buttons at the bottom of the card                             |
| `NuiCardMedia`       | An image from edge to edge with a given aspect ratio          |

## Examples

### Image

`NuiCardMedia` shows the image from `src` across the full width of the card. The `aspect` prop
sets the aspect ratio, such as `3 / 1`, and crops the rest.

<Example name="card/Media" />

### Link card

Pass `href` or `to` to make the card clickable anywhere and follow the link. Buttons in the
`actions` slot and in the footer are pressed separately and do not open the link.

<Example name="card/Link" />

### Interactive card

With `interactive` the card acts as a button: a click anywhere on it emits the `click` event.

<Example name="card/Interactive" />

### Variants and padding

The `variant` prop sets the look: `outline` with a border, `elevated` with a shadow or `soft`
with a fill. `padding` sets the space inside the card: `xs`, `sm`, `md` (the default) or `lg`.

<Example name="card/Variants" />

The `xs` padding suits a dense grid of many cards.

### Header without parts

The `title` and `description` props render the card header when you do not need your own header
markup.

<Example name="card/Props" />

## Accessibility

A link card and an interactive card need a title: a `NuiCardTitle` or the `title` prop. A screen
reader names the link or the button by this title rather than by the whole card text. The focus
ring goes around the entire card.

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
