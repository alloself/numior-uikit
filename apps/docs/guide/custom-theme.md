# Своя тема

Как собрать свою тему из базовой. Этот сайт оформлен такой темой: ниже шаги, которыми она
получена, и её файл целиком.

<ThemeCompare name="GuideTheme" />

Один и тот же пример показан в базовой теме и в теме этого сайта.

## Создайте файл темы

Задайте значения ключей темы в блоке `@theme` того CSS-файла, где подключён Tailwind. Блок
ставится после темы Numior UI:

```css
@import 'tailwindcss';
@import '@numior/tailwind/theme.css';

@theme {
  --color-primary: light-dark(#ae3f10, #e0561a);
  --color-primary-foreground: light-dark(#f3f2ef, #030304);
}
```

Новые значения получат компоненты и классы Tailwind вроде `bg-primary`. Части страницы со своей
светлой или тёмной темой берут их тоже.

## Задайте цвета

Запишите каждый цвет парой значений в `light-dark()`: первое действует в светлой теме, второе
в тёмной.

```css
@theme {
  --color-surface: light-dark(#f3f2ef, #030304);
  --color-surface-muted: light-dark(#e9e8e5, #151414);
  --color-surface-elevated: light-dark(#faf9f6, #1d1b1b);
  --color-foreground: light-dark(#151414, #f3f2ef);
  --color-muted-foreground: light-dark(#5a5655, #9b9797);
  --color-border: light-dark(#d5d4d1, #2c2929);
}
```

У цвета роли два ключа: `--color-primary` для фона и `--color-primary-foreground` для текста на
нём. Оттенки для наведения, нажатия, фокуса и мягкого фона рассчитаются из этой пары сами.

Если рассчитанный оттенок не подходит, задайте его ключ в том же `@theme`. Тема этого сайта так
затемняет текст на мягком фоне: `--color-primary-soft-foreground`.

## Задайте форму и шрифт

Скругления считаются от одного ключа, шрифт называет другой:

```css
@theme {
  --radius-base: 0.25rem;
  --font-sans: 'Manrope Variable', ui-sans-serif, system-ui, sans-serif;
  --font-mono: 'JetBrains Mono Variable', ui-monospace, monospace;
}
```

От `--radius-base` зависят остальные скругления: `sm` вдвое меньше, `lg` в полтора раза
больше, `xl` вдвое больше. Файлы шрифта подключите сами, тема только называет семейство.

## Настройте детали

Подписи групп в списках и боковой панели, маркер списков в тексте и рамка фокуса полей тоже
заданы ключами темы:

```css
@theme {
  --caption-transform: uppercase;
  --tracking-caption: 0.16em;
  --caption-open: '[ ';
  --caption-close: ' ]';
  --prose-marker: square;
  --field-ring-width: 0px;
}
```

С `--field-ring-width: 0px` поле в фокусе меняет цвет рамки и не рисует кольцо снаружи.
Полный список ключей собран в [Темах оформления](/guide/theming#токены).

## Tailwind

Тема и есть настройка Tailwind, повторять её отдельно не нужно. Классы `bg-surface-elevated`,
`text-muted-foreground`, `border` и `rounded-lg` в примере выше читают те же ключи и меняются
вместе с темой.

```vue
<section class="rounded-lg border bg-surface-elevated p-5 shadow-sm">
  <p class="text-sm text-muted-foreground">Пётр Волков · Москва</p>
  <NuiButton>Подтвердить заказ</NuiButton>
</section>
```

Как подключить пресет, описано в руководстве [Tailwind](/guide/tailwind).

## Тема для части страницы

Чтобы оформить темой один блок, задайте базовые ключи на своём классе:

```css
.promo {
  --color-primary: light-dark(#0f766e, #5eead4);
  --color-primary-foreground: light-dark(#ffffff, #042f2e);
}
```

```html
<section class="promo">
  <NuiButton>Забрать скидку</NuiButton>
</section>
```

Мягкий фон, фокус и наведение внутри блока рассчитаются от его цветов сами. Производный ключ
вроде `--color-primary-soft` на классе не действует: его значение считается там, где он
используется. Чтобы блок стал тёмным на светлой странице, добавьте ему класс `nui-theme--dark`.

Свой мягкий текст акцента и подсветку строки кода блок задаёт ключами
`--color-theme-soft-foreground` и `--color-theme-syntax-highlight`. Производные ключи берут их
значения, а класс акцента `nui-theme--accent-<имя>` внутри блока их сбрасывает.

## Файл темы этого сайта

Так выглядит тема, в которой вы читаете документацию:

<<< @/guide/snippets/numior-theme.css

На сайте эти значения стоят на классе `docs-theme--numior` у `<html>`. Мягкий текст и подсветку
строки кода там задают ключи `--color-theme-soft-foreground` и `--color-theme-syntax-highlight`.
Встроенный акцент, выбранный в шапке, снимает этот класс.
