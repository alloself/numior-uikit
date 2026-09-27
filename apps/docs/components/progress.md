# Progress

`NuiProgress` — нативный `<progress>`: браузер даёт роль `progressbar`, значение и максимум,
стили задают трек, цвет тона и анимацию неопределённого состояния.

<Example name="progress/Basic" />

## Установка

```ts
import { NuiProgress } from '@numior/vue';
import '@numior/vue/styles/progress.css';
```

## Использование

<Configurator name="NuiProgress" />

## Примеры

### Живое значение

Значение меняется через `value`; подпись рядом показывает проценты тем, кто читает глазами.

<Example name="progress/Live" />

## Доступность

Без `value` полоса неопределённая: она скользит по треку, под `prefers-reduced-motion`
анимация замедляется вдвое. `label` даёт доступное имя, `valueText` — значение словами для
экранного диктора.

## API

<ApiReference name="NuiProgress" />
