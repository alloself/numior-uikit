# Своя тема

Как собрать свою тему из базовой. Этот сайт оформлен такой темой: ниже шаги, которыми она
получена, и её файл целиком.

<Example name="guide/Theme" />

Включите «Базовая тема» над примером, и те же компоненты покажутся без темы сайта. Такой
переключатель есть у каждого примера в документации.

## Создайте файл темы

Создайте CSS-файл и подключите его после `theme.css`:

```ts
import '@numior/tokens/theme.css';
import '@numior/tokens/base.css';
import './brand.css';
```

Тема состоит из значений токенов `--nui-*`. Задайте их на `:root` и на элементах с
`data-nui-theme`:

```css
:root,
[data-nui-theme] {
  --nui-primary: light-dark(#ae3f10, #e0561a);
  --nui-primary-foreground: light-dark(#f3f2ef, #030304);
}
```

Второй селектор нужен для частей страницы со своей светлой или тёмной темой: там токены
объявлены заново. Стили компонентов при этом остаются как есть.

## Задайте цвета

Запишите каждый цвет парой значений в `light-dark()`: первое действует в светлой теме, второе
в тёмной.

```css
:root,
[data-nui-theme] {
  --nui-surface: light-dark(#f3f2ef, #030304);
  --nui-surface-muted: light-dark(#e9e8e5, #151414);
  --nui-surface-elevated: light-dark(#faf9f6, #1d1b1b);
  --nui-text: light-dark(#151414, #f3f2ef);
  --nui-text-muted: light-dark(#5a5655, #9b9797);
  --nui-border: light-dark(#d5d4d1, #2c2929);
}
```

У цвета роли два токена: `--nui-primary` для фона и `--nui-primary-foreground` для текста на
нём. Оттенки для наведения, нажатия, фокуса и мягкого фона рассчитаются из этой пары сами.

## Задайте форму и шрифт

Скругления считаются от одного токена, шрифт называет другой:

```css
:root,
[data-nui-theme] {
  --nui-radius-base: 0.25rem;
  --nui-font: 'Manrope Variable', ui-sans-serif, system-ui, sans-serif;
  --nui-font-mono: 'JetBrains Mono Variable', ui-monospace, monospace;
}
```

От `--nui-radius-base` зависят остальные скругления: `sm` вдвое меньше, `lg` в полтора раза
больше, `xl` вдвое больше. Файлы шрифта подключите сами, тема только называет семейство.

## Настройте детали

Подписи групп в списках и боковой панели, маркер списков в тексте и рамка фокуса полей тоже
заданы токенами:

```css
:root,
[data-nui-theme] {
  --nui-caption-transform: uppercase;
  --nui-caption-tracking: 0.16em;
  --nui-caption-open: '[ ';
  --nui-caption-close: ' ]';
  --nui-prose-marker: square;
  --nui-field-ring-width: 0px;
}
```

С `--nui-field-ring-width: 0px` поле в фокусе меняет цвет рамки и не рисует кольцо снаружи.
Полный список токенов собран в [Темах оформления](/guide/theming#токены).

## Tailwind

Пресет `@numior/tailwind` читает те же токены, поэтому повторять тему в настройках Tailwind не
нужно. Классы `bg-surface-elevated`, `text-muted-foreground`, `border` и `rounded-lg` в
примере выше меняются вместе с темой.

```vue
<section class="rounded-lg border bg-surface-elevated p-5 shadow-sm">
  <p class="text-sm text-muted-foreground">Пётр Волков · Москва</p>
  <NuiButton>Подтвердить заказ</NuiButton>
</section>
```

Как подключить пресет, описано в руководстве [Tailwind](/guide/tailwind).

## Тема для части страницы

Чтобы оформить темой один блок, задайте токены на своём элементе с `data-nui-theme`:

```css
.promo[data-nui-theme] {
  --nui-primary: light-dark(#0f766e, #5eead4);
  --nui-primary-foreground: light-dark(#ffffff, #042f2e);
}
```

```html
<section class="promo" data-nui-theme>
  <NuiButton>Забрать скидку</NuiButton>
</section>
```

Атрибут обязателен: на элементе без него оттенки вроде `--nui-primary-soft` и `--nui-focus`
останутся от темы страницы.

## Файл темы этого сайта

Так выглядит тема, в которой вы читаете документацию:

<<< @/.vitepress/theme/numior.css

Условие `:not([data-nui-accent])` нужно только сайту. Оно отключает тему там, где в шапке
выбран встроенный акцент или над примером включена базовая тема.
