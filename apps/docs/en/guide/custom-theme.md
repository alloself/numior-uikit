# Custom theme

How to build your own theme on top of the base one. This site wears such a theme: the steps
that produced it are below, followed by the whole file.

<Example name="guide/Theme" />

Turn on "Base theme" above the example to see the same components without the site theme.
Every example in the docs has this toggle.

## Create a theme file

Create a CSS file and import it after `theme.css`:

```ts
import '@numior/tokens/theme.css';
import '@numior/tokens/base.css';
import './brand.css';
```

A theme is a set of values for the `--nui-*` tokens. Set them on `:root` and on elements with
`data-nui-theme`:

```css
:root,
[data-nui-theme] {
  --nui-primary: light-dark(#ae3f10, #e0561a);
  --nui-primary-foreground: light-dark(#f3f2ef, #030304);
}
```

The second selector covers parts of a page that have their own light or dark theme, because
the tokens are declared again there. Component styles stay as they are.

## Set the colors

Write every color as a pair inside `light-dark()`: the first value applies in the light theme,
the second in the dark one.

```css
:root,
[data-nui-theme] {
  --nui-surface: light-dark(#f3f2ef, #030304);
  --nui-surface-muted: light-dark(#e9e8e5, #151414);
  --nui-surface-elevated: light-dark(#faf9f6, #1d1b1b);
  --nui-text: light-dark(#151414, #f3f2ef);
  --nui-text-muted: light-dark(#5a5655, #9b9797);
  --nui-border: light-dark(#d5d4d1, #2c2929);
}
```

A role color has two tokens: `--nui-primary` for the background and `--nui-primary-foreground`
for the text on it. The shades for hover, press, focus and the soft background are computed
from that pair.

## Set the shape and the font

One token drives the corner radii, another names the font:

```css
:root,
[data-nui-theme] {
  --nui-radius-base: 0.25rem;
  --nui-font: 'Manrope Variable', ui-sans-serif, system-ui, sans-serif;
  --nui-font-mono: 'JetBrains Mono Variable', ui-monospace, monospace;
}
```

The other radii follow `--nui-radius-base`: `sm` is half of it, `lg` is one and a half times
larger, `xl` is twice as large. Load the font files yourself, the theme only names the family.

## Tune the details

Group captions in lists and the sidebar, the list marker in prose and the focus frame of
fields are tokens too:

```css
:root,
[data-nui-theme] {
  --nui-caption-transform: uppercase;
  --nui-caption-tracking: 0.16em;
  --nui-caption-open: '[ ';
  --nui-caption-close: ' ]';
  --nui-prose-marker: square;
  --nui-field-ring-width: 0px;
}
```

With `--nui-field-ring-width: 0px` a focused field changes its border color and draws no ring
outside. The full token list is in [Theming](/en/guide/theming#tokens).

## Tailwind

The `@numior/tailwind` preset reads the same tokens, so the theme is not repeated in the
Tailwind setup. The classes `bg-surface-elevated`, `text-muted-foreground`, `border` and
`rounded-lg` in the example above change together with the theme.

```vue
<section class="rounded-lg border bg-surface-elevated p-5 shadow-sm">
  <p class="text-sm text-muted-foreground">Peter Wolfe · Boston</p>
  <NuiButton>Confirm order</NuiButton>
</section>
```

The [Tailwind](/en/guide/tailwind) guide shows how to add the preset.

## Theme one part of a page

To theme a single block, set the tokens on your own element with `data-nui-theme`:

```css
.promo[data-nui-theme] {
  --nui-primary: light-dark(#0f766e, #5eead4);
  --nui-primary-foreground: light-dark(#ffffff, #042f2e);
}
```

```html
<section class="promo" data-nui-theme>
  <NuiButton>Claim the discount</NuiButton>
</section>
```

The attribute is required: without it, shades such as `--nui-primary-soft` and `--nui-focus`
keep the values of the page theme.

## The theme file of this site

This is the theme you are reading the docs in:

<<< @/.vitepress/theme/numior.css

The `:not([data-nui-accent])` condition is specific to the site. It turns the theme off where
a built-in accent is picked in the header or the base theme is on above an example.
