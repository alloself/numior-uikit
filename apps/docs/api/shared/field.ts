import type { DescriptionMap } from '../../.vitepress/reference/reference.types';

export const fieldTexts: DescriptionMap = {
  label: {
    ru: 'Подпись контрола; вне NuiField контрол рисует её сам.',
    en: 'Label of the control; outside NuiField the control draws it itself.',
  },
  description: {
    ru: 'Подсказка под контролом, связанная через aria-describedby.',
    en: 'Hint under the control, linked through aria-describedby.',
  },
  error: {
    ru: 'Текст ошибки; включает состояние ошибки.',
    en: 'Error text; it switches the error state on.',
  },
  reserveError: {
    ru: 'Держит строку под ошибку, чтобы форма не прыгала.',
    en: 'Keeps a line for the error so the form does not jump.',
  },
};

export const fieldState: DescriptionMap = {
  id: {
    ru: 'Идентификатор контрола; внутри поля выдаётся автоматически.',
    en: 'Control id; a field assigns one automatically.',
  },
  disabled: {
    ru: 'Выключает контрол; наследуется от поля.',
    en: 'Disables the control; inherited from the field.',
  },
  required: {
    ru: 'Помечает значение обязательным; наследуется от поля.',
    en: 'Marks the value as required; inherited from the field.',
  },
  invalid: {
    ru: 'Показывает состояние ошибки; наследуется от поля.',
    en: 'Shows the error state; inherited from the field.',
  },
};

export const sizeProp: DescriptionMap = {
  size: {
    ru: 'Ступень размера внутри текущей плотности.',
    en: 'Size step inside the current density.',
  },
};

export const fieldControl: DescriptionMap = { ...fieldState, ...sizeProp, ...fieldTexts };

export const focusExposed: DescriptionMap = {
  focus: { ru: 'Ставит фокус в поле.', en: 'Moves the focus into the field.' },
};
