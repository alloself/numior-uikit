import type { DocsMap } from '../.vitepress/reference/reference.types';

const docs: DocsMap = {
  NuiStepper: {
    props: {
      steps: {
        ru: 'Шаги: значение, подпись, описание, статус, недоступность.',
        en: 'Steps: value, label, description, status, disabled.',
      },
      orientation: { ru: 'Ряд или колонка.', en: 'A row or a column.' },
      linear: {
        ru: 'Кнопками становятся только пройденные шаги; false — все.',
        en: 'Only completed steps become buttons; false makes every step a button.',
      },
      label: {
        ru: 'Доступное имя навигации; по умолчанию из словаря.',
        en: 'Accessible name of the navigation; the dictionary supplies the default.',
      },
      completeLabel: {
        ru: 'Текст статуса выполненного шага; по умолчанию из словаря.',
        en: 'Status text of a completed step; the dictionary supplies the default.',
      },
      errorLabel: {
        ru: 'Текст статуса шага с ошибкой; по умолчанию из словаря.',
        en: 'Status text of a step with errors; the dictionary supplies the default.',
      },
    },
    models: { 'v-model': { ru: 'Значение текущего шага.', en: 'Value of the current step.' } },
    keyboard: [
      {
        keys: 'Tab',
        description: { ru: 'Переходит по кнопкам шагов.', en: 'Moves through the step buttons.' },
      },
      { keys: 'Enter', description: { ru: 'Делает шаг текущим.', en: 'Makes the step current.' } },
      { keys: 'Space', description: { ru: 'Делает шаг текущим.', en: 'Makes the step current.' } },
    ],
  },
};

export default docs;
