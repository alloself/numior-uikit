import type { DocsMap } from '../.vitepress/reference/reference.types';

const docs: DocsMap = {
  NuiIcon: {
    props: {
      alias: { ru: 'Алиас из реестра иконок.', en: 'Alias from the icon registry.' },
      icon: {
        ru: 'Готовый компонент; приоритетнее alias.',
        en: 'A ready component; takes priority over alias.',
      },
      transform: {
        ru: 'Преобразование глифа: `rotate` в градусах и `scale`; смена анимируется, сам глиф не меняется (шеврон раскрытия).',
        en: 'Glyph transform: `rotate` in degrees and `scale`; a change animates while the glyph stays (a disclosure chevron).',
      },
    },
    configurator: { props: ['alias'], values: { alias: 'search' } },
  },
};

export default docs;
