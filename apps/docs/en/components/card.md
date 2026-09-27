# Card

`NuiCard` is a surface container assembled from parts: header, title, description, content, footer
and media. The whole card can be a link or a button.

<Example name="card/Basic" />

## Installation

```ts
import { NuiCard, NuiCardContent, NuiCardHeader, NuiCardTitle } from '@numior/vue';
import '@numior/tokens/theme.css';
import '@numior/vue/styles/card.css';
```

## Usage

<Configurator name="NuiCard" />

## Anatomy

| Part                 | Role                                                          |
| -------------------- | ------------------------------------------------------------- |
| `NuiCard`            | Surface, padding and the link or button mode                  |
| `NuiCardHeader`      | Heading with a description and the `actions` slot on the side |
| `NuiCardTitle`       | Heading; in an interactive card it holds the single link      |
| `NuiCardDescription` | Subheading in the muted colour                                |
| `NuiCardContent`     | Main content                                                  |
| `NuiCardFooter`      | Actions at the bottom                                         |
| `NuiCardMedia`       | Image cropped to the edge with a given aspect ratio           |

## Examples

### Media

`NuiCardMedia` stretches the image to the card edge; `aspect` sets the ratio.

<Example name="card/Media" />

### Link card

`href` makes the whole card a link. The button in `actions` and the footer work apart from it.

<Example name="card/Link" />

### Interactive card

`interactive` turns the card into a button; a click anywhere arrives in `@click`.

<Example name="card/Interactive" />

### Variants and padding

`variant` picks an outline, a shadow or a soft fill, `padding` the inset of every part.

<Example name="card/Variants" />

### Header from props

`title` and `description` draw the header without parts.

<Example name="card/Props" />

## Accessibility

An interactive card is not wrapped in an `<a>` as a whole: its name would become the entire text and
nested buttons would turn invalid. Instead the title holds the single link or button and stretches
it over the card, so such a card needs a `NuiCardTitle` or a `title`. The focus ring is drawn
around the whole card.

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
