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
import '@numior/kit/theme.css';
import '@numior/kit/base.css';
import '@numior/kit/accents.css';
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
import { NuiButton, NuiIcon, useColorScheme } from '@numior/kit';

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

Свои цвета, скругления и шрифт задаёт файл темы. Как его собрать, показано в руководстве
[Своя тема](/guide/custom-theme) на примере темы этого сайта.

## Плотность

Атрибут `data-nui-density="compact"` уменьшает высоту кнопок и полей, отступы и шрифт. По
умолчанию стоит `comfortable`: у кнопки размера `md` высота 2.5rem, а в `compact` — 2rem.

Свойство `size` работает в обоих режимах, в `compact` все размеры просто становятся меньше.
Поставьте атрибут на таблицу или боковую панель, чтобы сделать плотнее только их.

<Example name="guide/Density" />

## Токены

| Группа        | Токены                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Поверхности   | `--nui-surface`, `-muted`, `-elevated`, `-overlay`, `--nui-ring`, `--nui-backdrop`, `--nui-surface-code`                                                                                                                                                                                                                                                                                                                                                                          |
| Текст         | `--nui-text`, `--nui-text-muted`, `--nui-text-subtle`, `--nui-code-inline`                                                                                                                                                                                                                                                                                                                                                                                                        |
| Границы       | `--nui-border`, `--nui-border-strong`                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Роли          | `primary`, `secondary`, `success`, `warning`, `error`, `info`, `neutral`: `--nui-<role>`, `-foreground`, `-soft`, `-soft-foreground`                                                                                                                                                                                                                                                                                                                                              |
| Фокус         | `--nui-focus`, `--nui-focus-ring-width`, `--nui-focus-ring-offset`, `--nui-field-ring-width`, `--nui-disabled-opacity`                                                                                                                                                                                                                                                                                                                                                            |
| Состояния     | `--nui-state-hover`, `--nui-state-pressed` — доля цвета подписи, которую заливка подмешивает при наведении и нажатии: 8 % и 16 % во всём ките; `--nui-hover` и `--nui-pressed` — те же доли текста поверх прозрачных пунктов                                                                                                                                                                                                                                                      |
| Форма         | `--nui-radius-base`, `--nui-radius-sm`, `--nui-radius-md`, `--nui-radius-lg`, `--nui-radius-xl`, `--nui-radius-full`, `--nui-radius`                                                                                                                                                                                                                                                                                                                                              |
| Отступы       | `--nui-space-1…6`, `--nui-space-8` (шаг 0.25rem)                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Типографика   | `--nui-font`, `--nui-font-mono`, `--nui-font-size-xs…4xl`, `--nui-font-weight-*`, `--nui-line-height`, `-tight`, `-relaxed`, `-control`, `-label` (строка на целых пикселях: однострочные контролы и подписи с переносом), `--nui-tracking-tight`, `--nui-font-heading`, `--nui-font-weight-heading`, `--nui-font-weight-title`, `--nui-tracking-heading`, `--nui-measure`, `--nui-icon-size`, `--nui-icon-size-sm` (иконка 16 px при тексте 14 px, всегда чётное число пикселей) |
| Подписи групп | `--nui-caption-weight`, `-tracking`, `-transform` — начертание подписей групп в списках и боковой панели; `--nui-caption-open`, `-close` — знаки вокруг подписи, например `'[ '` и `' ]'`                                                                                                                                                                                                                                                                                         |
| Текст статьи  | `--nui-prose-marker` — маркер списков в `nui-prose`: `disc`, `square` или свой; `--nui-prose-marker-color`                                                                                                                                                                                                                                                                                                                                                                        |
| Код           | `--nui-syntax-keyword`, `-string`, `-number`, `-function`, `-type`, `-tag`, `-attribute`, `-property`, `-comment`, `-variable`, `-punctuation`, `-highlight`                                                                                                                                                                                                                                                                                                                      |
| Графики       | `--nui-chart-1…8` (категориальная палитра, проверена на дальтонизм в обеих темах), `--nui-chart-other`, `--nui-chart-grid`, `--nui-chart-axis`                                                                                                                                                                                                                                                                                                                                    |
| Тени          | `--nui-shadow-sm`, `--nui-shadow-md`, `--nui-shadow-lg`                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Движение      | `--nui-duration-instant`, `--nui-duration-fast`, `--nui-duration-normal`, `--nui-duration-slow`, `--nui-easing`; наведение и нажатие — `fast`, нажатие сразу (`instant`); при `prefers-reduced-motion` длительности равны 0; бесконечные анимации (спиннеры, скелетоны, полоса загрузки) читают `--nui-animation-play-state`, и `paused` на своей обёртке останавливает их, например вне экрана                                                                                   |
| Слои          | `--nui-z-dropdown`, `--nui-z-overlay`, `--nui-z-toast`                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Контролы      | `--nui-control-height-*`, `--nui-control-padding-*`, `--nui-field-padding-*`, `--nui-control-font-size-*` для `sm`, `md`, `lg` и текущего размера                                                                                                                                                                                                                                                                                                                                 |

`NuiDialog`, `NuiDrawer`, `NuiPopover` и `NuiTooltip` остаются в DOM рядом с кнопкой, которая
их открыла. Поэтому у них та же тема, плотность и направление текста, что у этой кнопки.
