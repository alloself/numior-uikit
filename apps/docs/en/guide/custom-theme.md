# Custom theme

A Numior UI theme is the keys of an `@theme` block in the CSS file with Tailwind: colors, radius,
font and a few details. The steps below build the theme of this site, and each step shows what it
changes. You can also put a theme together in the [builder](/en/theme/).

:::: steps

### Add the theme block

The `@theme` block goes into the CSS file that loads Tailwind, after the Numior UI theme:

```css
@import 'tailwindcss';
@import '@numior/kit/tailwind/theme.css';
@import '@numior/kit/styles.css';

@theme {
}
```

While the block is empty, components look like the base theme. The keys from the next steps reach
both the components and Tailwind classes such as `bg-primary`.

### Set the accent

A role color is a pair: `--color-primary` for the fill and `--color-primary-foreground` for the
text on it. Each value goes into `light-dark()`: the first for the light scheme, the second for the
dark one.

```css preview
@theme {
  --color-primary: light-dark(#ae3f10, #e0561a);
  --color-primary-foreground: light-dark(#f3f2ef, #030304);
  --color-primary-soft-foreground: light-dark(#7a2c04, #f2662f);
}
```

Hover, press, focus and the soft fill follow from the pair on their own. When a computed shade
does not fit, set its key: that is how the site theme darkens the text on the soft fill.

### Set surfaces and text

The page, card and field backgrounds, the text colors and the borders are pairs for both schemes
too:

```css preview
@theme {
  --color-surface: light-dark(#f3f2ef, #030304);
  --color-surface-muted: light-dark(#e9e8e5, #151414);
  --color-surface-elevated: light-dark(#faf9f6, #1d1b1b);
  --color-foreground: light-dark(#151414, #f3f2ef);
  --color-muted-foreground: light-dark(#5a5655, #9b9797);
  --color-border: light-dark(#d5d4d1, #2c2929);
}
```

The remaining keys for surfaces, text and secondary roles are in the
[theme file of this site](#the-theme-file-of-this-site).

### Set the radius and the font

All radii follow one key, and another key names the font:

```css preview
@theme {
  --radius-base: 0.25rem;
  --font-sans: 'Manrope Variable', ui-sans-serif, system-ui, sans-serif;
  --font-mono: 'JetBrains Mono Variable', ui-monospace, monospace;
}
```

The other radii follow `--radius-base`: `sm` is half of it, `lg` one and a half times, `xl` twice
as large. The theme only names the family, and the font files come from a package such as
`@fontsource-variable/manrope`.

### Tune the details

Group captions in lists, the list marker in text and the focus ring of fields are theme keys too:

```css preview
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
outside. Every key is listed in the [token reference](/en/theme/tokens).

::::

## Compare with the base theme

<ThemeCompare name="GuideTheme" />

On the left is the example without your keys, on the right the same example in the theme of this
site.

## Tailwind classes

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
