# Темы оформления

Как переключать светлую и тёмную тему, менять акцентный цвет, плотность и свои цвета
компонентов.

<Example name="guide/Scheme" />

Цвета, скругления, отступы и размеры компонентов задают CSS-переменные `--nui-*`, их называют
токенами. У каждого токена есть значение для светлой и для тёмной темы. Атрибут
`data-nui-theme` выбирает, какое из них действует.

## Подключение

Подключите файлы темы в точке входа приложения:

```ts
import '@numior/tokens/theme.css';
import '@numior/tokens/base.css';
import '@numior/tokens/accents.css';
```

Что делают `theme.css` и `base.css`, описано в [Начале работы](/guide/getting-started#стили).
`accents.css` нужен, только если вы меняете акцентный цвет атрибутом `data-nui-accent`.

## Переключатель темы

Чтобы пользователь сам выбирал тему, используйте `useColorScheme`:

```vue
<template>
  <NuiButton variant="ghost" tone="neutral" :aria-label="texts[scheme]" @click="cycle()">
    <NuiIcon :icon="icons[resolved]" />
  </NuiButton>
</template>

<script setup lang="ts">
import { NuiButton, NuiIcon, useColorScheme } from '@numior/vue';

const { scheme, resolved, cycle } = useColorScheme();
const icons = { light: 'sun', dark: 'moon' } as const;
const texts = { light: 'Светлая тема', dark: 'Тёмная тема', system: 'Системная тема' };
</script>
```

`scheme` — тема, которую выбрал пользователь: `light`, `dark` или `system`. `resolved` — тема,
которая видна на экране, `light` или `dark`. `cycle()` переключает темы по кругу, `toggle()` — между
светлой и тёмной, `set(theme)` ставит нужную.

Чтобы выбор сохранялся между визитами, передайте `colorScheme: { storageKey: 'theme' }` в
`createNuiConfig`. Тогда `useColorScheme()` в любом компоненте управляет одной темой на всё
приложение.

Чтобы при загрузке страница не мигала светлой темой, добавьте в `<head>` скрипт
`colorSchemeScript('theme')`. Он применит сохранённую тему до первой отрисовки.

## Акцентный цвет

Атрибут `data-nui-accent` меняет основной цвет кнопок, переключателей, ссылок и фокуса. Доступны
`indigo`, `blue`, `violet`, `emerald`, `teal`, `rose`, `orange`, `amber` и `slate`.

<Example name="guide/Accent" />

## Свои цвета

Чтобы задать свой цвет, переопределите пару токенов `--nui-<role>` и `--nui-<role>-foreground`:
цвет фона и цвет текста на нём. Оттенки для наведения, нажатия, фокуса и мягкого фона
(`-soft`) рассчитаются из них сами.

```css
[data-nui-theme] {
  --nui-primary: light-dark(oklch(0.55 0.2 300), oklch(0.8 0.12 300));
  --nui-primary-foreground: light-dark(oklch(1 0 0), oklch(0.25 0.08 300));
  --nui-radius-base: 0.75rem;
}
```

Задавайте токены на `:root` или на элементе с `data-nui-theme`. На другом элементе оттенки
вроде `--nui-primary-soft` и `--nui-focus` не пересчитаются и останутся старыми.

Скругления зависят от `--nui-radius-base`: `sm` вдвое меньше, `lg` в полтора раза больше, `xl`
вдвое больше.

## Плотность

Атрибут `data-nui-density="compact"` уменьшает высоту кнопок и полей, отступы и шрифт. По
умолчанию стоит `comfortable`: у кнопки размера `md` высота 2.5rem, а в `compact` — 2rem.

Свойство `size` работает в обоих режимах, в `compact` все размеры просто становятся меньше.
Поставьте атрибут на таблицу или боковую панель, чтобы сделать плотнее только их.

<Example name="guide/Density" />

## Токены

| Группа        | Токены                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Поверхности   | `--nui-surface`, `-muted`, `-elevated`, `-overlay`, `--nui-ring`, `--nui-backdrop`, `--nui-surface-code`                                                                                                                                                                                                                                                                                        |
| Текст         | `--nui-text`, `--nui-text-muted`, `--nui-text-subtle`, `--nui-code-inline`                                                                                                                                                                                                                                                                                                                      |
| Границы       | `--nui-border`, `--nui-border-strong`                                                                                                                                                                                                                                                                                                                                                           |
| Роли          | `primary`, `secondary`, `success`, `warning`, `error`, `info`, `neutral`: `--nui-<role>`, `-foreground`, `-soft`, `-soft-foreground`                                                                                                                                                                                                                                                            |
| Фокус         | `--nui-focus`, `--nui-focus-ring-width`, `--nui-focus-ring-offset`, `--nui-field-ring-width`, `--nui-disabled-opacity`                                                                                                                                                                                                                                                                          |
| Состояния     | `--nui-state-hover`, `--nui-state-pressed` — шаг светлоты сплошных кнопок; `-subtle` — шаг тонированных фонов (мягкие кнопки, выбранные пункты); `-overlay` — доля текста в `--nui-hover` и `--nui-pressed` поверх прозрачных пунктов; `-tint` — доля тона у ghost- и outline-кнопок                                                                                                            |
| Форма         | `--nui-radius-base`, `--nui-radius-sm`, `--nui-radius-md`, `--nui-radius-lg`, `--nui-radius-xl`, `--nui-radius-full`, `--nui-radius`                                                                                                                                                                                                                                                            |
| Отступы       | `--nui-space-1…6`, `--nui-space-8` (шаг 0.25rem)                                                                                                                                                                                                                                                                                                                                                |
| Типографика   | `--nui-font`, `--nui-font-mono`, `--nui-font-size-xs…4xl`, `--nui-font-weight-*`, `--nui-line-height`, `-tight`, `-relaxed`, `--nui-tracking-tight`, `--nui-font-heading`, `--nui-font-weight-heading`, `--nui-font-weight-title`, `--nui-tracking-heading`, `--nui-measure`                                                                                                                    |
| Подписи групп | `--nui-caption-weight`, `-tracking`, `-transform` — начертание подписей групп в списках и боковой панели; `--nui-caption-open`, `-close` — знаки вокруг подписи, например `'[ '` и `' ]'`                                                                                                                                                                                                       |
| Текст статьи  | `--nui-prose-marker` — маркер списков в `nui-prose`: `disc`, `square` или свой; `--nui-prose-marker-color`                                                                                                                                                                                                                                                                                      |
| Код           | `--nui-syntax-keyword`, `-string`, `-number`, `-function`, `-type`, `-tag`, `-attribute`, `-property`, `-comment`, `-variable`, `-punctuation`, `-highlight`                                                                                                                                                                                                                                    |
| Графики       | `--nui-chart-1…8` (категориальная палитра, проверена на дальтонизм в обеих темах), `--nui-chart-other`, `--nui-chart-grid`, `--nui-chart-axis`                                                                                                                                                                                                                                                  |
| Тени          | `--nui-shadow-sm`, `--nui-shadow-md`, `--nui-shadow-lg`                                                                                                                                                                                                                                                                                                                                         |
| Движение      | `--nui-duration-instant`, `--nui-duration-fast`, `--nui-duration-normal`, `--nui-duration-slow`, `--nui-easing`; наведение и нажатие — `fast`, нажатие сразу (`instant`); при `prefers-reduced-motion` длительности равны 0; бесконечные анимации (спиннеры, скелетоны, полоса загрузки) читают `--nui-animation-play-state`, и `paused` на своей обёртке останавливает их, например вне экрана |
| Слои          | `--nui-z-dropdown`, `--nui-z-overlay`, `--nui-z-toast`                                                                                                                                                                                                                                                                                                                                          |
| Контролы      | `--nui-control-height-*`, `--nui-control-padding-*`, `--nui-field-padding-*`, `--nui-control-font-size-*` для `sm`, `md`, `lg` и текущего размера                                                                                                                                                                                                                                               |

`NuiDialog`, `NuiDrawer`, `NuiPopover` и `NuiTooltip` остаются в DOM рядом с кнопкой, которая
их открыла. Поэтому у них та же тема, плотность и направление текста, что у этой кнопки.
