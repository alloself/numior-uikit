# Tailwind

Как верстать страницы классами Tailwind 4 в цветах и размерах темы Numior UI.

<Example name="guide/Tailwind" />

Пресет `@numior/tailwind` связывает классы Tailwind с токенами темы. `bg-surface`,
`text-muted-foreground`, `rounded-md` и `text-sm` дают те же цвета, скругления и размеры, что у
компонентов. Все примеры этой документации свёрстаны так.

## Установка

Подключите плагин Tailwind в `vite.config.ts`:

```ts
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({ plugins: [tailwindcss()] });
```

Затем подключите пресет в CSS после `tailwindcss`:

```css
@import 'tailwindcss';
@import '@numior/tailwind/theme.css';
```

Пресету нужны токены из `@numior/tokens/theme.css`, подключите их тоже. Классы ссылаются на
переменные `--nui-*`. Поэтому при смене темы, акцента или значения токена меняются и классы, и
компоненты.

## Классы пресета

| Группа      | Классы                                                                                                                                                                                                                                                                                                |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Цвета       | `bg-surface`, `bg-surface-muted`, `bg-surface-elevated`, `bg-<role>`, `bg-<role>-soft`, `text-foreground`, `text-muted-foreground`, `text-subtle-foreground`, `text-<role>`, `text-<role>-foreground`, `border-border`, `border-border-strong`, `ring-ring`, `bg-surface-code`, `text-syntax-<scope>` |
| Скругления  | `rounded-sm`, `rounded-md`, `rounded-lg`, `rounded-xl` из `--nui-radius-*`                                                                                                                                                                                                                            |
| Отступы     | шкала `p-*`, `m-*`, `gap-*` от `--nui-space-1`, то есть 0.25rem за единицу                                                                                                                                                                                                                            |
| Шрифты      | `font-sans`, `font-mono`, `text-xs` … `text-4xl` с высотой строки из токенов, `font-normal` … `font-bold`, `leading-tight`, `leading-relaxed`, `tracking-tight`, `max-w-prose`                                                                                                                        |
| Тени        | `shadow-sm`, `shadow-md`, `shadow-lg`                                                                                                                                                                                                                                                                 |
| Движение    | `ease-nui`; переходы Tailwind по умолчанию используют кривую `--nui-easing`                                                                                                                                                                                                                           |
| Сетка и фон | `grid-auto`, `grid-auto-sm`, `grid-auto-lg` — сетка, где колонки не уже 16, 12 и 20rem и сами переносятся на новую строку; `bg-dots` — фон в точку                                                                                                                                                    |

Вместо `<role>` подставьте `primary`, `secondary`, `success`, `warning`, `error`, `info` или
`neutral`. Класс `border` без цвета рисует рамку цвета `--nui-border`, как у компонентов.

## Preflight и стили компонентов

Preflight, сброс стилей Tailwind, с компонентами не конфликтует: его селекторы слабее классов
компонентов. С Tailwind файл `@numior/tokens/base.css` не нужен: preflight убирает отступы
`body`, а шрифт берёт из токенов пресета. Фон странице задайте классом `bg-surface`.

## Оформление текста

Добавьте класс `.nui-prose` из `@numior/tokens/prose.css` на блок со статьёй или текстом из
CMS. Внутри него оформятся заголовки, абзацы, списки, цитаты, код и таблицы без своих классов.

Компоненты внутри такого блока выглядят как обычно. Класс `.nui-not-prose` отключает оформление
внутри элемента, а модификаторы `--size-sm` и `--size-lg` уменьшают или увеличивают текст.

<Example name="guide/Prose" />
