import type { DocsMap } from '../.vitepress/reference/reference.types';

const docs: DocsMap = {
  NuiButton: {
    props: {
      variant: {
        ru: 'Оформление: заливка (`solid`), мягкая заливка (`soft`), контур (`outline`), фон при наведении (`ghost`), без фона (`plain`) или ссылка (`link`).',
        en: 'Style: `solid` fill, `soft` fill, `outline`, background on hover (`ghost`), no background (`plain`) or `link`.',
      },
      tone: {
        ru: 'Цвет по смыслу: `primary`, `secondary`, `success`, `warning`, `error` и другие.',
        en: 'Color by meaning: `primary`, `secondary`, `success`, `warning`, `error` and others.',
      },
      size: {
        ru: 'Размер кнопки: `xs`, `sm`, `md`, `lg`. `inline` подгоняет кнопку под размер окружающего текста.',
        en: 'Button size: `xs`, `sm`, `md`, `lg`. `inline` fits the button to the size of the surrounding text.',
      },
      round: {
        ru: 'Скругляет кнопку полностью: квадратная становится круглой.',
        en: 'Rounds the button fully, so a square one becomes a circle.',
      },
      grip: {
        ru: 'Ручка перетаскивания: курсор «рука» и при нажатии «сжатая рука», жесты касания не прокручивают страницу.',
        en: 'Drag handle: a grab cursor that turns into grabbing while pressed, and touch gestures do not scroll the page.',
      },
      type: {
        ru: 'Тип кнопки в форме: `button`, `submit` или `reset`.',
        en: 'Button type in a form: `button`, `submit` or `reset`.',
      },
      disabled: {
        ru: 'Отключает кнопку: её нельзя нажать и до неё не дойти клавишей Tab.',
        en: 'Disables the button: it cannot be pressed or reached with Tab.',
      },
      loading: {
        ru: 'Показывает индикатор загрузки и блокирует нажатия. Ширина кнопки и фокус не меняются.',
        en: 'Shows a loading indicator and blocks presses. The width and the focus stay the same.',
      },
      iconOnly: {
        ru: 'Делает кнопку квадратной. Если внутри только иконка, включается сам.',
        en: 'Makes the button square. Turns on by itself when the button holds only an icon.',
      },
      icon: {
        ru: 'Иконка перед текстом. Без текста кнопка становится квадратной.',
        en: 'Icon to display before the text. Without text the button becomes square.',
      },
      iconEnd: {
        ru: 'Иконка после текста, бледнее и чуть меньше основной, например стрелка списка. Кнопка с ней не становится квадратной.',
        en: 'Icon after the text, muted and a bit smaller, such as a dropdown arrow. The button does not turn square with it.',
      },
      as: {
        ru: 'Тег или компонент ссылки, когда задан `href` или `to`. Без него `to` открывает роутер приложения.',
        en: 'Tag or component of the link when `href` or `to` is set. Without it the app router handles `to`.',
      },
      href: {
        ru: 'Адрес ссылки. С ним кнопка становится ссылкой.',
        en: 'Link URL. With it the button renders as a link.',
      },
      to: {
        ru: 'Маршрут для `RouterLink`, `NuxtLink` или компонента `link` из `createNuiConfig`. Без роутера строка становится `href`. Тип уточняет `NuiRouteRegister`.',
        en: 'Route for `RouterLink`, `NuxtLink` or the `link` component from `createNuiConfig`. Without a router a string becomes `href`. `NuiRouteRegister` narrows the type.',
      },
    },
    slots: {
      default: { ru: 'Текст и иконки кнопки.', en: 'Button text and icons.' },
    },
    keyboard: [
      { keys: 'Enter', description: { ru: 'Нажимает кнопку.', en: 'Presses the button.' } },
      { keys: 'Space', description: { ru: 'Нажимает кнопку.', en: 'Presses the button.' } },
    ],
    configurator: {
      props: ['variant', 'tone', 'size', 'disabled', 'loading'],
      content: { ru: 'Сохранить', en: 'Save' },
    },
  },
};

export default docs;
