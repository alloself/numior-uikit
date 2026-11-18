# Темы оформления

Как переключать светлую и тёмную тему, менять акцентный цвет, плотность и свои цвета
компонентов.

<Example name="guide/Scheme" />

Цвета, скругления, отступы и размеры компонентов задают ключи темы Tailwind: `--color-primary`,
`--radius-md`, `--spacing` и другие. У цвета есть значение для светлой и для тёмной темы. Класс
`nui-theme--light`, `nui-theme--dark` или `nui-theme--system` выбирает, какое из них действует.

## Подключение

Тема входит в пресет `@numior/kit/tailwind/theme.css`, как его подключить, описано в руководстве
[Начало работы](/guide/getting-started#установка). Классы акцентов подключите в том же CSS-файле
после пресета, в слой `theme`:

```css
@import 'tailwindcss';
@import '@numior/kit/tailwind/theme.css';
@import '@numior/kit/accents.css' layer(theme);
```

`accents.css` нужен, только если вы меняете акцентный цвет классом `nui-theme--accent-<имя>`. В
слое `theme` класс акцента перекрывает ключи темы порядком подключения.

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
`colorSchemeScript('theme')`. Он поставит на `<html>` класс сохранённой темы до первой
отрисовки.

## Тема для части страницы

Класс темы работает на любом элементе: `nui-theme--dark` внутри светлой страницы делает тёмной
только эту часть. В примере в начале страницы `useColorScheme({ scope })` ставит класс на свой
блок, а остальная страница не меняется.

Вариант `dark:` в классах Tailwind следует за ближайшим классом темы. Страница без класса и
элемент с `nui-theme--system` следуют за настройкой системы.

## Акцентный цвет

Класс `nui-theme--accent-<имя>` меняет основной цвет кнопок, переключателей, ссылок и фокуса.
Доступны `indigo`, `blue`, `violet`, `emerald`, `teal`, `rose`, `orange`, `amber` и `slate`.

Класс задаёт только `--color-primary` и `--color-primary-foreground`. Мягкий фон, фокус и
наведение внутри элемента рассчитываются от них сами.

<Example name="guide/Accent" />

## Свои цвета

Свои цвета, скругления и шрифт задаются ключами в блоке `@theme`. Как собрать тему, показано в
руководстве [Своя тема](/guide/custom-theme) на примере темы этого сайта.

## Плотность

Класс `nui-theme--density-compact` уменьшает высоту кнопок и полей, отступы и шрифт. Без него у
кнопки размера `md` высота 2.5rem, а с ним — 2rem.

Свойство `size` работает с классом и без него, с классом все размеры просто становятся меньше.
Поставьте класс на таблицу или боковую панель, чтобы сделать плотнее только их.

<Example name="guide/Density" />

## Токены

Ключи из блока `@theme inline` файла `theme.css` производные: их значение считается от базовых
ключей там, где они используются. Задайте базовый ключ, и производные изменятся вместе с ним.
Производный ключ можно переопределить только в своём `@theme`, на классе он не действует.

| Группа        | Ключи                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Поверхности   | `--color-surface`, `-muted`, `-elevated`, `-overlay`, `--color-surface-ring`, `--color-backdrop`, `--color-surface-code`                                                                                                                                                                                                                                                                                                                                                           |
| Текст         | `--color-foreground`, `--color-muted-foreground`, `--color-subtle-foreground`, `--color-code-inline`                                                                                                                                                                                                                                                                                                                                                                               |
| Границы       | `--color-border`, `--color-border-strong`                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Роли          | `primary`, `secondary`, `success`, `warning`, `error`, `info`, `neutral`: `--color-<role>`, `-foreground`; производные `-soft` и `-soft-foreground`; у `neutral` ещё производные `-muted`, `-muted-foreground` и доля `--neutral-muted-mix`                                                                                                                                                                                                                                        |
| Мягкий фон    | `-soft` смешивает тон с фоном из `--color-layer`, без него — с `--color-surface`; поповеры и меню ставят `--color-layer` сами через `nui-layer`, `nui-layer--elevated` и `nui-surface--muted`, на своей панели задайте его цветом её фона; `--soft-min-lightness` — нижняя граница светлоты мягкого фона                                                                                                                                                                           |
| Фокус         | `--color-ring` (производный, равен `--color-primary`), `--focus-ring-width`, `--focus-ring-offset`, `--field-ring-width`, `--opacity-disabled`                                                                                                                                                                                                                                                                                                                                     |
| Состояния     | `--state-hover`, `--state-pressed` — доля цвета подписи, которую заливка подмешивает при наведении и нажатии: 8 % и 16 % во всём ките; производные `--color-hover` и `--color-pressed` — те же доли текста поверх прозрачных пунктов                                                                                                                                                                                                                                               |
| Форма         | `--radius-base`, производные `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-xl`, `--radius`; `--radius-full`                                                                                                                                                                                                                                                                                                                                                               |
| Отступы       | `--spacing` — шаг 0.25rem; `--spacing(4)` в CSS и `p-4` в классах дают четыре шага                                                                                                                                                                                                                                                                                                                                                                                                 |
| Типографика   | `--font-sans`, `--font-mono`, `--text-xs…4xl`, `--font-weight-*`, `--leading-normal`, `--leading-tight`, `--leading-relaxed`, `--leading-control`, `--leading-label` (строка на целых пикселях: однострочные контролы и подписи с переносом), `--tracking-tight`, `--font-heading`, `--font-weight-heading`, `--font-weight-title`, `--tracking-heading`, `--container-prose`, `--spacing-icon`, `--spacing-icon-sm` (иконка 16 px при тексте 14 px, всегда чётное число пикселей) |
| Подписи групп | `--font-weight-caption`, `--tracking-caption`, `--caption-transform` — начертание подписей групп в списках и боковой панели; `--caption-open`, `--caption-close` — знаки вокруг подписи, например `'[ '` и `' ]'`                                                                                                                                                                                                                                                                  |
| Текст статьи  | `--prose-marker` — маркер списков в `nui-prose`: `disc`, `square` или свой; `--color-prose-marker`                                                                                                                                                                                                                                                                                                                                                                                 |
| Код           | `--color-syntax-keyword`, `-string`, `-number`, `-function`, `-type`, `-tag`, `-attribute`, `-property`, `-comment`, `-variable`, `-punctuation`, `-highlight`                                                                                                                                                                                                                                                                                                                     |
| Графики       | `--color-chart-1…8` (категориальная палитра, проверена на дальтонизм в обеих темах), `--color-chart-other`, `--color-chart-grid`, `--color-chart-axis`                                                                                                                                                                                                                                                                                                                             |
| Тени          | `--shadow-sm`, `--shadow-md`, `--shadow-lg`                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Движение      | `--transition-duration-instant`, `-fast`, `-normal`, `-slow`, `--ease-nui`; наведение и нажатие — `fast`, нажатие сразу (`instant`); при `prefers-reduced-motion` длительности равны 0; бесконечные анимации (спиннеры, скелетоны, полоса загрузки) читают `--nui-animation-play-state`, и `paused` на своей обёртке останавливает их, например вне экрана                                                                                                                         |
| Слои          | `--z-index-dropdown`, `--z-index-overlay`, `--z-index-toast`                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Контролы      | `--spacing-control-*`, `--spacing-control-pad-*`, `--spacing-field-pad-*`, `--text-control-*` для размеров `xs`…`lg`; производные `--spacing-control`, `--spacing-control-pad`, `--text-control` равны размеру `md`                                                                                                                                                                                                                                                                |

`NuiDialog`, `NuiDrawer`, `NuiPopover` и `NuiTooltip` остаются в DOM рядом с кнопкой, которая
их открыла. Поэтому у них та же тема, плотность и направление текста, что у этой кнопки.
