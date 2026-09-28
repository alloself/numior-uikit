# Tailwind

Раскладка страниц в проектах на kit пишется классами Tailwind 4. Пресет `@numior/tailwind`
кладёт токены темы на стандартные имена, поэтому `bg-surface`, `text-muted-foreground`,
`rounded-md` и `text-sm` читают те же переменные, что и компоненты. Своих утилит у kit нет,
все примеры этой документации свёрстаны так же.

<Example name="guide/Tailwind" />

## Установка

```ts
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({ plugins: [tailwindcss()] });
```

```css
@import 'tailwindcss';
@import '@numior/tailwind/theme.css';
```

Пресет подключается после `tailwindcss` и рядом с `@numior/tokens/theme.css` в JavaScript или
CSS приложения. Значения в нём — ссылки на `--nui-*`, а не копии: смена схемы, акцента или
переопределение токена на `[data-nui-theme]` меняет и утилиты, и компоненты.

## Что даёт пресет

| Группа   | Утилиты                                                                                                                                                                                                                                                                                               |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Цвета    | `bg-surface`, `bg-surface-muted`, `bg-surface-elevated`, `bg-<role>`, `bg-<role>-soft`, `text-foreground`, `text-muted-foreground`, `text-subtle-foreground`, `text-<role>`, `text-<role>-foreground`, `border-border`, `border-border-strong`, `ring-ring`, `bg-surface-code`, `text-syntax-<scope>` |
| Форма    | `rounded-sm`, `rounded-md`, `rounded-lg`, `rounded-xl` из `--nui-radius-*`                                                                                                                                                                                                                            |
| Отступы  | шкала `p-*`, `m-*`, `gap-*` от `--nui-space-1`, то есть 0.25rem за единицу                                                                                                                                                                                                                            |
| Шрифты   | `font-sans`, `font-mono`, `text-xs` … `text-4xl` с высотой строки из токенов, `font-normal` … `font-bold`, `leading-tight`, `leading-relaxed`, `tracking-tight`, `max-w-prose`                                                                                                                        |
| Тени     | `shadow-sm`, `shadow-md`, `shadow-lg`                                                                                                                                                                                                                                                                 |
| Движение | `ease-nui`; переходы по умолчанию идут через `--nui-easing`                                                                                                                                                                                                                                           |
| Свои     | `grid-auto`, `grid-auto-sm`, `grid-auto-lg` — адаптивная сетка через `auto-fit` с минимумом 16, 12 и 20rem; `bg-dots` — точечная подложка превью                                                                                                                                                      |

Границы по умолчанию красятся в `--nui-border`, поэтому `border` без цвета совпадает с рамками
компонентов. Роли: `primary`, `secondary`, `success`, `warning`, `error`, `info`, `neutral`.

## Preflight и стили компонентов

Preflight сбрасывает элементы селекторами нулевой специфичности, классы компонентов сильнее,
поэтому конфликтов нет. Playground и эта документация работают под preflight.
`@numior/tokens/base.css` при этом не нужен: поля `body`, фон и шрифт страницы задаёт
preflight вместе с токенами.

## Проза

`.nui-prose` из `@numior/tokens/prose.css` оформляет голые элементы содержимого: заголовки,
абзацы, списки, цитаты, код, таблицы. Класс компонента внутри прозы всегда сильнее, а
`.nui-not-prose` выключает оформление для поддерева. Модификаторы `--size-sm` и `--size-lg`
меняют шкалу.

<Example name="guide/Prose" />
