import type { DocsMap } from '../.vitepress/reference/reference.types';

const docs: DocsMap = {
  NuiPopover: {
    configurator: {
      scene: 'popover/Example',
      props: ['placement', 'offset', 'arrow', 'padding', 'size', 'trigger'],
    },
    props: {
      id: {
        ru: 'Идентификатор поповера. По умолчанию создаётся автоматически.',
        en: 'Id of the popover. Generated automatically by default.',
      },
      placement: {
        ru: 'С какой стороны триггера открывается поповер, например `bottom-start`.',
        en: 'Side of the trigger the popover opens on, such as `bottom-start`.',
      },
      offset: { ru: 'Отступ от триггера в пикселях.', en: 'Distance from the trigger in pixels.' },
      arrow: {
        ru: 'Показывает стрелку, направленную на триггер.',
        en: 'Shows an arrow pointing at the trigger.',
      },
      padding: {
        ru: 'Внутренний отступ: `md` для текста и форм, `sm` для списков и кнопок, `none` для содержимого со своей рамкой.',
        en: 'Inner padding: `md` for text and forms, `sm` for lists and buttons, `none` for content with its own frame.',
      },
      size: {
        ru: 'Ширина: `md` — от 8 до 20rem для текста и форм, `auto` — по содержимому, но не шире экрана.',
        en: 'Width: `md` keeps 8 to 20rem for text and forms, `auto` fits the content up to the screen width.',
      },
      anchor: {
        ru: 'Элемент, рядом с которым открывается поповер вместо триггера, например выделенный текст.',
        en: 'Element the popover opens next to in place of the trigger, such as selected text.',
      },
      mode: {
        ru: '`auto` закрывается кликом снаружи и клавишей Escape, `manual` — только через `v-model:open`.',
        en: '`auto` closes on an outside click and Escape, `manual` only through `v-model:open`.',
      },
      trigger: {
        ru: 'Как открывается поповер: `click` — нажатием на триггер, `hover` — наведением или фокусом.',
        en: 'How the popover opens: `click` on a trigger press, `hover` on hover or focus.',
      },
      openDelay: {
        ru: 'Через сколько миллисекунд после наведения открывается поповер.',
        en: 'Delay in milliseconds before the popover opens on hover.',
      },
      closeDelay: {
        ru: 'Через сколько миллисекунд после ухода курсора поповер закрывается.',
        en: 'Delay in milliseconds before the popover closes after the pointer leaves.',
      },
      lazy: {
        ru: 'Создаёт содержимое при первом открытии и держит его после закрытия. Подходит для панелей, которые открываются редко, но не для содержимого, нужного на сервере.',
        en: 'Creates the content on the first open and keeps it after closing. Suits rarely opened panels, not content the server must render.',
      },
      fit: {
        ru: 'Не даёт поповеру выйти за край экрана по высоте: высота ограничивается местом у якоря, содержимое прокручивается. Не сочетается со стрелкой, которую прокрутка обрезает.',
        en: 'Keeps the popover within the screen height: the height is limited to the room at the anchor and the content scrolls. Does not combine with the arrow, which the scrolling clips.',
      },
    },
    models: { 'v-model:open': { ru: 'Открыт ли поповер.', en: 'Whether the popover is open.' } },
    slots: {
      trigger: {
        ru: 'Кнопка, которая открывает поповер. Получает `attrs` для `v-bind` и `open`.',
        en: 'Button that opens the popover. Receives `attrs` for `v-bind` and `open`.',
      },
      default: { ru: 'Содержимое поповера.', en: 'Content of the popover.' },
    },
    keyboard: [
      {
        keys: 'Enter',
        description: {
          ru: 'На триггере открывает и закрывает поповер.',
          en: 'On the trigger, opens and closes the popover.',
        },
      },
      {
        keys: 'Space',
        description: {
          ru: 'На триггере открывает и закрывает поповер.',
          en: 'On the trigger, opens and closes the popover.',
        },
      },
      { keys: 'Escape', description: { ru: 'Закрывает поповер.', en: 'Closes the popover.' } },
      {
        keys: 'Tab',
        description: {
          ru: 'С триггера переводит фокус внутрь поповера, затем дальше по странице.',
          en: 'From the trigger, moves focus into the popover, then on through the page.',
        },
      },
    ],
  },
};

export default docs;
