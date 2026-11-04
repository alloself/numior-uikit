import type { DocsMap } from '../.vitepress/reference/reference.types';

const docs: DocsMap = {
  NuiStepper: {
    props: {
      steps: {
        ru: 'Список шагов с полями `value` и `label`, а также `description`, `status` и `disabled`.',
        en: 'List of steps with `value` and `label`, plus optional `description`, `status` and `disabled`.',
      },
      orientation: {
        ru: 'Располагает шаги в ряд или столбцом.',
        en: 'Lays out the steps in a row or a column.',
      },
      linear: {
        ru: 'Пускает только на пройденные шаги. Выключите, чтобы переходить на любой шаг.',
        en: 'Lets the user go back only to passed steps. Turn it off to allow any step.',
      },
      label: {
        ru: 'Подпись навигации для экранных дикторов. По умолчанию — «Шаги» из словаря.',
        en: 'Navigation label for screen readers. Defaults to "Steps" from the dictionary.',
      },
      completeLabel: {
        ru: 'Статус выполненного шага для экранных дикторов. По умолчанию — «выполнено».',
        en: 'Status of a completed step for screen readers. Defaults to "completed".',
      },
      errorLabel: {
        ru: 'Статус шага с ошибкой для экранных дикторов. По умолчанию — «есть ошибки».',
        en: 'Status of a step with errors for screen readers. Defaults to "has errors".',
      },
    },
    models: { 'v-model': { ru: '`value` текущего шага.', en: '`value` of the current step.' } },
    keyboard: [
      {
        keys: 'Tab',
        description: {
          ru: 'Переходит между кнопками шагов.',
          en: 'Moves between the step buttons.',
        },
      },
      { keys: 'Enter', description: { ru: 'Делает шаг текущим.', en: 'Makes the step current.' } },
      { keys: 'Space', description: { ru: 'Делает шаг текущим.', en: 'Makes the step current.' } },
    ],
  },
};

export default docs;
