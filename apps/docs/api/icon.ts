import type { DocsMap } from '../.vitepress/reference/reference.types';

const docs: DocsMap = {
  NuiIcon: {
    props: {
      icon: {
        ru: 'Алиас из реестра иконок или готовый компонент. Алиасы типизированы: алиасы — это ключи наборов иконок: кит и пакеты объявляют свои наборы в `NuiIconSets`, приложение — свой.',
        en: 'An alias from the icon registry or a ready component. Aliases are typed: aliases are the keys of the icon sets: the kit and packages declare their sets in `NuiIconSets`, an app declares its own.',
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
