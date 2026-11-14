import type { DocsMap } from '../.vitepress/reference/reference.types';

const content = { ru: 'Содержимое блока.', en: 'Content of the block.' };

const docs: DocsMap = {
  NuiCard: {
    props: {
      variant: {
        ru: 'Оформление: рамка (`outline`), тень (`elevated`) или мягкая заливка (`soft`).',
        en: 'Style: `outline` border, shadow (`elevated`) or `soft` fill.',
      },
      padding: {
        ru: 'Внутренние отступы карточки: `xs`, `sm`, `md` или `lg`. Отступ `xs` подходит для плотной сетки из многих карточек.',
        en: 'Inner padding of the card: `xs`, `sm`, `md` or `lg`. The `xs` padding suits a dense grid of many cards.',
      },
      href: {
        ru: 'Адрес ссылки. Вся карточка открывает его по клику.',
        en: 'Link URL. A click anywhere on the card opens it.',
      },
      to: {
        ru: 'Маршрут для `RouterLink`, `NuxtLink` или компонента `link` из `createNuiConfig`. Без роутера строка становится `href`. Тип уточняет `NuiRouteRegister`.',
        en: 'Route for `RouterLink`, `NuxtLink` or the `link` component from `createNuiConfig`. Without a router a string becomes `href`. `NuiRouteRegister` narrows the type.',
      },
      as: {
        ru: 'Компонент ссылки для `to` вместо роутера приложения.',
        en: 'Link component for `to` instead of the app router.',
      },
      interactive: {
        ru: 'Делает всю карточку кнопкой. Нажатие приходит в событие `click`.',
        en: 'Turns the whole card into a button. Presses arrive as the `click` event.',
      },
      title: {
        ru: 'Заголовок, если карточка собрана без `NuiCardHeader`.',
        en: 'Title when the card has no `NuiCardHeader`.',
      },
      description: {
        ru: 'Описание под заголовком без `NuiCardHeader`.',
        en: 'Description under the title without `NuiCardHeader`.',
      },
      loading: {
        ru: 'Показывает заглушки в частях карточки, ставит `aria-busy` и выключает ссылку или кнопку карточки.',
        en: 'Shows placeholders in the card parts, sets `aria-busy` and turns the card link or button off.',
      },
    },
    events: {
      click: {
        ru: 'Клик по карточке-кнопке или карточке-ссылке. Клики по кнопкам и ссылкам внутри карточки сюда не приходят.',
        en: 'A click on a button card or a link card. Clicks on buttons and links inside the card do not reach it.',
      },
    },
    slots: {
      default: {
        ru: 'Блоки карточки: `NuiCardHeader`, `NuiCardContent`, `NuiCardFooter` и другие.',
        en: 'Card blocks: `NuiCardHeader`, `NuiCardContent`, `NuiCardFooter` and others.',
      },
    },
    keyboard: [
      {
        keys: 'Enter',
        description: {
          ru: 'Открывает ссылку карточки или нажимает карточку-кнопку.',
          en: 'Follows the card link or presses the button card.',
        },
      },
      {
        keys: 'Space',
        description: { ru: 'Нажимает карточку-кнопку.', en: 'Presses the button card.' },
      },
    ],
    configurator: {
      props: ['variant', 'padding', 'interactive', 'loading', 'title', 'description'],
      content: {
        ru: 'Комод «Фьорд» и лампа «Нурд» на 26 800 ₽.',
        en: 'Fjord dresser and Nord table lamp, $368.',
      },
    },
  },
  NuiCardHeader: {
    slots: {
      default: { ru: 'Заголовок и описание.', en: 'Title and description.' },
      actions: {
        ru: 'Кнопки рядом с заголовком. Нажатие на них не открывает ссылку карточки.',
        en: 'Buttons beside the title. Pressing them does not follow the card link.',
      },
    },
  },
  NuiCardTitle: {
    props: { as: { ru: 'Тег заголовка: от `h2` до `h6`.', en: 'Heading tag, from `h2` to `h6`.' } },
    slots: {
      default: {
        ru: 'Текст заголовка. Он же подпись ссылки или кнопки карточки.',
        en: 'Title text. It also labels the card link or button.',
      },
    },
  },
  NuiCardDescription: { slots: { default: content } },
  NuiCardContent: {
    props: {
      lines: {
        ru: 'Число строк заглушки, пока карточка загружается.',
        en: 'Number of placeholder lines while the card is loading.',
      },
    },
    slots: { default: content },
  },
  NuiCardFooter: {
    slots: {
      default: {
        ru: 'Кнопки внизу карточки. Нажатие на них не открывает ссылку карточки.',
        en: 'Buttons at the bottom of the card. Pressing them does not follow the card link.',
      },
    },
  },
  NuiCardMedia: {
    props: {
      src: {
        ru: 'Адрес картинки. Она заполняет область до краёв карточки.',
        en: 'Image URL. The image fills the area up to the card edges.',
      },
      alt: {
        ru: 'Описание картинки для экранных дикторов. Для декоративной оставьте пустым.',
        en: 'Image description for screen readers. Leave empty for a decorative image.',
      },
      aspect: {
        ru: 'Соотношение сторон области, например `16 / 9`.',
        en: 'Aspect ratio of the area, such as `16 / 9`.',
      },
    },
    slots: {
      default: {
        ru: 'Своё содержимое вместо картинки. Без `src` и слота показывается иконка.',
        en: 'Custom content instead of the image. Without `src` or this slot an icon shows.',
      },
    },
  },
};

export default docs;
