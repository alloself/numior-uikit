import type { DocsMap } from '../.vitepress/reference/reference.types';
import { fieldControl } from './shared/field.ts';

const docs: DocsMap = {
  NuiCombobox: {
    props: {
      ...fieldControl,
      options: { ru: 'Опции и группы списка.', en: 'Options and groups of the list.' },
      multiple: {
        ru: 'Несколько значений чипами; список остаётся открытым при выборе.',
        en: 'Several values as chips; the list stays open while picking.',
      },
      clearable: { ru: 'Кнопка очистки в поле.', en: 'Clear button inside the field.' },
      placeholder: { ru: 'Текст пустого поля.', en: 'Text of the empty field.' },
      name: {
        ru: 'Имя скрытых полей формы, по одному на значение.',
        en: 'Name of the hidden form fields, one per value.',
      },
      getKey: {
        ru: 'Ключ для значений-объектов; без него ключом становится JSON.',
        en: 'Key for object values; without it the key is the JSON.',
      },
      filter: {
        ru: 'Своя функция фильтра или false для серверного поиска.',
        en: 'Custom filter function or false for server-side search.',
      },
      loading: { ru: 'Показывает загрузку списка.', en: 'Shows that the list is loading.' },
      customValue: {
        ru: 'Превращает введённый текст в значение; Enter без активной опции добавляет его.',
        en: 'Turns the typed text into a value; Enter without an active option adds it.',
      },
      placement: {
        ru: 'Сторона, с которой открывается список.',
        en: 'Side on which the list opens.',
      },
      emptyLabel: {
        ru: 'Текст пустого списка; по умолчанию из словаря.',
        en: 'Text of an empty list; the dictionary supplies the default.',
      },
      loadingLabel: {
        ru: 'Текст загрузки; по умолчанию из словаря.',
        en: 'Loading text; the dictionary supplies the default.',
      },
      clearLabel: {
        ru: 'Доступное имя кнопки очистки; по умолчанию из словаря.',
        en: 'Accessible name of the clear button; the dictionary supplies the default.',
      },
      removeLabel: {
        ru: 'Доступное имя кнопки удаления чипа; по умолчанию из словаря.',
        en: 'Accessible name of the chip remove button; the dictionary supplies the default.',
      },
      toggleLabel: {
        ru: 'Доступное имя кнопки раскрытия списка; по умолчанию из словаря.',
        en: 'Accessible name of the toggle button; the dictionary supplies the default.',
      },
    },
    models: {
      'v-model': { ru: 'Значение в одиночном режиме.', en: 'Value in single mode.' },
      'v-model:values': { ru: 'Значения в режиме multiple.', en: 'Values in multiple mode.' },
    },
    events: {
      search: { ru: 'Текст запроса на каждый ввод.', en: 'Query text on every input.' },
    },
    slots: {
      option: {
        ru: 'Разметка опции; получает опцию и её состояния.',
        en: 'Option markup; receives the option and its states.',
      },
    },
    keyboard: [
      {
        keys: 'ArrowDown',
        description: {
          ru: 'Открывает список и двигает активную опцию вниз.',
          en: 'Opens the list and moves the active option down.',
        },
      },
      {
        keys: 'ArrowUp',
        description: {
          ru: 'Открывает список и двигает активную опцию вверх.',
          en: 'Opens the list and moves the active option up.',
        },
      },
      {
        keys: 'Enter',
        description: {
          ru: 'Выбирает активную опцию; с customValue добавляет текст.',
          en: 'Picks the active option; with customValue adds the text.',
        },
      },
      {
        keys: 'Escape',
        description: {
          ru: 'Закрывает список, не закрывая диалог вокруг.',
          en: 'Closes the list without closing a surrounding dialog.',
        },
      },
      {
        keys: 'Tab',
        description: {
          ru: 'Закрывает список и уводит фокус.',
          en: 'Closes the list and moves the focus on.',
        },
      },
      {
        keys: 'Backspace',
        description: {
          ru: 'В пустом поле режима multiple удаляет последний чип.',
          en: 'In an empty multiple field removes the last chip.',
        },
      },
    ],
  },
};

export default docs;
