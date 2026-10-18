import type { DocsMap } from '../.vitepress/reference/reference.types';

const docs: DocsMap = {
  NuiIcon: {
    props: {
      icon: {
        ru: 'Алиас из реестра иконок или готовый компонент. Алиасы типизированы: свой алиас приложение объявляет в `NuiIconAliases` и регистрирует в `createNuiConfig({ icons })`.',
        en: 'An alias from the icon registry or a ready component. Aliases are typed: an app declares its own alias in `NuiIconAliases` and registers it in `createNuiConfig({ icons })`.',
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
