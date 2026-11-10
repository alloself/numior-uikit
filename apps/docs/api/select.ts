import type { DocsMap } from '../.vitepress/reference/reference.types';

const docs: DocsMap = {
  NuiSelect: {
    props: {
      options: {
        ru: 'Варианты и группы списка. С `children` или `lazy` у вариантов список становится деревом.',
        en: 'Options and groups of the list. Options with `children` or `lazy` turn the list into a tree.',
      },
      multiple: {
        ru: 'Включает выбор нескольких значений. Список не закрывается после выбора.',
        en: 'Lets the user pick several values. The list stays open after each pick.',
      },
      clearable: {
        ru: 'Показывает кнопку, которая очищает значение.',
        en: 'Shows a button that clears the value.',
      },
      placeholder: {
        ru: 'Текст в поле, пока ничего не выбрано.',
        en: 'Text in the field while nothing is selected.',
      },
      name: {
        ru: 'Имя, с которым значения уходят в форму, по одному полю на значение.',
        en: 'Name the values are submitted with in a form, one field per value.',
      },
      getKey: {
        ru: 'Функция, которая даёт ключ значению-объекту. Без неё ключом служит JSON значения.',
        en: 'Function that returns a key for an object value. Without it, the JSON of the value is used.',
      },
      loop: {
        ru: 'С последнего варианта стрелка переходит на первый и обратно.',
        en: 'Arrow keys wrap from the last option to the first and back.',
      },
      placement: {
        ru: 'С какой стороны поля открывается список, по умолчанию `bottom-start`.',
        en: 'Side of the field the list opens on, `bottom-start` by default.',
      },
      emptyLabel: {
        ru: 'Текст пустого списка. По умолчанию — «Нет вариантов» из словаря.',
        en: 'Text of an empty list. Defaults to "No options" from the dictionary.',
      },
      clearLabel: {
        ru: 'Подпись кнопки очистки для экранных дикторов. По умолчанию — «Очистить» из словаря.',
        en: 'Clear button label for screen readers. Defaults to "Clear" from the dictionary.',
      },
      toggleLabel: {
        ru: 'Подпись кнопки раскрытия для экранных дикторов. По умолчанию — «Показать варианты» из словаря.',
        en: 'Toggle button label for screen readers. Defaults to "Show options" from the dictionary.',
      },
      countLabel: {
        ru: 'Функция текста в поле, когда выбрано несколько значений. По умолчанию — «Выбрано: 3».',
        en: 'Function for the field text when several values are picked. Defaults to "3 selected".',
      },
      id: {
        ru: 'Идентификатор поля. По умолчанию берётся из `NuiField` или создаётся автоматически.',
        en: 'Id of the field. Defaults to the one from `NuiField` or is generated automatically.',
      },
      size: {
        ru: 'Размер поля: `sm`, `md` или `lg`. Высоту каждого размера сдвигает плотность темы.',
        en: 'Changes the size of the field: `sm`, `md` or `lg`. The theme density shifts the height of each size.',
      },
      disabled: {
        ru: 'Отключает поле. Внутри `NuiField` по умолчанию берётся из поля.',
        en: 'Disables the field. Inside `NuiField` it defaults to the field value.',
      },
      readonly: {
        ru: 'Показывает значение, но не открывает список. Внутри `NuiField` по умолчанию берётся из поля.',
        en: 'Shows the value but does not open the list. Inside `NuiField` it defaults to the field value.',
      },
      required: {
        ru: 'Помечает поле обязательным через `aria-required`. Внутри `NuiField` по умолчанию берётся из поля.',
        en: 'Marks the field as required with `aria-required`. Inside `NuiField` it defaults to the field value.',
      },
      invalid: {
        ru: 'Показывает состояние ошибки без текста. Внутри `NuiField` по умолчанию берётся из поля.',
        en: 'Shows the error state without a text. Inside `NuiField` it defaults to the field value.',
      },
      label: {
        ru: 'Подпись над полем. Внутри `NuiField` подпись берётся из `NuiField`.',
        en: 'Label above the field. Inside `NuiField` the field provides the label.',
      },
      description: {
        ru: 'Подсказка под полем. Экранные дикторы читают её вместе с полем.',
        en: 'Hint below the field. Screen readers announce it with the field.',
      },
      error: {
        ru: 'Текст ошибки под полем. Переводит поле в состояние ошибки.',
        en: 'Error text below the field. Puts the field into the error state.',
      },
      reserveError: {
        ru: 'Оставляет место под ошибку, чтобы форма не сдвигалась, когда ошибка появится.',
        en: 'Reserves space for the error so the form does not shift when it appears.',
      },
    },
    models: {
      'v-model': {
        ru: 'Выбранное значение без `multiple`.',
        en: 'Selected value without `multiple`.',
      },
      'v-model:values': {
        ru: 'Выбранные значения с `multiple`.',
        en: 'Selected values with `multiple`.',
      },
    },
    events: {
      load: {
        ru: 'Срабатывает, когда раскрыт вариант с `lazy`. Загрузите его `children`.',
        en: 'Fires when an option with `lazy` is expanded. Load its `children`.',
      },
    },
    slots: {
      value: {
        ru: 'Своя разметка значения в поле. Получает выбранные варианты.',
        en: 'Custom markup of the value in the field. Receives the selected options.',
      },
      option: {
        ru: 'Своя разметка варианта в списке. Получает вариант и его состояние.',
        en: 'Custom markup of an option in the list. Receives the option and its state.',
      },
    },
    keyboard: [
      {
        keys: 'Enter',
        description: {
          ru: 'Открывает список на выбранном варианте. В списке выбирает вариант и закрывает список.',
          en: 'Opens the list at the selected option. In the list, picks the option and closes.',
        },
      },
      {
        keys: 'Space',
        description: {
          ru: 'Открывает список. С `multiple` ставит или снимает отметку варианта.',
          en: 'Opens the list. With `multiple`, toggles the option.',
        },
      },
      {
        keys: 'ArrowDown',
        description: {
          ru: 'Открывает список на первом варианте. В списке переходит к следующему.',
          en: 'Opens the list at the first option. In the list, moves to the next one.',
        },
      },
      {
        keys: 'ArrowUp',
        description: {
          ru: 'Открывает список на последнем варианте. В списке переходит к предыдущему.',
          en: 'Opens the list at the last option. In the list, moves to the previous one.',
        },
      },
      {
        keys: 'Home',
        description: { ru: 'Переходит к первому варианту.', en: 'Moves to the first option.' },
      },
      {
        keys: 'End',
        description: { ru: 'Переходит к последнему варианту.', en: 'Moves to the last option.' },
      },
      { keys: 'Escape', description: { ru: 'Закрывает список.', en: 'Closes the list.' } },
      {
        keys: 'Tab',
        description: {
          ru: 'Закрывает список и переводит фокус дальше.',
          en: 'Closes the list and moves focus on.',
        },
      },
    ],
  },
};

export default docs;
