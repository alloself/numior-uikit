import type { DocsMap } from '../.vitepress/reference/reference.types';
import { fieldControl } from './shared/field.ts';

const docs: DocsMap = {
  NuiCombobox: {
    configurator: {
      scene: 'combobox/Example',
      props: [
        'size',
        'placement',
        'clearable',
        'disabled',
        'invalid',
        'label',
        'placeholder',
        'error',
      ],
      values: {
        label: { ru: 'Покупатель', en: 'Customer' },
        placeholder: { ru: 'Начните вводить имя', en: 'Start typing a name' },
      },
    },
    props: {
      ...fieldControl,
      options: {
        ru: 'Варианты списка, можно с группами.',
        en: 'List options, optionally in groups.',
      },
      multiple: {
        ru: 'Разрешает выбрать несколько значений. Они показываются чипами, а список не закрывается после выбора.',
        en: 'Lets the user pick several values. They show as chips, and the list stays open after each pick.',
      },
      clearable: {
        ru: 'Показывает в поле кнопку, которая сбрасывает выбор.',
        en: 'Shows a button in the field that clears the selection.',
      },
      placeholder: { ru: 'Текст в пустом поле.', en: 'Text shown in the empty field.' },
      name: {
        ru: 'Атрибут `name` для отправки формы. На каждое значение создаётся своё скрытое поле.',
        en: 'The `name` attribute for form submission. Each value gets its own hidden input.',
      },
      getKey: {
        ru: 'Функция, которая возвращает ключ значения-объекта. Без неё ключом служит JSON значения.',
        en: 'Function that returns the key of an object value. Without it the JSON of the value is the key.',
      },
      filter: {
        ru: 'Своя функция отбора вариантов по запросу. `false` отключает отбор, если варианты ищет сервер.',
        en: 'Custom function that matches options to the query. `false` turns matching off when the server searches.',
      },
      loading: {
        ru: 'Показывает в списке строку «Загрузка».',
        en: 'Shows a "Loading" row in the list.',
      },
      customValue: {
        ru: 'Функция, которая превращает введённый текст в значение. Enter добавляет его, если в списке ничего не выделено.',
        en: 'Function that turns the typed text into a value. Enter adds it when no option is highlighted.',
      },
      placement: {
        ru: 'Где открывается список, например `bottom-start` или `top`.',
        en: 'Where the list opens, such as `bottom-start` or `top`.',
      },
      emptyLabel: {
        ru: 'Текст, когда ничего не нашлось. По умолчанию — «Ничего не найдено» из словаря.',
        en: 'Text when nothing matches. Defaults to "No matches" from the dictionary.',
      },
      loadingLabel: {
        ru: 'Текст строки загрузки. По умолчанию — «Загрузка» из словаря.',
        en: 'Text of the loading row. Defaults to "Loading" from the dictionary.',
      },
      clearLabel: {
        ru: 'Подпись кнопки очистки для экранных дикторов. По умолчанию — «Очистить» из словаря.',
        en: 'Clear button label for screen readers. Defaults to "Clear" from the dictionary.',
      },
      removeLabel: {
        ru: 'Подпись кнопки удаления чипа для экранных дикторов. По умолчанию — «Убрать» из словаря.',
        en: 'Chip remove button label for screen readers. Defaults to "Remove" from the dictionary.',
      },
      toggleLabel: {
        ru: 'Подпись кнопки открытия списка для экранных дикторов. По умолчанию — «Показать варианты» из словаря.',
        en: 'List button label for screen readers. Defaults to "Show options" from the dictionary.',
      },
    },
    models: {
      'v-model': {
        ru: 'Выбранное значение или `null`, когда `multiple` выключен.',
        en: 'Selected value, or `null`, when `multiple` is off.',
      },
      'v-model:values': {
        ru: 'Массив выбранных значений, когда включён `multiple`.',
        en: 'Array of selected values when `multiple` is on.',
      },
    },
    events: {
      search: {
        ru: 'Срабатывает на каждый ввод и передаёт текст запроса.',
        en: 'Fires on every input with the query text.',
      },
    },
    slots: {
      option: {
        ru: 'Своя разметка варианта. Получает `option`, `selected` и `active`.',
        en: 'Custom option markup. Receives `option`, `selected` and `active`.',
      },
    },
    keyboard: [
      {
        keys: 'ArrowDown',
        description: {
          ru: 'Открывает список и выделяет следующий вариант.',
          en: 'Opens the list and highlights the next option.',
        },
      },
      {
        keys: 'ArrowUp',
        description: {
          ru: 'Открывает список и выделяет предыдущий вариант.',
          en: 'Opens the list and highlights the previous option.',
        },
      },
      {
        keys: 'Enter',
        description: {
          ru: 'Выбирает выделенный вариант. С `customValue` добавляет введённый текст.',
          en: 'Selects the highlighted option. With `customValue`, adds the typed text.',
        },
      },
      {
        keys: 'Escape',
        description: {
          ru: 'Закрывает список. Диалог, в котором стоит поле, остаётся открытым.',
          en: 'Closes the list. A dialog around the field stays open.',
        },
      },
      {
        keys: 'Tab',
        description: {
          ru: 'Закрывает список и переводит фокус дальше.',
          en: 'Closes the list and moves the focus on.',
        },
      },
      {
        keys: 'Backspace',
        description: {
          ru: 'В пустом поле с `multiple` удаляет последний чип.',
          en: 'In an empty field with `multiple`, removes the last chip.',
        },
      },
    ],
  },
};

export default docs;
