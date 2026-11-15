import type { DocsMap } from '../.vitepress/reference/reference.types';

const docs: DocsMap = {
  NuiSplitter: {
    props: {
      id: {
        ru: 'Идентификатор первой панели. По умолчанию создаётся автоматически.',
        en: 'Id of the first pane. Generated automatically by default.',
      },
      orientation: {
        ru: 'Ставит панели рядом или одну над другой.',
        en: 'Places the panes side by side or one above the other.',
      },
      min: {
        ru: 'Наименьшая доля первой панели, от 0 до 1. По умолчанию `0.1`.',
        en: 'Smallest share of the first pane, from 0 to 1. Defaults to `0.1`.',
      },
      max: {
        ru: 'Наибольшая доля первой панели, от 0 до 1. По умолчанию `0.9`.',
        en: 'Largest share of the first pane, from 0 to 1. Defaults to `0.9`.',
      },
      step: {
        ru: 'На какую долю сдвигает границу одно нажатие стрелки. По умолчанию `0.05`.',
        en: 'Share by which one arrow key press moves the boundary. Defaults to `0.05`.',
      },
      disabled: { ru: 'Запрещает менять размер панелей.', en: 'Prevents resizing the panes.' },
      label: {
        ru: 'Подпись разделителя для экранных дикторов. По умолчанию — «Изменить размер панелей».',
        en: 'Divider label for screen readers. Defaults to "Resize panes".',
      },
    },
    models: {
      'v-model:ratio': {
        ru: 'Доля первой панели от 0 до 1, по умолчанию `0.5`. Значение вне `min` и `max` показывается на ближайшей границе и не меняется, пока границу не сдвинут.',
        en: 'Share of the first pane from 0 to 1, `0.5` by default. A value outside `min` and `max` is shown at the nearest bound and stays as it is until the boundary moves.',
      },
    },
    slots: {
      start: { ru: 'Первая панель.', en: 'First pane.' },
      end: { ru: 'Вторая панель.', en: 'Second pane.' },
    },
    keyboard: [
      {
        keys: 'ArrowRight',
        description: {
          ru: 'Увеличивает первую панель. При письме справа налево — уменьшает.',
          en: 'Grows the first pane. Shrinks it in right-to-left layouts.',
        },
      },
      {
        keys: 'ArrowLeft',
        description: {
          ru: 'Уменьшает первую панель. При письме справа налево — увеличивает.',
          en: 'Shrinks the first pane. Grows it in right-to-left layouts.',
        },
      },
      {
        keys: 'ArrowDown',
        description: { ru: 'Увеличивает верхнюю панель.', en: 'Grows the top pane.' },
      },
      {
        keys: 'ArrowUp',
        description: { ru: 'Уменьшает верхнюю панель.', en: 'Shrinks the top pane.' },
      },
      {
        keys: 'Home',
        description: {
          ru: 'Сжимает первую панель до доли `min`.',
          en: 'Shrinks the first pane to the `min` share.',
        },
      },
      {
        keys: 'End',
        description: {
          ru: 'Растягивает первую панель до доли `max`.',
          en: 'Grows the first pane to the `max` share.',
        },
      },
    ],
    configurator: { props: ['orientation', 'step', 'disabled'] },
  },
};

export default docs;
