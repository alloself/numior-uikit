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

| Модуль       | Классы                                                                                                                                                                                                                            |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `layout`     | `nui-flex`, `nui-flex-col`, `nui-inline-flex`, `nui-grid`, `nui-grid-auto`, `-sm`, `-lg`, `nui-wrap`, `nui-items-*`, `nui-justify-*`, `nui-self-*`, `nui-gap-0…8`, `nui-grow`, `nui-shrink-0`, `nui-relative`, `nui-overflow-auto | hidden`, `nui-hidden` |
| `spacing`    | `nui-m                                                                                                                                                                                                                            | mt                    | mb                      | ms                    | me                                                            | mx     | my-0…8`, `nui-p                                                                                           | pt   | pb      | px  | py-0…8`, `nui-mx-auto`, `nui-ms-auto`, `nui-me-auto`— логические оси, шаг`--nui-space-*` |
| `sizing`     | `nui-w-full                                                                                                                                                                                                                       | auto                  | fit`, `nui-max-w-sm…6xl | prose                 | full`, `nui-h-full                                            | 80     | 96`, `nui-min-h-40                                                                                        | full | screen` |
| `typography` | `nui-text-xs…4xl`, `nui-font-normal                                                                                                                                                                                               | medium                | semibold                | bold`, `nui-font-sans | mono`, `nui-leading-*`, `nui-tracking-tight`, `nui-text-start | center | end`, `nui-truncate`, `nui-nowrap`, `nui-break-words`, `nui-tabular-nums`, `nui-uppercase`, `nui-sr-only` |
| `color`      | `nui-bg-surface`, `-muted`, `-elevated`, `nui-bg-<role>`, `nui-bg-<role>-soft`, `nui-bg-dots`, `nui-text`, `nui-text-muted`, `nui-text-subtle`, `nui-text-<role>`, `nui-text-<role>-foreground`                                   |
| `shape`      | `nui-border`, `nui-border-strong`, `nui-rounded`, `-sm`, `-lg`, `-full`, `nui-shadow-sm                                                                                                                                           | md`                   |

`nui-grid-auto` строит адаптивную сетку через `auto-fit` и переменную `--nui-grid-min`;
префиксов брейкпоинтов нет, раскладки отвечают на ширину сами.

## Проза

`.nui-prose` оформляет только голые элементы содержимого: заголовки, абзацы, списки, цитаты,
код, таблицы. Класс компонента внутри прозы всегда сильнее, а `.nui-not-prose` выключает
оформление для поддерева. Модификаторы `--size-sm` и `--size-lg` меняют шкалу.

<Example name="guide/Prose" />
