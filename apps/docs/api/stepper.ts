import type { DocsMap } from '../.vitepress/reference/reference.types';

const docs: DocsMap = {
  NuiStepper: {
    configurator: {
      scene: 'stepper/Example',
      props: ['orientation', 'linear', 'label'],
      values: { label: { ru: 'Этапы заказа', en: 'Order stages' } },
    },
    props: {
      steps: {
        ru: 'Список шагов с полями `value` и `label`, а также `description`, `status` и `disabled`.',
        en: 'List of steps with `value` and `label`, plus optional `description`, `status` and `disabled`.',
      },
      orientation: {
        ru: 'Располагает шаги в ряд или столбцом. По умолчанию в ряд, с `readonly` — столбцом.',
        en: 'Lays out the steps in a row or a column. A row by default, a column with `readonly`.',
      },
      linear: {
        ru: 'Пускает только на пройденные шаги. Выключите, чтобы переходить на любой шаг.',
        en: 'Lets the user go back only to passed steps. Turn it off to allow any step.',
      },
      readonly: {
        ru: 'Показывает шаги без выбора: инструкция из `NuiStepperStep` или ход процесса по `steps`.',
        en: 'Shows the steps without choosing one: a guide of `NuiStepperStep` items or progress through `steps`.',
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
    slots: {
      default: {
        ru: 'Шаги `NuiStepperStep` в режиме `readonly`.',
        en: '`NuiStepperStep` items in `readonly` mode.',
      },
    },
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
  NuiStepperStep: {
    props: {
      title: {
        ru: 'Заголовок шага рядом с номером.',
        en: 'Step title next to the number.',
      },
    },
    slots: {
      title: {
        ru: 'Заголовок шага разметкой, например `<h3>` для оглавления страницы.',
        en: 'Step title as markup, such as an `<h3>` for the page outline.',
      },
      default: {
        ru: 'Содержимое шага под заголовком: текст, код, пример.',
        en: 'Step content under the title: text, code, an example.',
      },
    },
  },
};

export default docs;
