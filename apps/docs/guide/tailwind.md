# Tailwind

Numior UI написан на Tailwind 4, и его тема — это тема Tailwind.

<Example name="guide/Tailwind" />

Карточку заказа держат классы Tailwind: рамка, фон, отступы и сетка. Аватар, статус и кнопки
внутри неё берутся из библиотеки, и цвета у них из тех же ключей темы.

## Как устроены стили

Стили компонентов лежат в CSS-файлах, свойства в них заданы классами Tailwind через `@apply`.
Так начинается кнопка:

```css
@layer components {
  .nui-button {
    --_tone: var(--color-primary);
    --_tone-foreground: var(--color-primary-foreground);

    @apply px-(--_padding) border border-transparent rounded bg-(--_tone) font-sans;
    @apply text-(--_tone-foreground) cursor-pointer;
  }
}
```

Эти файлы собирает Tailwind вашего приложения, в том же проходе, что и классы в шаблонах. Поэтому у
страницы одна тема: `bg-primary` в разметке и фон кнопки читают один ключ `--color-primary`. Как
подключить Tailwind и стили, описано в [Начале работы](/guide/getting-started#установка).

Плагин `numior()` ищет компоненты в коде проекта, и строка `@import '@numior/kit/styles.css'`
подключает стили только найденных. Компонент, добавленный в код, получает свои стили без перезапуска
dev-сервера.

## Тема

Тема Numior UI — блок `@theme` в пресете `@numior/kit/tailwind/theme.css`: цвета светлой и
тёмной схемы, скругления, отступы, шрифты, тени и кривые движения. Имена ключей те же, что у
Tailwind: `--color-*`, `--radius-*`, `--font-*`, `--spacing`. Меняются они так же, как в любом
проекте на Tailwind, своим блоком `@theme` после пресета:

```css
@import 'tailwindcss';
@import '@numior/kit/tailwind/theme.css';
@import '@numior/kit/styles.css';

@theme {
  --color-primary: light-dark(#ae3f10, #e0561a);
  --color-primary-foreground: light-dark(#ffffff, #030304);
  --radius-base: 0.25rem;
  --font-sans: 'Manrope Variable', ui-sans-serif, system-ui, sans-serif;
}
```

Новые значения получат компоненты и классы вроде `bg-primary` и `rounded-md`. Оттенки наведения,
нажатия и мягкого фона рассчитаются из пары `--color-primary` и `--color-primary-foreground`.
Все ключи собраны в [Темах оформления](/guide/theming#токены), а тема этого сайта разобрана по
шагам в руководстве [Своя тема](/guide/custom-theme).

## Классы темы

Ключи пресета дают классы рядом со стандартными классами Tailwind, палитра Tailwind (`red-500`,
`zinc-200` и другие) остаётся. Фон и цвет текста странице задают классы `bg-surface text-foreground`
на `<body>`.

| Группа      | Классы                                                                                                                                                                                                                                                                                                |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Цвета       | `bg-surface`, `bg-surface-muted`, `bg-surface-elevated`, `bg-<role>`, `bg-<role>-soft`, `text-foreground`, `text-muted-foreground`, `text-subtle-foreground`, `text-<role>`, `text-<role>-foreground`, `border-border`, `border-border-strong`, `ring-ring`, `bg-surface-code`, `text-syntax-<scope>` |
| Скругления  | `rounded-sm`, `rounded-md`, `rounded-lg`, `rounded-xl` из `--radius-*`                                                                                                                                                                                                                                |
| Отступы     | шкала `p-*`, `m-*`, `gap-*` от `--spacing`, то есть 0.25rem за единицу                                                                                                                                                                                                                                |
| Шрифты      | `font-sans`, `font-mono`, `font-heading`, `text-xs` … `text-4xl` с высотой строки из токенов, `font-normal` … `font-bold`, `leading-tight`, `leading-relaxed`, `tracking-tight`, `tracking-heading`, `max-w-prose`                                                                                    |
| Тени        | `shadow-sm`, `shadow-md`, `shadow-lg`                                                                                                                                                                                                                                                                 |
| Движение    | `ease-nui`; переходы Tailwind по умолчанию используют кривую `--ease-nui`                                                                                                                                                                                                                             |
| Сетка и фон | `grid-auto`, `grid-auto-sm`, `grid-auto-lg` — сетка, где колонки не уже 16, 12 и 20rem и сами переносятся на новую строку; `bg-dots` — фон в точку                                                                                                                                                    |

Вместо `<role>` подставьте `primary`, `secondary`, `success`, `warning`, `error`, `info` или
`neutral`. Класс `border` без цвета рисует рамку цвета `--color-border`, как у компонентов.

## Тёмная тема в классах

Вариант `dark:` срабатывает, когда тёмная тема действует там, где стоит элемент. Он следует за
ближайшим классом темы: `nui-theme--dark` внутри светлой страницы включает его, `nui-theme--light`
внутри тёмной выключает.

```html
<section class="nui-theme--dark">
  <p class="text-muted-foreground dark:text-foreground">Заказ № 1042 собран</p>
</section>
```

Страница без класса темы и элемент с `nui-theme--system` следуют за настройкой системы.

## Классы на компонентах

Класс на теге компонента попадает на его корневой элемент. Стили компонентов лежат в слое
`components`, а классы Tailwind в слое `utilities`, который идёт после него, поэтому класс
сильнее стиля компонента. Так компонент ставят в раскладку: `w-full` растягивает его на ширину
колонки, `col-span-2` занимает две колонки сетки, `mt-4` отодвигает от соседа.

```html
<form class="grid grid-cols-2 gap-4">
  <NuiInput v-model="name" class="col-span-2" />
  <NuiButton type="submit" class="w-full">Сохранить</NuiButton>
</form>
```

Цвет, высоту и вид компонента меняйте свойствами `tone`, `variant`, `size` и ключами темы. Класс
цвета на корне перекрывает и состояния: кнопка с `bg-red-500` не меняет фон при наведении.

## Оформление текста

Подключите `@numior/kit/prose.css` в CSS-файле после стилей Numior UI и добавьте класс `.nui-prose`
на блок со статьёй или текстом из CMS. Внутри него оформятся заголовки, абзацы, списки, цитаты, код
и таблицы без своих классов.

Компоненты внутри такого блока выглядят как обычно. Класс `.nui-not-prose` отключает оформление
внутри элемента, а модификаторы `--size-sm` и `--size-lg` уменьшают или увеличивают текст.

<Example name="guide/Prose" />
