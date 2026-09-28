# Toggle group

`NuiToggleGroup` — ряд кнопок с одним нажатым значением или несколькими. Одиночный режим
пишет в `v-model`, `multiple` — в `v-model:values`; `required` запрещает отжать последнюю
кнопку.

<Example name="toggle-group/Basic" />

## Установка

```ts
import { NuiToggleGroup } from '@numior/vue';
import '@numior/vue/styles/toggle-group.css';
```

## Примеры

### Несколько нажатых

`multiple` с `icon-only`: подписи уходят в доступные имена кнопок, `disabled` на элементе
выключает одну кнопку.

<Example name="toggle-group/Multiple" />

## Доступность

В одиночном режиме корень — `role="radiogroup"` с кнопками `role="radio"` и `aria-checked`,
в `multiple` — `role="group"` с `aria-pressed`; имя даёт `label`. В порядке табуляции одна кнопка, стрелки
ходят по остальным и следуют `orientation` и RTL.

<KeyboardReference name="NuiToggleGroup" />

## API

<ApiReference name="NuiToggleGroup" />
