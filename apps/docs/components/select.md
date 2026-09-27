# Select

`NuiSelect` открывает список опций в нативном поповере не уже триггера. Значения приходят из
`options`, выбор — одиночный или множественный.

<Example name="select/Basic" />

## Установка

```ts
import { NuiSelect } from '@numior/vue';
import '@numior/vue/styles/field.css';
import '@numior/vue/styles/list.css';
import '@numior/vue/styles/select.css';
```

## Примеры

### Группы и недоступные опции

Группа — запись `{ label, items }`. Недоступная опция остаётся в списке, но пропускается стрелками.

<Example name="select/Groups" />

### Несколько значений

`multiple` переключает опции без закрытия списка. Триггер показывает подпись одной опции или
текст словаря «Выбрано: N».

<Example name="select/Multiple" />

### Значения-объекты

Объекты требуют `getKey`; слот `option` рисует опцию по-своему.

<Example name="select/Objects" />

### Размеры

`size` совпадает со ступенями остальных контролов поля.

<Example name="select/Sizes" />

## Доступность

Триггер — нативная `<button role="combobox">` с `aria-expanded` и `aria-controls`. Список —
`role="listbox"`, группы — `role="group"` с подписью, опции — `role="option"` с `aria-selected`.

На закрытом триггере набор букв меняет значение без открытия, как у нативного `<select>`.

<KeyboardReference name="NuiSelect" />

## API

<ApiReference name="NuiSelect" />
