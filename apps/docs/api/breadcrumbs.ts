import type { DocsMap } from '../.vitepress/reference/reference.types';

const docs: DocsMap = {
  NuiBreadcrumbs: {
    configurator: {
      scene: 'breadcrumbs/Example',
      props: ['maxItems', 'separator', 'label'],
      choices: { separator: ['chevron-right', 'arrow-right'] },
      values: { label: { ru: 'Путь в каталоге', en: 'Catalog path' } },
    },
    props: {
      items: {
        ru: 'Шаги пути: подпись (`label`), ссылка (`href` или `to`) и иконка (`icon`).',
        en: 'Path steps: `label`, link (`href` or `to`) and `icon`.',
      },
      maxItems: {
        ru: 'Сколько шагов показать. Средние шаги прячутся в меню «…».',
        en: 'How many steps to show. The middle steps go into a "…" menu.',
      },
      separator: {
        ru: 'Иконка между шагами. При письме справа налево отражается.',
        en: 'Icon between the steps. Mirrored in right-to-left layouts.',
      },
      label: {
        ru: 'Подпись навигации для экранных дикторов. По умолчанию — «Навигационная цепочка» из словаря.',
        en: 'Navigation label for screen readers. Defaults to "Breadcrumb" from the dictionary.',
      },
      moreLabel: {
        ru: 'Подпись кнопки «…» для экранных дикторов. По умолчанию — «Показать путь» из словаря.',
        en: 'Label of the "…" button for screen readers. Defaults to "Show path" from the dictionary.',
      },
      as: {
        ru: 'Компонент ссылки для шагов с `to`. Без него берётся роутер приложения или ссылка из конфига.',
        en: 'Link component for steps with `to`. Without it the app router or the configured link is used.',
      },
    },
    slots: {
      item: {
        ru: 'Свой шаг пути. Получает `item`, `index` и `current` — последний ли это шаг.',
        en: 'Custom path step. Receives `item`, `index` and `current`, whether it is the last step.',
      },
    },
    keyboard: [
      {
        keys: 'Tab',
        description: {
          ru: 'Переводит фокус на следующую ссылку пути.',
          en: 'Moves the focus to the next path link.',
        },
      },
      {
        keys: 'Enter',
        description: {
          ru: 'Открывает ссылку. На кнопке «…» открывает меню скрытых шагов.',
          en: 'Follows the link. On the "…" button, opens the menu of hidden steps.',
        },
      },
    ],
  },
};

export default docs;
