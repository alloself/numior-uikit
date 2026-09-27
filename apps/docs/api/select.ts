import type { DocsMap } from '../.vitepress/reference/reference.types';

const docs: DocsMap = {
  NuiSelect: {
    props: {
      options: { ru: 'Опции и группы списка.', en: 'Options and groups of the list.' },
      multiple: {
        ru: 'Несколько значений; список остаётся открытым при выборе.',
        en: 'Several values; the list stays open while picking.',
      },
      clearable: {
        ru: 'Кнопка очистки значения в триггере.',
        en: 'Clear button inside the trigger.',
      },
      placeholder: {
        ru: 'Текст триггера без значения.',
        en: 'Trigger text while nothing is selected.',
      },
      name: {
        ru: 'Имя скрытых полей формы, по одному на значение.',
        en: 'Name of the hidden form fields, one per value.',
      },
      getKey: {
        ru: 'Ключ для значений-объектов; без него ключом становится JSON.',
        en: 'Key for object values; without it the key is the JSON.',
      },
      loop: {
        ru: 'Зацикливание стрелок на краях списка.',
        en: 'Arrow keys wrap around at the edges of the list.',
      },
      placement: {
        ru: 'Сторона, с которой открывается список.',
        en: 'Side on which the list opens.',
      },
      emptyLabel: {
        ru: 'Текст пустого списка; по умолчанию из словаря.',
        en: 'Text of an empty list; the dictionary supplies the default.',
      },
      clearLabel: {
        ru: 'Доступное имя кнопки очистки; по умолчанию из словаря.',
        en: 'Accessible name of the clear button; the dictionary supplies the default.',
      },
      countLabel: {
        ru: 'Подпись триггера при нескольких значениях; по умолчанию из словаря.',
        en: 'Trigger label for several values; the dictionary supplies the default.',
      },
      id: {
        ru: 'Идентификатор триггера; внутри поля выдаётся автоматически.',
        en: 'Trigger id; a field assigns one automatically.',
      },
      size: {
        ru: 'Ступень размера внутри текущей плотности.',
        en: 'Size step inside the current density.',
      },
      disabled: {
        ru: 'Блокирует триггер; наследуется от поля.',
        en: 'Blocks the trigger; inherited from the field.',
      },
      required: {
        ru: 'Помечает значение обязательным; наследуется от поля.',
        en: 'Marks the value as required; inherited from the field.',
      },
      invalid: {
        ru: 'Показывает состояние ошибки; наследуется от поля.',
        en: 'Shows the error state; inherited from the field.',
      },
    },
    models: {
      'v-model': { ru: 'Значение в одиночном режиме.', en: 'Value in single mode.' },
      'v-model:values': { ru: 'Значения в режиме multiple.', en: 'Values in multiple mode.' },
    },
    slots: {
      value: {
        ru: 'Содержимое триггера; получает выбранные опции.',
        en: 'Trigger content; receives the selected options.',
      },
      option: {
        ru: 'Разметка опции; получает опцию и её состояния.',
        en: 'Option markup; receives the option and its states.',
      },
    },
    keyboard: [
      {
        keys: 'Enter',
        description: {
          ru: 'Открывает список на выбранной опции; в списке выбирает и закрывает.',
          en: 'Opens the list on the selected option; inside the list selects and closes.',
        },
      },
      {
        keys: 'Space',
        description: {
          ru: 'Открывает список; в режиме multiple переключает опцию.',
          en: 'Opens the list; in multiple mode toggles the option.',
        },
      },
      {
        keys: 'ArrowDown',
        description: {
          ru: 'Открывает список на первой опции; в списке идёт вниз.',
          en: 'Opens the list on the first option; inside the list moves down.',
        },
      },
      {
        keys: 'ArrowUp',
        description: {
          ru: 'Открывает список на последней опции; в списке идёт вверх.',
          en: 'Opens the list on the last option; inside the list moves up.',
        },
      },
      {
        keys: 'Home',
        description: { ru: 'Переходит к первой опции.', en: 'Moves to the first option.' },
      },
      {
        keys: 'End',
        description: { ru: 'Переходит к последней опции.', en: 'Moves to the last option.' },
      },
      { keys: 'Escape', description: { ru: 'Закрывает список.', en: 'Closes the list.' } },
      {
        keys: 'Tab',
        description: {
          ru: 'Закрывает список и уводит фокус.',
          en: 'Closes the list and moves the focus on.',
        },
      },
    ],
  },
};

export default docs;
