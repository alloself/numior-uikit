# Combobox

`NuiCombobox` — поле с выпадающим списком, который сужается по мере ввода. Берите его, когда
вариантов много и искать нужный проще по первым буквам: города, сотрудники, теги.

<Example name="combobox/Basic" />

## Установка

```ts
import { NuiCombobox } from '@numior/vue';
import '@numior/vue/styles/field.css';
import '@numior/vue/styles/list.css';
import '@numior/vue/styles/chip.css';
import '@numior/vue/styles/combobox.css';
```

## Использование

Варианты передайте в `options` в том же виде, что и у [Select](/components/select): `value` и
`label`. Список оставляет варианты, в подписи которых есть введённый текст. Свойство `clearable`
добавляет кнопку очистки.

## Примеры

### Несколько значений

С `multiple` выбранные варианты встают в поле чипами, а `v-model:values` хранит их массив.
Свойство `customValue` добавляет введённый текст как новое значение по Enter, если такого
варианта в списке нет.

<Example name="combobox/Multiple" />

### Серверный поиск

С `:filter="false"` компонент не фильтрует список сам. Событие `search` приходит с текстом при
каждом вводе: загрузите варианты и передайте их в `options`.

<Example name="combobox/Async" />

Пока варианты загружаются, передайте `loading`, и в списке появится индикатор. Задержку перед
запросом и кеш ответов задаёт ваше приложение.

### Своя разметка варианта

Слот `option` заменяет строку варианта своей разметкой, например добавляет отдел рядом с именем.
Слот получает `option`, `selected` и `active`.

<Example name="combobox/Option" />

## Доступность

Фокус всё время остаётся в поле, а стрелки переходят по вариантам списка. Кнопки очистки,
раскрытия списка и удаления чипа Tab пропускает: эти действия выполняются с клавиатуры из поля.

<KeyboardReference name="NuiCombobox" />

## API

<ApiReference name="NuiCombobox" />
