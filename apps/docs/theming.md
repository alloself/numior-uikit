# Темизация

Подключите `@numior/tokens/theme.css`. На корне документа или области задайте
`data-nui-theme="light|dark|system"`; по умолчанию используется системная схема.
Цвета используют CSS `light-dark()`, поэтому область должна наследовать
корректный `color-scheme`. Вложенная область с атрибутом темы начинает свой preset.

```html
<section
  data-nui-theme="dark"
  data-nui-density="compact"
  style="--nui-primary: oklch(0.87 0.14 154); --nui-primary-foreground: oklch(0.27 0.06 153)"
>
  <!-- Компоненты этой области -->
</section>
```

Публичный контракт — только семантические токены. Значения заданы в `oklch()` внутри
`light-dark()`, производные состояния (soft, hover, active) вычисляются через
`color-mix()` от токена роли, поэтому достаточно заменить одну пару `--nui-<role>` и
`--nui-<role>-foreground`. Проверяйте контраст обеих сторон пары.

::: warning Область переопределения
`var()` внутри custom property вычисляется на элементе, который её объявляет.
Переопределяйте токены ролей на элементе с `data-nui-theme` (или на `:root`).
Если переопределить `--nui-primary` на обычном элементе, унаследованные
`--nui-primary-soft` и `--nui-focus` останутся старыми: задайте их тоже.
:::

## Токены

| Группа      | Токены                                                                                                                                                                                 |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Поверхности | `--nui-surface`, `--nui-surface-muted`, `--nui-surface-elevated`, `--nui-surface-overlay`, `--nui-backdrop` (затемнение под модальными слоями)                                         |
| Текст       | `--nui-text`, `--nui-text-muted`, `--nui-text-subtle`                                                                                                                                  |
| Границы     | `--nui-border`, `--nui-border-strong`                                                                                                                                                  |
| Роли        | `primary`, `secondary`, `success`, `warning`, `error`, `info`, `neutral`: `--nui-<role>`, `--nui-<role>-foreground`, `--nui-<role>-soft`, `--nui-<role>-soft-foreground`               |
| Фокус       | `--nui-focus`, `--nui-focus-ring-width`, `--nui-focus-ring-offset`                                                                                                                     |
| Состояния   | `--nui-disabled-opacity`                                                                                                                                                               |
| Радиусы     | `--nui-radius-sm`, `--nui-radius-md`, `--nui-radius-lg`, `--nui-radius-full`; `--nui-radius` = md                                                                                      |
| Отступы     | `--nui-space-1` … `--nui-space-6`, `--nui-space-8` (шаг 0.25rem)                                                                                                                       |
| Типографика | `--nui-font`, `--nui-font-mono`, `--nui-font-size-xs/sm/md/lg`, `--nui-line-height`, `--nui-line-height-tight`                                                                         |
| Тени        | `--nui-shadow-sm`, `--nui-shadow-md`, `--nui-shadow-lg`                                                                                                                                |
| Движение    | `--nui-duration-fast`, `--nui-duration-normal`, `--nui-easing`; при `prefers-reduced-motion: reduce` длительности равны `0ms`                                                          |
| Слои        | `--nui-z-dropdown`, `--nui-z-overlay`, `--nui-z-toast`                                                                                                                                 |
| Контролы    | `--nui-control-height-sm/md/lg`, `--nui-control-padding-sm/md/lg`, `--nui-control-font-size-sm/md/lg`; `--nui-control-height`, `--nui-control-padding`, `--nui-control-font-size` = md |

## Плотность и размеры

`data-nui-density="comfortable|compact"` сдвигает всю шкалу контролов и наследуется
через вложенные темы. Размер конкретного элемента выбирается его prop `size`
(`sm`, `md`, `lg`) внутри текущей шкалы. В `compact` высоты равны 1.75 / 2 / 2.5rem,
в `comfortable` — 2 / 2.5 / 3rem.

## Независимые утилиты

Подключите `@numior/utilities/utilities.css`. Классы `nui-*` читают те же токены:
`nui-flex`, `nui-wrap`, `nui-items-center`, `nui-gap-1…4`, `nui-bg-surface(-muted|-elevated)`,
`nui-bg-<role>`, `nui-bg-<role>-soft`, `nui-text`, `nui-text-muted`, `nui-text-subtle`,
`nui-text-<role>`, `nui-text-<role>-foreground`, `nui-border(-strong)`,
`nui-rounded(-sm|-lg|-full)`, `nui-shadow-sm|md`.

## Tailwind 4

Интеграция опциональна. В consumer с настроенным Tailwind 4:

```css
@import 'tailwindcss';
@import '@numior/tokens/theme.css';
@import '@numior/tailwind/theme.css';
```

Доступны `bg-primary`, `bg-primary-soft`, `text-primary-foreground`, `bg-surface`,
`text-subtle-foreground`, `border-border-strong`, `rounded-nui(-sm|-lg|-full)`,
`p-nui-4`, `font-nui`, `text-nui-sm`, `shadow-nui-md`, `ease-nui`. `@theme inline`
связывает их с CSS variables, поэтому runtime-темизация совпадает с оформлением
Vue-компонентов. Компоненты не требуют Tailwind или его preflight.

Перенос темы через portals/overlays будет реализован с соответствующими
примитивами; в основании пока проверяется обычная DOM-вложенность.
