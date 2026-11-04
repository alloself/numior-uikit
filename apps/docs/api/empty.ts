import type { DocsMap } from '../.vitepress/reference/reference.types';

const docs: DocsMap = {
  NuiEmpty: {
    props: {
      icon: { ru: 'Иконка над текстом.', en: 'Icon above the text.' },
      hideIcon: { ru: 'Скрывает иконку.', en: 'Hides the icon.' },
      title: {
        ru: 'Заголовок. Выводится абзацем `p`, а не тегом заголовка.',
        en: 'Title. Rendered as a `p` paragraph, not a heading tag.',
      },
      description: { ru: 'Пояснение под заголовком.', en: 'Explanation under the title.' },
      size: {
        ru: 'Размер: `md` — обычный, `sm` — компактный, для списков и таблиц.',
        en: 'Size: `md` for regular, `sm` for compact, for lists and tables.',
      },
    },
    slots: {
      media: { ru: 'Картинка вместо иконки.', en: 'Illustration instead of the icon.' },
      title: { ru: 'Свой заголовок вместо `title`.', en: 'Custom title instead of `title`.' },
      default: { ru: 'Текст вместо `description`.', en: 'Text instead of `description`.' },
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
