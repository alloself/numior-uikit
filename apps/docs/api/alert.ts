import type { DocsMap } from '../.vitepress/reference/reference.types';

const docs: DocsMap = {
  NuiAlert: {
    props: {
      variant: {
        ru: 'Оформление: мягкая заливка (`soft`), контур (`outline`) или сплошная заливка (`solid`).',
        en: 'Style: `soft` fill, `outline` or `solid` fill.',
      },
      tone: {
        ru: 'Цвет и иконка по смыслу: `info`, `success`, `warning`, `error` и другие. Сообщение с `error` диктор зачитывает сразу.',
        en: 'Color and icon by meaning: `info`, `success`, `warning`, `error` and others. Screen readers announce an `error` alert right away.',
      },
      title: { ru: 'Заголовок сообщения.', en: 'Message title.' },
      description: { ru: 'Текст под заголовком.', en: 'Text under the title.' },
      icon: {
        ru: 'Своя иконка вместо стандартной для `tone`.',
        en: 'Icon to display instead of the `tone` icon.',
      },
      hideIcon: { ru: 'Скрывает иконку.', en: 'Hides the icon.' },
      closable: {
        ru: 'Показывает кнопку закрытия. Закрытое сообщение скрывается, но остаётся в DOM.',
        en: 'Shows a close button. A closed alert is hidden but stays in the DOM.',
      },
      closeLabel: {
        ru: 'Подпись кнопки закрытия для экранных дикторов. По умолчанию — «Закрыть» из словаря.',
        en: 'Close button label for screen readers. Defaults to "Close" from the dictionary.',
      },
    },
    models: {
      'v-model:open': { ru: 'Показано ли сообщение.', en: 'Whether the alert is shown.' },
    },
    events: {
      close: {
        ru: 'Срабатывает при нажатии на кнопку закрытия.',
        en: 'Fires when the close button is pressed.',
      },
    },
    slots: {
      title: { ru: 'Свой заголовок вместо `title`.', en: 'Custom title instead of `title`.' },
      default: {
        ru: 'Текст сообщения вместо `description`.',
        en: 'Message text instead of `description`.',
      },
      actions: { ru: 'Кнопки под текстом.', en: 'Buttons under the text.' },
    },
    configurator: {
      props: ['variant', 'tone', 'title', 'closable', 'hideIcon'],
      values: { title: { ru: 'Черновик сохранён', en: 'Draft saved' } },
      content: {
        ru: 'Синхронизация с сервером через минуту.',
        en: 'Sync with the server in a minute.',
      },
    },
  },
};

export default docs;
