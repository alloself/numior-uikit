# Tailwind

Интеграция опциональна: компоненты не требуют Tailwind и его preflight. `@numior/tailwind`
связывает токены темы с утилитами Tailwind 4 через `@theme inline`, поэтому `bg-primary` и
`NuiButton` красятся одной переменной и вместе меняют схему.

## Установка

```css
@import 'tailwindcss';
@import '@numior/tokens/theme.css';
@import '@numior/tailwind/theme.css';
```

## Что доступно

| Группа   | Утилиты                                                                                                                                                                                      |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Цвета    | `bg-surface`, `bg-surface-muted`, `bg-<role>`, `bg-<role>-soft`, `text-foreground`, `text-muted-foreground`, `text-<role>-foreground`, `border-border`, `border-border-strong`, `ring-focus` |
| Форма    | `rounded-nui`, `rounded-nui-sm`, `rounded-nui-lg`, `rounded-nui-full`                                                                                                                        |
| Отступы  | `p-nui-1` … `p-nui-8`, `gap-nui-4`, `m-nui-2`                                                                                                                                                |
| Шрифты   | `font-nui`, `font-nui-mono`, `text-nui-xs` … `text-nui-4xl`                                                                                                                                  |
| Тени     | `shadow-nui-sm`, `shadow-nui-md`, `shadow-nui-lg`                                                                                                                                            |
| Движение | `duration-nui-fast`, `duration-nui-normal`, `duration-nui-slow`, `ease-nui`                                                                                                                  |

Значения — ссылки на `--nui-*`, а не копии: переопределение токена на `[data-nui-theme]`
меняет и утилиты, и компоненты.

## Preflight и стили компонентов

Preflight Tailwind сбрасывает элементы селекторами нулевой специфичности, а классы
компонентов сильнее, поэтому конфликтов нет. Если preflight отключён, подключите
`@numior/tokens/base.css` для полей `body` и шрифта страницы. Утилиты `@numior/utilities`
можно не подключать: они дублируют часть Tailwind.
