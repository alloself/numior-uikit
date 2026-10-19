import type { DocsMap } from '../.vitepress/reference/reference.types';

const docs: DocsMap = {
  NuiIcon: {
    props: {
      icon: {
        ru: 'Алиас иконки кита или готовый компонент. Алиас берёт иконку из конфигурации, а без неё — иконку Lucide, загруженную при первом обращении.',
        en: 'A kit icon alias or a ready component. An alias takes the icon from the configuration, or else the Lucide icon loaded on first use.',
      },
      transform: {
        ru: 'Преобразование глифа: `rotate` в градусах и `scale`; смена анимируется, сам глиф не меняется (шеврон раскрытия).',
        en: 'Glyph transform: `rotate` in degrees and `scale`; a change animates while the glyph stays (a disclosure chevron).',
      },
    },
    configurator: { props: ['icon'], values: { icon: 'search' } },
  },
};

export default docs;
