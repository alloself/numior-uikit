import type { DocsMap } from '../.vitepress/reference/reference.types';

const docs: DocsMap = {
  NuiEmpty: {
    props: {
      icon: { ru: 'Иконка над текстом.', en: 'Icon above the text.' },
      hideIcon: {
        ru: 'Убирает иконку над заголовком, например в узкой заглушке.',
        en: 'Removes the icon above the title, as in a narrow placeholder.',
      },
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
      media: {
        ru: 'Своя картинка или иллюстрация на месте иконки.',
        en: 'Your own picture or illustration in place of the icon.',
      },
      title: { ru: 'Свой заголовок вместо `title`.', en: 'Custom title instead of `title`.' },
      default: { ru: 'Текст вместо `description`.', en: 'Text instead of `description`.' },
      actions: { ru: 'Кнопки под текстом.', en: 'Buttons under the text.' },
    },
    configurator: {
      props: ['size', 'hideIcon', 'title', 'description'],
      values: {
        title: { ru: 'Заказов пока нет', en: 'No orders yet' },
        description: {
          ru: 'Заказы с сайта появятся здесь сами, а заказ по телефону создайте вручную.',
          en: 'Orders from the store show up here on their own. Create phone orders by hand.',
        },
      },
    },
  },
};

export default docs;
