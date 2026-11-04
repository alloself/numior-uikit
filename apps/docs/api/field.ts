import type { DocsMap } from '../.vitepress/reference/reference.types';
import { fieldTexts } from './shared/field.ts';

const fieldProp = {
  field: {
    ru: 'Поле, к которому относится элемент. Без него берётся ближайший `NuiField`.',
    en: 'Field this part belongs to. Without it the nearest `NuiField` is used.',
  },
};

const docs: DocsMap = {
  NuiField: {
    props: {
      ...fieldTexts,
      id: {
        ru: 'Атрибут `id` контрола внутри. Без него создаётся автоматически.',
        en: 'The `id` attribute of the control inside. Generated when omitted.',
      },
      invalid: {
        ru: 'Помечает контрол внутри как ошибочный без текста ошибки.',
        en: 'Marks the control inside as invalid without an error text.',
      },
      required: {
        ru: 'Помечает контрол внутри как обязательный. У подписи появляется звёздочка.',
        en: 'Marks the control inside as required. The label gets an asterisk.',
      },
      disabled: {
        ru: 'Отключает контрол внутри, а с `group` — все контролы группы.',
        en: 'Disables the control inside, or every control of the group with `group`.',
      },
      readonly: {
        ru: 'Показывает значение контрола внутри без возможности его изменить.',
        en: 'Shows the value of the control inside without letting it change.',
      },
      group: {
        ru: 'Собирает несколько контролов в группу `fieldset`, а подпись выводит в `legend`.',
        en: 'Groups several controls in a `fieldset` and puts the label into a `legend`.',
      },
    },
    slots: {
      label: { ru: 'Своя подпись вместо `label`.', en: 'Custom label instead of `label`.' },
      default: { ru: 'Один или несколько контролов.', en: 'One or more controls.' },
      description: {
        ru: 'Своя подсказка вместо `description`.',
        en: 'Custom hint instead of `description`.',
      },
      error: { ru: 'Свой текст ошибки вместо `error`.', en: 'Custom error instead of `error`.' },
    },
  },
  NuiFieldFrame: {
    props: {
      field: {
        ru: 'Состояние поля из `useFieldControl().field`.',
        en: 'Field state from `useFieldControl().field`.',
      },
      own: {
        ru: 'Выводит подпись, подсказку и ошибку. Выключите, если их уже выводит `NuiField` снаружи.',
        en: 'Renders the label, hint and error. Turn it off when an outer `NuiField` already renders them.',
      },
      label: { ru: 'Текст подписи.', en: 'Label text.' },
      description: {
        ru: 'Подсказка под контролом.',
        en: 'Hint under the control.',
      },
      error: { ru: 'Текст ошибки.', en: 'Error text.' },
      reserveError: {
        ru: 'Оставляет место под ошибку, чтобы форма не сдвигалась, когда она появится.',
        en: 'Keeps room for the error so the form does not shift when it appears.',
      },
      group: {
        ru: 'Выводит группу контролов в `fieldset`.',
        en: 'Renders a group of controls in a `fieldset`.',
      },
      inline: {
        ru: 'Не выводит подпись: контрол показывает её сам в одной строке, как чекбокс.',
        en: 'Skips the label: the control shows it on its own line, like a checkbox.',
      },
    },
    slots: {
      default: { ru: 'Контрол.', en: 'The control.' },
      label: { ru: 'Своя подпись вместо `label`.', en: 'Custom label instead of `label`.' },
      description: {
        ru: 'Своя подсказка вместо `description`.',
        en: 'Custom hint instead of `description`.',
      },
      error: { ru: 'Свой текст ошибки вместо `error`.', en: 'Custom error instead of `error`.' },
    },
  },
  NuiFieldLabel: {
    props: fieldProp,
    slots: { default: { ru: 'Текст подписи.', en: 'Label text.' } },
  },
  NuiFieldDescription: {
    props: fieldProp,
    slots: { default: { ru: 'Текст подсказки.', en: 'Hint text.' } },
  },
  NuiFieldError: {
    props: fieldProp,
    slots: { default: { ru: 'Текст ошибки.', en: 'Error text.' } },
  },
};

export default docs;
