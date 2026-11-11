import type { DocsMap } from '../.vitepress/reference/reference.types';

const docs: DocsMap = {
  NuiDialog: {
    configurator: {
      scene: 'dialog/Example',
      props: ['title', 'description', 'size', 'placement', 'closable', 'closeOnBackdrop'],
      values: {
        title: { ru: 'Вернуть деньги за заказ?', en: 'Refund this order?' },
        description: {
          ru: 'Покупатель получит всю сумму на карту.',
          en: 'The customer gets the full amount back to the card.',
        },
      },
    },
    props: {
      id: {
        ru: 'Атрибут `id` диалога. Без него создаётся автоматически.',
        en: 'The `id` attribute of the dialog. Generated when omitted.',
      },
      placement: {
        ru: 'Положение: по центру экрана (`center`) или у верхнего края (`top`).',
        en: 'Position: centered (`center`) or at the top edge (`top`).',
      },
      bare: {
        ru: 'Убирает отступы, кнопку закрытия и видимый заголовок. Подходит для палитры команд.',
        en: 'Removes the padding, the close button and the visible title. Suits a command palette.',
      },
      title: {
        ru: 'Заголовок. Экранные дикторы зачитывают его при открытии.',
        en: 'Title. Screen readers announce it on open.',
      },
      description: {
        ru: 'Описание под заголовком. Дикторы зачитывают его вслед за заголовком.',
        en: 'Description under the title. Screen readers read it after the title.',
      },
      size: {
        ru: 'Ширина: `sm`, `md`, `lg` или `auto` — по содержимому, но не шире экрана, например для картинки.',
        en: 'Width: `sm`, `md`, `lg` or `auto`, which fits the content within the screen, such as an image.',
      },
      closable: {
        ru: 'Показывает кнопку закрытия и разрешает закрыть диалог клавишей Esc и кликом по фону.',
        en: 'Shows a close button and lets Esc and a backdrop click close the dialog.',
      },
      closeOnBackdrop: {
        ru: 'Закрывает окно по клику на затемнённый фон.',
        en: 'Closes on a click on the dimmed backdrop.',
      },
      closeLabel: {
        ru: 'Подпись кнопки закрытия для экранных дикторов. По умолчанию — «Закрыть» из словаря.',
        en: 'Close button label for screen readers. Defaults to "Close" from the dictionary.',
      },
    },
    models: { 'v-model:open': { ru: 'Открыт ли диалог.', en: 'Whether the dialog is open.' } },
    events: {
      close: {
        ru: 'Срабатывает при закрытии. Передаёт `returnValue` формы с `method="dialog"`.',
        en: 'Fires on close with the `returnValue` of a `method="dialog"` form.',
      },
    },
    slots: {
      title: { ru: 'Свой заголовок вместо `title`.', en: 'Custom title instead of `title`.' },
      description: {
        ru: 'Своё описание вместо `description`.',
        en: 'Custom description instead of `description`.',
      },
      default: { ru: 'Содержимое диалога.', en: 'Dialog content.' },
      footer: {
        ru: 'Кнопки внизу диалога. Кнопка в форме с `method="dialog"` закрывает его без кода.',
        en: 'Buttons at the bottom. A button in a `method="dialog"` form closes it without code.',
      },
    },
    keyboard: [
      {
        keys: 'Escape',
        description: {
          ru: 'Закрывает верхний диалог, если включён `closable`.',
          en: 'Closes the top dialog when `closable` is on.',
        },
      },
      {
        keys: 'Tab',
        description: {
          ru: 'Переводит фокус по элементам диалога. Страница под ним недоступна.',
          en: 'Moves the focus through the dialog. The page behind it cannot be reached.',
        },
      },
    ],
  },
};

export default docs;
