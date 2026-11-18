# List

Строки с иконкой, подписью и пояснением.

<Example name="list/Basic" />

Опишите строки частями `NuiListItem` или массивом `items`. Строка с `href` или `to` работает как
ссылка, а с `interactive` — как кнопка.

## Установка

```ts
import { NuiList, NuiListItem } from '@numior/kit';
```

## Использование

Поменяйте оформление и размер строк, включите выбор одного или нескольких сотрудников.

<Configurator name="NuiList" />

## Примеры

### Выбрать одно или несколько значений

Задайте `selectable`.

<Example name="list/Selectable" />

С `single` выбранное значение приходит в `v-model`, с `multiple` — в `v-model:values`.

### Собрать меню разделов

Задайте `variant="nav"` и отметьте раздел `current`.

<Example name="list/Nav" />

Из таких строк собрано боковое меню [Sidebar](/components/sidebar).

### Разбить на группы

Передайте группы `{ label, items }` в `items`.

<Example name="list/Groups" />

Стрелки переходят по строкам всех групп подряд.

## Поведение

В обычном списке ссылки и кнопки получают фокус по Tab, как везде на странице. В списке с выбором
Tab попадает только на одну строку, дальше фокус переводят стрелки или первые буквы подписи.

Тот же список в варианте `floating` открывается в выпадающих списках [Select](/components/select)
и [Combobox](/components/combobox).

<KeyboardReference name="NuiList" />

## API

<ApiReference :names="['NuiList', 'NuiListItem']" />
