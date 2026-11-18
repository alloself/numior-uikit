# Custom theme

How to build your own theme on top of the base one. This site wears such a theme: the steps
that produced it are below, followed by the whole file.

<ThemeCompare name="GuideTheme" />

The same example is shown in the base theme and in the theme of this site.

## Create a theme file

Set the values of theme keys in the `@theme` block of the CSS file that loads Tailwind. The
block goes after the Numior UI theme:

```css
@import 'tailwindcss';
@import '@numior/kit/tailwind/theme.css';

@theme {
  --color-primary: light-dark(#ae3f10, #e0561a);
  --color-primary-foreground: light-dark(#f3f2ef, #030304);
}
```

Components and Tailwind classes such as `bg-primary` get the new values. Parts of a page with
their own light or dark theme get them too.

## Set the colors

Write every color as a pair inside `light-dark()`: the first value applies in the light theme,
the second in the dark one.

```css
@theme {
  --color-surface: light-dark(#f3f2ef, #030304);
  --color-surface-muted: light-dark(#e9e8e5, #151414);
  --color-surface-elevated: light-dark(#faf9f6, #1d1b1b);
  --color-foreground: light-dark(#151414, #f3f2ef);
  --color-muted-foreground: light-dark(#5a5655, #9b9797);
  --color-border: light-dark(#d5d4d1, #2c2929);
}
```

A role color has two keys: `--color-primary` for the background and
`--color-primary-foreground` for the text on it. The shades for hover, press, focus and the
soft background are computed from that pair.

When a computed shade does not fit, set its key in the same `@theme`. The theme of this site
darkens the text on the soft background this way: `--color-primary-soft-foreground`.

## Set the shape and the font

One key drives the corner radii, another names the font:

```css
@theme {
  --radius-base: 0.25rem;
  --font-sans: 'Manrope Variable', ui-sans-serif, system-ui, sans-serif;
  --font-mono: 'JetBrains Mono Variable', ui-monospace, monospace;
}
```

The other radii follow `--radius-base`: `sm` is half of it, `lg` is one and a half times
larger, `xl` is twice as large. Load the font files yourself, the theme only names the family.

## Tune the details

Group captions in lists and the sidebar, the list marker in prose and the focus frame of
fields are theme keys too:

```css
@theme {
  --caption-transform: uppercase;
  --tracking-caption: 0.16em;
  --caption-open: '[ ';
  --caption-close: ' ]';
  --prose-marker: square;
  --field-ring-width: 0px;
}
```

With `--field-ring-width: 0px` a focused field changes its border color and draws no ring
outside. The full key list is in [Theming](/en/guide/theming#tokens).

## Tailwind

The theme is the Tailwind setup, so there is nothing to repeat. The classes
`bg-surface-elevated`, `text-muted-foreground`, `border` and `rounded-lg` in the example above
read the same keys and change together with the theme.

```vue
<section class="rounded-lg border bg-surface-elevated p-5 shadow-sm">
  <p class="text-sm text-muted-foreground">Peter Wolfe · Boston</p>
  <NuiButton>Confirm order</NuiButton>
</section>
```

The [Tailwind](/en/guide/tailwind) guide shows how to add the preset.

## Theme one part of a page

To theme a single block, set base keys on your own class:

```css
.promo {
  --color-primary: light-dark(#0f766e, #5eead4);
  --color-primary-foreground: light-dark(#ffffff, #042f2e);
}
```

```html
<section class="promo">
  <NuiButton>Claim the discount</NuiButton>
</section>
```

The soft background, focus and hover inside the block follow its colors on their own. A
derived key such as `--color-primary-soft` has no effect on a class: its value is computed
where it is used. To make the block dark on a light page, add the `nui-theme--dark` class.

A block sets its own soft accent text and code line highlight with
`--color-theme-soft-foreground` and `--color-theme-syntax-highlight`. The derived keys take their
values, and an accent class `nui-theme--accent-<name>` inside the block resets them.

## The theme file of this site

This is the theme you are reading the docs in:

<<< @/guide/snippets/numior-theme.css

On the site these values sit on the `docs-theme--numior` class of `<html>`. There the soft text
and the code line highlight come from `--color-theme-soft-foreground` and
`--color-theme-syntax-highlight`. Picking a built-in accent in the header removes that class.
