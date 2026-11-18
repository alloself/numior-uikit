# Tailwind

Numior UI is written in Tailwind 4, and its theme is a Tailwind theme.

<Example name="guide/Tailwind" />

Tailwind classes hold the order card together: the border, the background, the spacing and the
layout. The avatar, the status and the buttons inside it come from the library and take their
colors from the same theme keys.

## How the styles are built

Component styles live in CSS files whose properties are Tailwind classes applied with `@apply`.
This is how the button starts:

```css
@layer components {
  .nui-button {
    --_tone: var(--color-primary);
    --_tone-foreground: var(--color-primary-foreground);

    @apply px-(--_padding) border border-transparent rounded bg-(--_tone) font-sans;
    @apply text-(--_tone-foreground) cursor-pointer;
  }
}
```

The Tailwind of your app builds these files in the same pass as the classes in your templates. So
the page has one theme: `bg-primary` in your markup and the button background read the same
`--color-primary` key. [Getting started](/en/guide/getting-started#installation) shows how to set up
Tailwind and the styles.

The `numior()` plugin looks for components in the project code. The `@import
'@numior/kit/styles.css'` line then brings in the styles of the ones it found. A component you add
to the code gets its styles without a dev server restart.

## Theme

The Numior UI theme is the `@theme` block of the `@numior/kit/tailwind/theme.css` preset. It holds
the colors of the light and dark schemes, radii, spacing, fonts, shadows and easing curves.

The keys have Tailwind names: `--color-*`, `--radius-*`, `--font-*`, `--spacing`. You change them as
in any Tailwind project, with your own `@theme` block after the preset:

```css
@import 'tailwindcss';
@import '@numior/kit/tailwind/theme.css';
@import '@numior/kit/styles.css';

@theme {
  --color-primary: light-dark(#ae3f10, #e0561a);
  --color-primary-foreground: light-dark(#ffffff, #030304);
  --radius-base: 0.25rem;
  --font-sans: 'Manrope Variable', ui-sans-serif, system-ui, sans-serif;
}
```

The components and classes such as `bg-primary` and `rounded-md` pick up the new values. The
hover, pressed and soft shades are computed from the `--color-primary` and
`--color-primary-foreground` pair. [Theming](/en/guide/theming#tokens) lists every key, and
[Custom theme](/en/guide/custom-theme) walks through the theme of this site step by step.

## Theme classes

The preset keys add classes next to the standard Tailwind ones, and the Tailwind palette (`red-500`,
`zinc-200` and the rest) stays. The `bg-surface text-foreground` classes on `<body>` give the page
its background and text color.

| Group             | Classes                                                                                                                                                                                                                                                                                               |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Colors            | `bg-surface`, `bg-surface-muted`, `bg-surface-elevated`, `bg-<role>`, `bg-<role>-soft`, `text-foreground`, `text-muted-foreground`, `text-subtle-foreground`, `text-<role>`, `text-<role>-foreground`, `border-border`, `border-border-strong`, `ring-ring`, `bg-surface-code`, `text-syntax-<scope>` |
| Radii             | `rounded-sm`, `rounded-md`, `rounded-lg`, `rounded-xl` from `--radius-*`                                                                                                                                                                                                                              |
| Spacing           | the `p-*`, `m-*`, `gap-*` scale from `--spacing`, that is 0.25rem per step                                                                                                                                                                                                                            |
| Fonts             | `font-sans`, `font-mono`, `font-heading`, `text-xs` … `text-4xl` with line heights from the tokens, `font-normal` … `font-bold`, `leading-tight`, `leading-relaxed`, `tracking-tight`, `tracking-heading`, `max-w-prose`                                                                              |
| Shadows           | `shadow-sm`, `shadow-md`, `shadow-lg`                                                                                                                                                                                                                                                                 |
| Motion            | `ease-nui`; Tailwind transitions use the `--ease-nui` curve by default                                                                                                                                                                                                                                |
| Grid and backdrop | `grid-auto`, `grid-auto-sm`, `grid-auto-lg`: a grid whose columns are at least 16, 12 or 20rem wide and wrap to a new row on their own; `bg-dots`: a dotted background                                                                                                                                |

Replace `<role>` with `primary`, `secondary`, `success`, `warning`, `error`, `info` or
`neutral`. The `border` class without a color draws a border in `--color-border`, as on the
components.

## Dark theme in classes

The `dark:` variant applies when the dark theme is in effect where the element sits. It follows
the nearest theme class: `nui-theme--dark` inside a light page turns it on, `nui-theme--light`
inside a dark one turns it off.

```html
<section class="nui-theme--dark">
  <p class="text-muted-foreground dark:text-foreground">Order #1042 is packed</p>
</section>
```

A page without a theme class and an element with `nui-theme--system` follow the system setting.

## Classes on components

A class on a component tag lands on its root element. Component styles sit in the `components`
layer, and Tailwind classes sit in the later `utilities` layer, so the class wins.

That is how you place a component in a layout. `w-full` stretches it to the column
width, `col-span-2` spans two grid columns, `mt-4` moves it away from its neighbor.

```html
<form class="grid grid-cols-2 gap-4">
  <NuiInput v-model="name" class="col-span-2" />
  <NuiButton type="submit" class="w-full">Save</NuiButton>
</form>
```

Change the color, height and look of a component with the `tone`, `variant` and `size` props and
the theme keys. A color class on the root overrides the states too: a button with `bg-red-500`
keeps its background on hover.

## Text styling

Import `@numior/kit/prose.css` in the CSS file after the Numior UI styles. Then add the `.nui-prose`
class to a block with an article or CMS text. Headings, paragraphs, lists, quotes, code and tables
inside it get styled without their own classes.

Components inside such a block look as usual. The `.nui-not-prose` class turns the styling off
inside an element, and the `--size-sm` and `--size-lg` modifiers make the text smaller or
larger.

<Example name="guide/Prose" />
