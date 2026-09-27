import type { DocsMap } from '../.vitepress/reference/reference.types';

const docs: DocsMap = {
  NuiAlert: {
    props: {
      variant: {
        ru: 'Вид: мягкая заливка, контур или сплошной.',
        en: 'Look: soft fill, outline or solid.',
      },
      tone: {
        ru: 'Роль и иконка; error получает role="alert".',
        en: 'Role and icon; error gets role="alert".',
      },
      title: { ru: 'Заголовок сообщения.', en: 'Message title.' },
      description: { ru: 'Текст под заголовком.', en: 'Text under the title.' },
      icon: { ru: 'Иконка вместо иконки роли.', en: 'Icon instead of the role icon.' },
      hideIcon: { ru: 'Без иконки.', en: 'No icon.' },
      dismissible: {
        ru: 'Кнопка закрытия; закрытый алерт остаётся в DOM.',
        en: 'Close button; a closed alert stays in the DOM.',
      },
      dismissLabel: {
        ru: 'Доступное имя кнопки закрытия; по умолчанию из словаря.',
        en: 'Accessible name of the close button; the dictionary supplies the default.',
      },
    },
    models: { 'v-model:open': { ru: 'Показан ли алерт.', en: 'Whether the alert is shown.' } },
    events: { dismiss: { ru: 'Нажата кнопка закрытия.', en: 'The close button was pressed.' } },
    slots: {
      title: { ru: 'Разметка заголовка.', en: 'Title markup.' },
      default: {
        ru: 'Текст сообщения вместо description.',
        en: 'Message text instead of description.',
      },
      actions: { ru: 'Кнопки под текстом.', en: 'Buttons under the text.' },
    },
    configurator: {
      props: ['variant', 'tone', 'title', 'dismissible', 'hideIcon'],
      values: { title: { ru: 'Черновик сохранён', en: 'Draft saved' } },
      content: {
        ru: 'Синхронизация с сервером через минуту.',
        en: 'Sync with the server in a minute.',
      },
    },
  },
};

export default docs;
