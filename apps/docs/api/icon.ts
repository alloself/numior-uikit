import type { DocsMap } from '../.vitepress/reference/reference.types';

const docs: DocsMap = {
  NuiIcon: {
    props: {
      alias: { ru: 'Алиас из реестра иконок.', en: 'Alias from the icon registry.' },
      icon: {
        ru: 'Готовый компонент; приоритетнее alias.',
        en: 'A ready component; takes priority over alias.',
      },
    },
    configurator: { props: ['alias'], values: { alias: 'search' } },
  },
};

export default docs;
