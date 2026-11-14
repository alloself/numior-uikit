import type { DocsMap } from '../.vitepress/reference/reference.types';

const form = { ru: 'Форма, созданная `useForm`.', en: 'Form created by `useForm`.' };

const docs: DocsMap = {
  NuiForm: {
    props: {
      form,
      disabled: {
        ru: 'Отключает все поля и кнопку отправки.',
        en: 'Disables every field and the submit button.',
      },
      readonly: {
        ru: 'Показывает значения без возможности изменить. Поля получают фокус, кнопка отправки отключена.',
        en: 'Shows the values without letting them change. Fields still take focus, the submit button is disabled.',
      },
      reserveError: {
        ru: 'Оставляет место под ошибку у всех полей, чтобы форма не сдвигалась.',
        en: 'Keeps room for an error under every field so the form does not shift.',
      },
      submitAction: {
        ru: 'Своя функция отправки вместо `form.submit()`, например с подтверждением.',
        en: 'Custom submit function instead of `form.submit()`, such as one with a confirmation.',
      },
      submitLabel: {
        ru: 'Текст кнопки отправки. По умолчанию — «Отправить» из словаря.',
        en: 'Submit button text. Defaults to "Submit" from the dictionary.',
      },
      errorTitle: {
        ru: 'Заголовок сообщения об ошибках формы. По умолчанию — «Не удалось отправить форму» из словаря.',
        en: 'Title of the form error message. Defaults to "Could not submit the form" from the dictionary.',
      },
    },
    events: {
      reset: {
        ru: 'Срабатывает, когда форму сбрасывают кнопкой или `resetForm()`.',
        en: 'Fires when the form is reset by a button or `resetForm()`.',
      },
    },
    slots: {
      'form-errors': {
        ru: 'Свой вывод ошибок, которые не относятся к полю. Получает `errors`.',
        en: 'Custom output for errors that belong to no field. Receives `errors`.',
      },
      default: { ru: 'Поля формы.', en: 'Form fields.' },
      actions: {
        ru: 'Свои кнопки вместо кнопки отправки. Получает `submit`, `reset`, `pending`, `dirty` и `readonly`.',
        en: 'Custom buttons instead of the submit button. Receives `submit`, `reset`, `pending`, `dirty` and `readonly`.',
      },
    },
  },
  NuiFormField: {
    props: {
      form,
      name: {
        ru: 'Функция, которая указывает на значение поля, например `(v) => v.address.city`.',
        en: 'Function that points at the field value, such as `(v) => v.address.city`.',
      },
      id: {
        ru: 'Атрибут `id` контрола. Без него создаётся автоматически.',
        en: 'The `id` attribute of the control. Generated when omitted.',
      },
      label: {
        ru: 'Подпись над контролом. Экранный диктор читает её вместе с полем.',
        en: 'Text above the control. A screen reader reads it together with the field.',
      },
      description: { ru: 'Подсказка под контролом.', en: 'Hint under the control.' },
      required: {
        ru: 'Ставит звёздочку у подписи. Проверку задают `rules`.',
        en: 'Adds an asterisk to the label. `rules` set the check.',
      },
      disabled: {
        ru: 'Отключает контрол. Значение уходит с формой, но не проверяется.',
        en: 'Disables the control. The value is still submitted but not validated.',
      },
      readonly: {
        ru: 'Запрещает менять значение. Оно уходит с формой, но не проверяется. По умолчанию берётся у формы.',
        en: 'Blocks changes to the value. It is still submitted but not validated. Inherited from the form.',
      },
      group: {
        ru: 'Выводит группу контролов в `fieldset`, а подпись — в `legend`.',
        en: 'Renders a group of controls in a `fieldset` with the label in a `legend`.',
      },
      reserveError: {
        ru: 'Оставляет место под ошибку, чтобы форма не сдвигалась.',
        en: 'Keeps room for the error so the form does not shift.',
      },
      keepValue: {
        ru: 'Сохраняет значение, когда поле убрано со страницы. `false` стирает его.',
        en: 'Keeps the value when the field leaves the page. `false` clears it.',
      },
      rules: {
        ru: 'Правила проверки поля. Их можно менять на лету.',
        en: 'Validation rules of the field. They can change at runtime.',
      },
      validateOn: {
        ru: 'Когда начинать проверку: при отправке (`submit`), уходе из поля (`blur`) или изменении (`change`). По умолчанию берётся из `useForm`, там — `submit`.',
        en: 'When validation starts: on submit (`submit`), on leaving the field (`blur`) or on change (`change`). Defaults to the `validateOn` of `useForm`, which is `submit`.',
      },
      debounce: {
        ru: 'Задержка асинхронной проверки после изменения, в миллисекундах. По умолчанию 300.',
        en: 'Delay of the async check after a change, in milliseconds. Defaults to 300.',
      },
    },
    slots: {
      label: { ru: 'Своя подпись вместо `label`.', en: 'Custom label instead of `label`.' },
      default: {
        ru: 'Контрол. Получает `field` для `v-bind`, а также `error`, `invalid`, `touched` и `pending`.',
        en: 'The control. Receives `field` for `v-bind`, plus `error`, `invalid`, `touched` and `pending`.',
      },
      description: {
        ru: 'Своя подсказка вместо `description`.',
        en: 'Custom hint instead of `description`.',
      },
    },
  },
  NuiFieldArray: {
    props: {
      form,
      name: {
        ru: 'Функция, которая указывает на массив строк, например `(v) => v.contacts`.',
        en: 'Function that points at the row array, such as `(v) => v.contacts`.',
      },
      label: { ru: 'Подпись списка строк.', en: 'Label of the row list.' },
      description: { ru: 'Подсказка под подписью.', en: 'Hint under the label.' },
      min: {
        ru: 'Наименьшее число строк. Когда оно достигнуто, кнопки удаления скрываются.',
        en: 'Fewest rows allowed. Once reached, the remove buttons hide.',
      },
      max: {
        ru: 'Наибольшее число строк. Когда оно достигнуто, кнопка добавления отключается.',
        en: 'Most rows allowed. Once reached, the add button is disabled.',
      },
      newRow: {
        ru: 'Функция, которая создаёт новую строку. Без неё кнопки добавления нет.',
        en: 'Function that creates a new row. Without it there is no add button.',
      },
      reorderable: {
        ru: 'Разрешает переставлять строки мышью и с клавиатуры.',
        en: 'Lets rows be reordered with the mouse and the keyboard.',
      },
      disabled: {
        ru: 'Отключает поля строк, ручки и кнопку добавления, а кнопки удаления прячет. Строки отправляются без проверки.',
        en: 'Disables the row fields, the grips and the add button, and hides the remove buttons. The rows are submitted without validation.',
      },
      readonly: {
        ru: 'Показывает строки без возможности добавить, удалить или переставить их.',
        en: 'Shows the rows without adding, removing or reordering.',
      },
      rules: {
        ru: 'Правила проверки всего списка, например «не меньше одной строки».',
        en: 'Validation rules for the whole list, such as "at least one row".',
      },
      validateOn: {
        ru: 'Когда начинать проверку списка: `submit`, `blur` или `change`.',
        en: 'When validation of the list starts: `submit`, `blur` or `change`.',
      },
      addLabel: {
        ru: 'Текст кнопки добавления. По умолчанию — «Добавить строку» из словаря.',
        en: 'Add button text. Defaults to "Add row" from the dictionary.',
      },
      emptyLabel: {
        ru: 'Текст, когда строк нет. По умолчанию — «Строк пока нет» из словаря.',
        en: 'Text when there are no rows. Defaults to "No rows yet" from the dictionary.',
      },
      rowLabel: {
        ru: 'Функция имени строки по её номеру: его слышит экранный диктор при входе в строку. По умолчанию — «Строка 2».',
        en: 'Function for the name of a row by its number, read by a screen reader on entering the row. Defaults to "Row 2".',
      },
      removeLabel: {
        ru: 'Функция подписи кнопки удаления по номеру строки. По умолчанию — «Удалить строку 2».',
        en: 'Function for the remove button label by row number. Defaults to "Remove row 2".',
      },
      moveLabel: {
        ru: 'Функция подписи ручки перетаскивания по номеру строки. По умолчанию — «Переместить строку 2».',
        en: 'Function for the drag handle label by row number. Defaults to "Move row 2".',
      },
    },
    slots: {
      label: { ru: 'Своя подпись вместо `label`.', en: 'Custom label instead of `label`.' },
      description: {
        ru: 'Своя подсказка вместо `description`.',
        en: 'Custom hint instead of `description`.',
      },
      default: {
        ru: 'Поля одной строки. Получает `row`, `remove`, `first` и `last`.',
        en: 'Fields of one row. Receives `row`, `remove`, `first` and `last`.',
      },
      'row-actions': {
        ru: 'Свои кнопки строки вместо кнопки удаления. Получает `row`, `remove` и `canRemove`.',
        en: 'Custom row buttons instead of the remove button. Receives `row`, `remove` and `canRemove`.',
      },
      empty: { ru: 'Содержимое, когда строк нет.', en: 'Content when there are no rows.' },
      add: {
        ru: 'Своя кнопка добавления. Получает `push` и `canAdd`.',
        en: 'Custom add button. Receives `push` and `canAdd`.',
      },
    },
  },
};

export default docs;
