import type { DocsMap } from '../.vitepress/reference/reference.types';

const dictionary = (ru: string, en: string) => ({
  ru: `${ru}; по умолчанию из словаря.`,
  en: `${en}; the dictionary supplies the default.`,
});

const docs: DocsMap = {
  NuiToc: {
    props: {
      items: {
        ru: 'Заголовки с id и вложенными children.',
        en: 'Headings with ids and nested children.',
      },
      title: dictionary('Заголовок над списком', 'Title above the list'),
      label: {
        ru: 'Доступное имя навигации; по умолчанию равно title.',
        en: 'Accessible name of the navigation; equals title by default.',
      },
      root: {
        ru: 'Прокручиваемый контейнер статьи; без него — окно.',
        en: 'Scrollable container of the article; the window without it.',
      },
      line: {
        ru: 'Доля высоты контейнера, ниже которой заголовок считается текущим.',
        en: 'Fraction of the container height below which a heading counts as current.',
      },
    },
    events: { select: { ru: 'Клик по ссылке: [id].', en: 'A link was clicked: [id].' } },
  },
};

export default docs;
