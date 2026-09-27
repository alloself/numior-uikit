# Button

`NuiButton` — нативная кнопка с двумя осями оформления: `variant` задаёт форму, `tone` — роль.
Цвета роли приходят из токенов, поэтому смена акцента меняет все варианты сразу.

<Example name="button/Basic" />

## Установка

```ts
import { NuiButton } from '@numior/vue';
import '@numior/vue/styles/button.css';
```

## Использование

<Configurator name="NuiButton" />

## Примеры

### Размеры

`size` выбирает ступень внутри текущей плотности; `data-nui-density` сдвигает всю шкалу.

<Example name="button/Sizes" />

### Состояния

`disabled` блокирует активацию. `loading` тоже гасит нажатия, но сохраняет ширину и фокус,
чтобы форма не прыгала.

<Example name="button/States" />

### С иконкой

Иконка в слоте встаёт перед текстом с общим отступом.

<Example name="button/WithIcon" />

### Только иконка

Кнопка с одной иконкой становится квадратной сама; ей нужен `aria-label`.

<Example name="button/IconOnly" />

### Ссылка

`href` или `to` превращают кнопку в ссылку с тем же оформлением; `as` принимает компонент роутера.

<Example name="button/Link" />

## Доступность

Компонент остаётся нативной `<button>` или `<a>`: клавиатура, фокус и экранные дикторы работают без
дополнительного кода. В состоянии `loading` кнопка получает `aria-busy` и остаётся в порядке
табуляции.

<KeyboardReference name="NuiButton" />

## API

<ApiReference name="NuiButton" />
