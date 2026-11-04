import type { DescriptionMap } from '../../.vitepress/reference/reference.types';

export const fieldTexts: DescriptionMap = {
  label: {
    ru: 'Подпись контрола. Внутри `NuiField` подпись берётся из поля.',
    en: 'Label of the control. Inside `NuiField` the field provides the label.',
  },
  description: {
    ru: 'Подсказка под контролом. Экранные дикторы читают её вместе с контролом.',
    en: 'Hint below the control. Screen readers announce it with the control.',
  },
  error: {
    ru: 'Текст ошибки под контролом. Переводит контрол в состояние ошибки.',
    en: 'Error text below the control. Puts the control into the error state.',
  },
  reserveError: {
    ru: 'Оставляет место под ошибку, чтобы форма не сдвигалась, когда ошибка появится.',
    en: 'Reserves space for the error so the form does not shift when it appears.',
  },
};

export const fieldState: DescriptionMap = {
  id: {
    ru: 'Идентификатор контрола. По умолчанию берётся из `NuiField` или создаётся автоматически.',
    en: 'Id of the control. Defaults to the one from `NuiField` or is generated automatically.',
  },
  disabled: {
    ru: 'Отключает контрол. Внутри `NuiField` по умолчанию берётся из поля.',
    en: 'Disables the control. Inside `NuiField` it defaults to the field value.',
  },
  readonly: {
    ru: 'Запрещает менять значение, но его можно выделить и скопировать. Внутри `NuiField` по умолчанию берётся из поля.',
    en: 'Prevents changes to the value, which stays selectable and copyable. Inside `NuiField` it defaults to the field value.',
  },
  required: {
    ru: 'Помечает контрол обязательным. Внутри `NuiField` по умолчанию берётся из поля.',
    en: 'Marks the control as required. Inside `NuiField` it defaults to the field value.',
  },
  invalid: {
    ru: 'Показывает состояние ошибки без текста. С `error` оно включается само.',
    en: 'Shows the error state without a text. With `error` it turns on by itself.',
  },
};

export const sizeProp: DescriptionMap = {
  size: {
    ru: 'Размер контрола: `sm`, `md` или `lg`. Высоту каждого размера сдвигает плотность темы.',
    en: 'Changes the size of the control: `sm`, `md` or `lg`. The theme density shifts the height of each size.',
  },
};

export const fieldControl: DescriptionMap = { ...fieldState, ...sizeProp, ...fieldTexts };

export const focusExposed: DescriptionMap = {
  focus: { ru: 'Ставит фокус в поле.', en: 'Focuses the field.' },
};
