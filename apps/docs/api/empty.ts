import type { DocsMap } from '../.vitepress/reference/reference.types';

const docs: DocsMap = {
  NuiEmpty: {
    props: {
      icon: { ru: 'Иконка над текстом.', en: 'Icon above the text.' },
      hideIcon: { ru: 'Без иконки.', en: 'No icon.' },
      title: {
        ru: 'Заголовок; рендерится абзацем, не heading.',
        en: 'Title; rendered as a paragraph, not a heading.',
      },
      description: { ru: 'Пояснение под заголовком.', en: 'Explanation under the title.' },
      size: {
        ru: 'Обычный или компактный для списков и таблиц.',
        en: 'Regular or compact for lists and tables.',
      },
    },
    slots: {
      media: { ru: 'Иллюстрация вместо иконки.', en: 'Illustration instead of the icon.' },
      title: { ru: 'Разметка заголовка.', en: 'Title markup.' },
      default: { ru: 'Текст вместо description.', en: 'Text instead of description.' },
      actions: { ru: 'Кнопки под текстом.', en: 'Buttons under the text.' },
    },
    configurator: {
      props: ['size', 'hideIcon', 'title', 'description'],
      values: {
        title: { ru: 'Пока пусто', en: 'Nothing here yet' },
        description: {
          ru: 'Создайте первый проект, чтобы увидеть его здесь.',
          en: 'Create the first project to see it here.',
        },
      },
    },
  },
};

export default docs;
