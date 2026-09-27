# Utilities and prose

`@numior/utilities` is a small set of `nui-*` classes on the same tokens for laying out pages
without own CSS and without Tailwind. The modules are imported one by one or all at once
through `utilities.css`; the `.nui-prose` module styles text from markdown or a CMS.

<Example name="guide/Utilities" />

## Installation

```ts
import '@numior/utilities/utilities.css';
```

```ts
import '@numior/utilities/layout.css';
import '@numior/utilities/prose.css';
```

## Modules

| Module       | Classes                                                                                                                                                                                                                           |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `layout`     | `nui-flex`, `nui-flex-col`, `nui-inline-flex`, `nui-grid`, `nui-grid-auto`, `-sm`, `-lg`, `nui-wrap`, `nui-items-*`, `nui-justify-*`, `nui-self-*`, `nui-gap-0…8`, `nui-grow`, `nui-shrink-0`, `nui-relative`, `nui-overflow-auto | hidden`, `nui-hidden` |
| `spacing`    | `nui-m                                                                                                                                                                                                                            | mt                    | mb                      | ms                    | me                                                            | mx     | my-0…8`, `nui-p                                                                                           | pt   | pb      | px  | py-0…8`, `nui-mx-auto`, `nui-ms-auto`, `nui-me-auto`, logical axes on the `--nui-space-*` step |
| `sizing`     | `nui-w-full                                                                                                                                                                                                                       | auto                  | fit`, `nui-max-w-sm…6xl | prose                 | full`, `nui-h-full                                            | 80     | 96`, `nui-min-h-40                                                                                        | full | screen` |
| `typography` | `nui-text-xs…4xl`, `nui-font-normal                                                                                                                                                                                               | medium                | semibold                | bold`, `nui-font-sans | mono`, `nui-leading-*`, `nui-tracking-tight`, `nui-text-start | center | end`, `nui-truncate`, `nui-nowrap`, `nui-break-words`, `nui-tabular-nums`, `nui-uppercase`, `nui-sr-only` |
| `color`      | `nui-bg-surface`, `-muted`, `-elevated`, `nui-bg-<role>`, `nui-bg-<role>-soft`, `nui-bg-dots`, `nui-text`, `nui-text-muted`, `nui-text-subtle`, `nui-text-<role>`, `nui-text-<role>-foreground`                                   |
| `shape`      | `nui-border`, `nui-border-strong`, `nui-rounded`, `-sm`, `-lg`, `-full`, `nui-shadow-sm                                                                                                                                           | md`                   |

`nui-grid-auto` builds a responsive grid through `auto-fit` and the `--nui-grid-min` variable;
there are no breakpoint prefixes, the layouts respond to the width on their own.

## Prose

`.nui-prose` styles bare content elements only: headings, paragraphs, lists, quotes, code,
tables. A component class inside prose always wins, and `.nui-not-prose` switches the styling
off for a subtree. The `--size-sm` and `--size-lg` modifiers change the scale.

<Example name="guide/Prose" />
