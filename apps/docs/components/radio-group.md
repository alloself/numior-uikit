# Radio group

`NuiRadioGroup` объединяет нативные `<input type="radio">` общим `name`: стрелки, единственный
выбор и участие в форме работают без JavaScript. Каждая `NuiRadio` объявляет свой `value`.

<Example name="radio-group/Basic" />

## Установка

```ts
import { NuiRadio, NuiRadioGroup } from '@numior/vue';
import '@numior/vue/styles/field.css';
import '@numior/vue/styles/radio.css';
```

## Примеры

### Строкой

`orientation="horizontal"` выстраивает радиокнопки в строку, `size` меняет ступень.

<Example name="radio-group/Horizontal" />

### Значения-объекты

Модель принимает любой тип: `value` радиокнопки сравнивается с моделью по ссылке.

<Example name="radio-group/Objects" />

## Доступность

Группа — `fieldset` с `legend` и `role="radiogroup"`; описание и ошибка связаны через
`aria-describedby`. `disabled` группы выключает все радиокнопки, `disabled` одной
`NuiRadio` — только её.

<KeyboardReference name="NuiRadioGroup" />

## API

<ApiReference :names="['NuiRadioGroup', 'NuiRadio']" />
