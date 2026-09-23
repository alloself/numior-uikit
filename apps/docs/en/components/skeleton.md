# Skeleton

`NuiSkeleton` is a decorative loading placeholder: `aria-hidden`, a shimmering gradient
built from the surface tokens. Under `prefers-reduced-motion` the shimmer is switched off
entirely, and `animated="false"` does the same explicitly.

<div class="nui-demo nui-demo--stack" data-nui-theme="light">
  <div style="display: flex; gap: 0.75rem; align-items: center">
    <NuiSkeleton shape="circle" />
    <NuiSkeleton :lines="2" />
  </div>
  <NuiSkeleton shape="rect" height="5rem" />
  <NuiSkeleton width="40%" :animated="false" />
</div>

```vue
<div class="row">
  <NuiSkeleton shape="circle" />
  <NuiSkeleton :lines="2" />
</div>
<NuiSkeleton shape="rect" height="5rem" />
```

A skeleton does not announce loading by itself: mark the container with
`aria-busy="true"` or use `NuiProgress` with a label so screen readers know about the
process.

## API

| Prop       | Type                           | Default   | Description                               |
| ---------- | ------------------------------ | --------- | ----------------------------------------- |
| `shape`    | `'text' \| 'rect' \| 'circle'` | `'text'`  | Shape                                     |
| `width`    | `string`                       | per shape | Width (`--_inline-size`)                  |
| `height`   | `string`                       | per shape | Height (`--_block-size`)                  |
| `lines`    | `number`                       | `1`       | Lines for `text`; the last one is shorter |
| `animated` | `boolean`                      | `true`    | Shimmer                                   |

Block `nui-skeleton`, modifiers `--shape-*`, `--static`; element `__line`.
