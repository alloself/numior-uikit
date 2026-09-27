# Checkbox

`NuiCheckbox` — нативный `<input type="checkbox">` под собственным индикатором с моделью
`boolean`. Набор значений собирает `NuiCheckboxGroup` из опций в массив в порядке выбора.

<Example name="checkbox/Basic" />

## Установка

```ts
import { NuiCheckbox, NuiCheckboxGroup } from '@numior/vue';
import '@numior/vue/styles/field.css';
import '@numior/vue/styles/checkbox.css';
```

## Использование

<Configurator name="NuiCheckbox" />

## Примеры

### Набор значений

`NuiCheckboxGroup` рисует `fieldset` с подписью и описанием; недоступная опция остаётся в
наборе, но не переключается.

<Example name="checkbox/Group" />

### Строкой

`orientation="horizontal"` выстраивает опции в строку с переносом.

<Example name="checkbox/Horizontal" />

### Частичный выбор

`indeterminate` — визуальное состояние родительского чекбокса, когда выбрана часть вложенных.
Клик снимает его и переключает значение как обычно.

<Example name="checkbox/Indeterminate" />

## Доступность

Контрол остаётся нативным: экранный диктор читает подпись из слота, кольцо фокуса рисуется на
индикаторе. Набор — `fieldset` с `legend`, чекбоксы внутри делят одно `name`.

<KeyboardReference name="NuiCheckbox" />

## API

<ApiReference :names="['NuiCheckbox', 'NuiCheckboxGroup']" />
