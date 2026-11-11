import type { DocsMap } from '../.vitepress/reference/reference.types';

const docs: DocsMap = {
  NuiToc: {
    props: {
      items: {
        ru: 'Заголовки статьи с полями `id`, `label` и вложенными `children`.',
        en: 'Article headings with `id`, `label` and nested `children`.',
      },
      title: {
        ru: 'Заголовок над списком. По умолчанию — «На странице» из словаря.',
        en: 'Title above the list. Defaults to "On this page" from the dictionary.',
      },
      label: {
        ru: 'Подпись навигации для экранных дикторов. По умолчанию — «На странице» из словаря.',
        en: 'Navigation label for screen readers. Defaults to "On this page" from the dictionary.',
      },
      root: {
        ru: 'Прокручиваемый блок со статьёй. Без него оглавление следит за прокруткой окна.',
        en: 'Scrollable element that holds the article. Without it, the window scroll is tracked.',
      },
      line: {
        ru: 'Линия чтения в долях высоты, по умолчанию `0.2`. Текущим становится последний заголовок выше неё.',
        en: 'Reading line as a fraction of the height, `0.2` by default. The last heading above it becomes current.',
      },
      marker: {
        ru: 'Чем отмечен текущий раздел: `line` — линией слева, `square` — квадратом без линии. По умолчанию `line`.',
        en: 'How the current section is marked: `line` with a rule on the left, `square` with a square and no rule. Defaults to `line`.',
      },
    },
    events: {
      select: {
        ru: 'Срабатывает при клике по пункту, передаёт `id` заголовка.',
        en: 'Fires when an item is clicked, with the heading `id`.',
      },
    },
  },
};

export default docs;
