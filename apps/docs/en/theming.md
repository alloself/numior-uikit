# Theming

Import `@numior/tokens/theme.css`. Set `data-nui-theme="light|dark|system"` on
the document root or a scope; system is the default. Colors use CSS `light-dark()`,
so the scope must inherit the correct `color-scheme`. A nested theme attribute
starts its own preset.

```html
<section
  data-nui-theme="dark"
  data-nui-density="compact"
  style="--nui-primary: #86efac; --nui-primary-foreground: #052e16"
>
  <!-- Components in this scope -->
</section>
```

Roles: `primary`, `secondary`, `success`, `warning`, `error`, `info`, each with a
matching `*-foreground`; plus `surface`, `surface-muted`, `text`, `text-muted`,
`border` and `focus`. Customize both colors in a pair and verify contrast.
`--nui-radius`, `--nui-font`, `--nui-control-height` and `--nui-control-padding`
control geometry. Density supports `comfortable` and `compact`.

## Standalone utilities

Import `@numior/utilities/utilities.css`: `nui-flex`, `nui-wrap`,
`nui-items-center`, `nui-gap-2`, `nui-bg-surface`, `nui-bg-primary`,
`nui-text-primary-foreground`, `nui-text-muted`, `nui-rounded`.

## Tailwind 4

The integration is optional. In a consumer with Tailwind 4 configured:

```css
@import 'tailwindcss';
@import '@numior/tokens/theme.css';
@import '@numior/tailwind/theme.css';
```

Use `bg-primary`, `text-primary-foreground`, `bg-surface` and `rounded-nui`.
`@theme inline` maps these to CSS variables, so runtime themes match Vue
components. Components do not require Tailwind or its preflight.

Theme propagation through portals/overlays will arrive with those primitives;
the foundation currently verifies ordinary DOM nesting.
