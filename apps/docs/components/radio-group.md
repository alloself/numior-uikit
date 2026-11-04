# Radio group

`NuiRadioGroup` — группа радиокнопок для выбора одного варианта из нескольких: тарифа, способа
доставки, склада. Для длинного списка вариантов удобнее [Select](/components/select).

<Example name="radio-group/Basic" />

Каждая `NuiRadio` получает свой `value`, а выбранный хранится в `v-model` группы. Подпись и
подсказку группе задают `label` и `description`, как у остальных полей.

## Установка

```ts
import { NuiRadio, NuiRadioGroup } from '@numior/vue';
import '@numior/vue/styles/field.css';
import '@numior/vue/styles/radio.css';
```

## Примеры

### В строку

`orientation="horizontal"` ставит радиокнопки в одну строку, по умолчанию они идут столбиком.
`size` выбирает размер: `sm`, `md` или `lg`.

<Example name="radio-group/Horizontal" />

### Объекты в значениях

В `value` можно передать объект, и он же окажется в модели. Выбранной считается радиокнопка, чей
`value` — тот же самый объект, что и в модели, а не копия с теми же полями.

<Example name="radio-group/Objects" />

## Доступность

Радиокнопки нативные: стрелки переключают выбор, а форма отправляет значение под общим `name`.
Подпись, описание и ошибка группы связаны с ней, и диктор читает их при входе в группу.

`disabled` у группы выключает все радиокнопки, а у одной `NuiRadio` — только её.

<KeyboardReference name="NuiRadioGroup" />

## API

<ApiReference :names="['NuiRadioGroup', 'NuiRadio']" />
