import type { DocsMap } from '../.vitepress/reference/reference.types';

const content = { ru: 'Содержимое части.', en: 'Content of the part.' };

const docs: DocsMap = {
  NuiCard: {
    props: {
      variant: {
        ru: 'Вид поверхности: контур, тень или мягкая заливка.',
        en: 'Surface look: outline, shadow or soft fill.',
      },
      padding: { ru: 'Внутренний отступ всех частей.', en: 'Inner padding of every part.' },
      href: {
        ru: 'Адрес; вся карточка становится ссылкой.',
        en: 'Address; the whole card becomes a link.',
      },
      to: {
        ru: 'Маршрут для компонента роутера: строка или объект; тип уточняется через NuiRouteRegister.',
        en: 'Route for a router component: a string or an object; NuiRouteRegister narrows the type.',
      },
      as: { ru: 'Компонент ссылки для to.', en: 'Link component used for to.' },
      interactive: {
        ru: 'Карточка-кнопка; клик по поверхности приходит в @click.',
        en: 'Button card; a click on the surface arrives in @click.',
      },
      title: { ru: 'Заголовок без частей.', en: 'Heading without parts.' },
      description: { ru: 'Описание без частей.', en: 'Description without parts.' },
    },
    slots: { default: { ru: 'Части карточки.', en: 'Parts of the card.' } },
    keyboard: [
      {
        keys: 'Enter',
        description: {
          ru: 'Открывает ссылку или нажимает карточку-кнопку.',
          en: 'Follows the link or presses the button card.',
        },
      },
      {
        keys: 'Space',
        description: { ru: 'Нажимает карточку-кнопку.', en: 'Presses the button card.' },
      },
    ],
    configurator: {
      props: ['variant', 'padding', 'interactive', 'title', 'description'],
      content: { ru: 'Содержимое карточки', en: 'Card content' },
    },
  },
  NuiCardHeader: {
    slots: {
      default: { ru: 'Заголовок и описание.', en: 'Heading and description.' },
      actions: {
        ru: 'Контролы справа от заголовка; работают независимо от ссылки карточки.',
        en: 'Controls beside the heading; they work independently of the card link.',
      },
    },
  },
  NuiCardTitle: {
    props: { as: { ru: 'Тег заголовка.', en: 'Heading tag.' } },
    slots: {
      default: {
        ru: 'Текст заголовка; он же имя ссылки карточки.',
        en: 'Heading text; it also names the card link.',
      },
    },
  },
  NuiCardDescription: { slots: { default: content } },
  NuiCardContent: { slots: { default: content } },
  NuiCardFooter: {
    slots: {
      default: {
        ru: 'Действия внизу; работают независимо от ссылки карточки.',
        en: 'Actions at the bottom; they work independently of the card link.',
      },
    },
  },
  NuiCardMedia: {
    props: {
      src: { ru: 'Адрес картинки в обрез до края.', en: 'Image address, cropped to the edge.' },
      alt: {
        ru: 'Альтернативный текст; пустой для декоративной картинки.',
        en: 'Alternative text; empty for a decorative image.',
      },
      aspect: { ru: 'Соотношение сторон области.', en: 'Aspect ratio of the area.' },
    },
    slots: {
      default: {
        ru: 'Замена картинки; без неё показывается иконка.',
        en: 'Replacement for the image; without it an icon shows.',
      },
    },
  },
};

export default docs;
