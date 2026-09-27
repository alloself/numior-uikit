# Splitter

`NuiSplitter` делит область на две панели с перетаскиваемым разделителем. Доля первой
панели живёт в `v-model:ratio` от 0 до 1 и зажимается между `min` и `max`.

<Example name="splitter/Basic" />

## Установка

```ts
import { NuiSplitter } from '@numior/vue';
import '@numior/vue/styles/splitter.css';
```

## Примеры

### Вертикально

`orientation="vertical"` ставит панели одна над другой; `step` задаёт шаг стрелок.

<Example name="splitter/Vertical" />

## Поведение

Разделитель тянется указателем и мышью, панели получают размер через grid без перерисовки
содержимого. Высоту задаёт родитель: сам компонент растягивается на неё.

## Доступность

Разделитель — фокусируемый `role="separator"` с `aria-valuenow`, `aria-valuemin` и
`aria-valuemax` в процентах, `aria-controls` первой панели и именем из `label`.

<KeyboardReference name="NuiSplitter" />

## API

<ApiReference name="NuiSplitter" />
