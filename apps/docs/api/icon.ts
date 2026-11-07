import type { DocsMap } from '../.vitepress/reference/reference.types';

const docs: DocsMap = {
  NuiIcon: {
    props: {
      icon: {
        ru: 'Имя иконки, например `search`, или компонент иконки. Имя ищется в `createNuiConfig`, иначе загружается иконка Lucide при первом показе.',
        en: 'Icon name, such as `search`, or an icon component. The name is looked up in `createNuiConfig`, else a Lucide icon loads on first use.',
      },
      transform: {
        ru: 'Поворот `rotate` в градусах и масштаб `scale`. Изменение плавное, например стрелка поворачивается при раскрытии.',
        en: 'Rotation `rotate` in degrees and `scale`. Changes animate, such as an arrow that turns on expand.',
      },
      filled: {
        ru: 'Заливает контур иконки цветом текста: из обводки круга получается точка, из флажка — сплошной флажок.',
        en: 'Fills the icon outline with the text colour: a circle outline becomes a dot, a flag outline a solid flag.',
      },
    },
    configurator: { props: ['icon'], values: { icon: 'search' } },
  },
};

export default docs;
