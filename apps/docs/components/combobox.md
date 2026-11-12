# Combobox

Поле со списком, который сужается по мере ввода.

<Example name="combobox/Basic" />

Передайте варианты в `options`, как у [Select](/components/select): в списке останутся те, в
подписи которых есть введённый текст.

## Установка

```ts
import { NuiCombobox } from '@numior/vue';
import '@numior/vue/styles/field.css';
import '@numior/vue/styles/list.css';
import '@numior/vue/styles/chip.css';
import '@numior/vue/styles/combobox.css';
```

## Использование

Поменяйте размер, сторону списка и состояния поля, а потом найдите покупателя по первым буквам.

<Configurator name="NuiCombobox" />

Поиск не различает регистр, акценты латиницы и буквы «е» и «ё». Своя функция в `filter` получает
текст только в нижнем регистре и сравнивает сама.

## Примеры

### Выбрать несколько значений

Добавьте `multiple`.

<Example name="combobox/Multiple" />

Выбранные значения встают в поле чипами. Передайте в `customValue` функцию, и Enter добавит
введённый текст, если такого варианта в списке нет.

### Искать на сервере

Отключите фильтр через `:filter="false"` и отвечайте на событие `search`.

<Example name="combobox/Async" />

Пока ответ не пришёл, передайте `loading`, и в списке появится индикатор загрузки.

### Показать в варианте больше данных

Опишите строку в слоте `option`.

<Example name="combobox/Option" />

## Доступность

Фокус всё время остаётся в поле, а стрелки переходят по вариантам списка. Кнопки очистки,
раскрытия списка и удаления чипа Tab пропускает: эти действия выполняются с клавиатуры из поля.

<KeyboardReference name="NuiCombobox" />

## API

<ApiReference name="NuiCombobox" />
