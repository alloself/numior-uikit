# Утилиты и проза

`@numior/utilities` — небольшой набор классов `nui-*` на тех же токенах для раскладки
страниц без своего CSS и без Tailwind. Модули подключаются по отдельности или разом через
`utilities.css`; проза `.nui-prose` оформляет текст из markdown или CMS.

<Example name="guide/Utilities" />

## Установка

```ts
import '@numior/utilities/utilities.css';
```

```ts
import '@numior/utilities/layout.css';
import '@numior/utilities/prose.css';
```

## Модули

| Модуль       | Классы                                                                                                                                                                                                                                                                                                                           |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `layout`     | `nui-flex`, `nui-flex-col`, `nui-inline-flex`, `nui-grid`, `nui-grid-auto`, `nui-grid-auto-sm`, `nui-grid-auto-lg`, `nui-wrap`, `nui-items-*`, `nui-justify-*`, `nui-self-*`, `nui-gap-0…8`, `nui-grow`, `nui-shrink-0`, `nui-relative`, `nui-overflow-auto`, `nui-overflow-hidden`, `nui-hidden`                                |
| `spacing`    | `nui-m-*`, `nui-mt-*`, `nui-mb-*`, `nui-ms-*`, `nui-me-*`, `nui-mx-*`, `nui-my-*`, `nui-p-*`, `nui-px-*`, `nui-py-*` со ступенями 0…8, `nui-mx-auto`, `nui-ms-auto`, `nui-me-auto` — логические оси на шаге `--nui-space-*`                                                                                                      |
| `sizing`     | `nui-w-full`, `nui-w-auto`, `nui-w-fit`, `nui-max-w-sm…6xl`, `nui-max-w-prose`, `nui-max-w-full`, `nui-h-full`, `nui-h-80`, `nui-h-96`, `nui-min-h-40`, `nui-min-h-full`, `nui-min-h-screen`                                                                                                                                     |
| `typography` | `nui-text-xs…4xl`, `nui-font-normal`, `nui-font-medium`, `nui-font-semibold`, `nui-font-bold`, `nui-font-sans`, `nui-font-mono`, `nui-leading-*`, `nui-tracking-tight`, `nui-text-start`, `nui-text-center`, `nui-text-end`, `nui-truncate`, `nui-nowrap`, `nui-break-words`, `nui-tabular-nums`, `nui-uppercase`, `nui-sr-only` |
| `color`      | `nui-bg-surface`, `nui-bg-surface-muted`, `nui-bg-surface-elevated`, `nui-bg-<role>`, `nui-bg-<role>-soft`, `nui-bg-dots`, `nui-text`, `nui-text-muted`, `nui-text-subtle`, `nui-text-<role>`, `nui-text-<role>-foreground`                                                                                                      |
| `shape`      | `nui-border`, `nui-border-strong`, `nui-rounded`, `nui-rounded-sm`, `nui-rounded-lg`, `nui-rounded-full`, `nui-shadow-sm`, `nui-shadow-md`                                                                                                                                                                                       |

`nui-grid-auto` строит адаптивную сетку через `auto-fit` и переменную `--nui-grid-min`;
префиксов брейкпоинтов нет, раскладки отвечают на ширину сами.

## Проза

`.nui-prose` оформляет только голые элементы содержимого: заголовки, абзацы, списки, цитаты,
код, таблицы. Класс компонента внутри прозы всегда сильнее, а `.nui-not-prose` выключает
оформление для поддерева. Модификаторы `--size-sm` и `--size-lg` меняют шкалу.

<Example name="guide/Prose" />
