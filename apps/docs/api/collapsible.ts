import type { DocsMap } from '../.vitepress/reference/reference.types';

const docs: DocsMap = {
  NuiCollapsible: {
    props: {
      id: {
        ru: 'Основа `id` скрываемого блока. Без неё создаётся автоматически.',
        en: 'Base of the collapsible block `id`. Generated when omitted.',
      },
      label: {
        ru: 'Текст заголовка, по которому открывается содержимое.',
        en: 'Heading text that opens the content.',
      },
      variant: {
        ru: 'Оформление: `plain` — без рамки, `card` — в карточке.',
        en: 'Style: `plain` without a frame, `card` inside a card.',
      },
      headingLevel: {
        ru: 'Оборачивает заголовок в `h2`–`h6`, чтобы секция попала в структуру страницы. Без него заголовок — `div`.',
        en: 'Wraps the heading in `h2`–`h6`, so the section appears in the page outline. Without it the heading is a `div`.',
      },
      disabled: {
        ru: 'Отключает заголовок: содержимое нельзя открыть или закрыть.',
        en: 'Disables the heading, so the content cannot open or close.',
      },
    },
    models: {
      'v-model:open': { ru: 'Открыто ли содержимое.', en: 'Whether the content is open.' },
    },
    slots: {
      trigger: {
        ru: 'Свой заголовок. Получает `open` — открыто ли содержимое.',
        en: 'Custom heading. Receives `open`, whether the content is open.',
      },
      default: {
        ru: 'Содержимое, которое открывается и скрывается.',
        en: 'Content that opens and hides.',
      },
    },
    keyboard: [
      {
        keys: 'Enter',
        description: {
          ru: 'Открывает или закрывает содержимое.',
          en: 'Opens or closes the content.',
        },
      },
      {
        keys: 'Space',
        description: {
          ru: 'Открывает или закрывает содержимое.',
          en: 'Opens or closes the content.',
        },
      },
    ],
    configurator: {
      props: ['variant', 'label', 'disabled'],
      values: { label: { ru: 'Условия доставки', en: 'Delivery terms' } },
      content: {
        ru: 'Курьер привозит заказ на следующий день после оплаты.',
        en: 'The courier delivers the order the day after payment.',
      },
    },
  },
};

export default docs;
