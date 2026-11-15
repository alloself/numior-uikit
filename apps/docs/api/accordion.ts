import type { DocsMap } from '../.vitepress/reference/reference.types';

const docs: DocsMap = {
  NuiAccordion: {
    configurator: {
      scene: 'accordion/Example',
      props: ['variant', 'multiple', 'collapsible', 'disabled'],
    },
    props: {
      id: { ru: 'Атрибут id корневого элемента.', en: 'Id attribute of the root element.' },
      multiple: {
        ru: 'Разрешает открыть несколько секций сразу. Открытые секции хранит модель `values`.',
        en: 'Lets several sections stay open at once. The `values` model holds them.',
      },
      collapsible: {
        ru: 'Закрывает открытую секцию повторным нажатием на заголовок.',
        en: 'Closes the open section on a second click on its heading.',
      },
      variant: {
        ru: 'Оформление: `plain` — без рамки, `card` — каждая секция в карточке.',
        en: 'Style: `plain` without a frame, `card` puts each section in a card.',
      },
      headingLevel: {
        ru: 'Оборачивает заголовки секций в `h2`–`h6`. Без него заголовок — `div`.',
        en: 'Wraps the section headings in `h2`–`h6`, so the sections appear in the page outline. Without it the heading is a `div`.',
      },
      disabled: {
        ru: 'Отключает заголовки всех секций: их нельзя открыть или закрыть.',
        en: 'Turns off every section heading: no section opens or closes.',
      },
    },
    models: {
      'v-model': {
        ru: 'Значение открытой секции или `null`, если все секции закрыты.',
        en: 'Value of the open section, or `null` when every section is closed.',
      },
      'v-model:values': {
        ru: 'Значения открытых секций, когда включён `multiple`.',
        en: 'Values of the open sections when `multiple` is on.',
      },
    },
    slots: { default: { ru: 'Секции `NuiAccordionItem`.', en: '`NuiAccordionItem` sections.' } },
    keyboard: [
      {
        keys: 'ArrowDown',
        description: {
          ru: 'Переводит фокус на следующий заголовок, с последнего — на первый.',
          en: 'Moves the focus to the next heading, from the last one to the first.',
        },
      },
      {
        keys: 'ArrowUp',
        description: {
          ru: 'Переводит фокус на предыдущий заголовок, с первого — на последний.',
          en: 'Moves the focus to the previous heading, from the first one to the last.',
        },
      },
      {
        keys: 'Home',
        description: {
          ru: 'Переводит фокус на первый заголовок.',
          en: 'Moves the focus to the first heading.',
        },
      },
      {
        keys: 'End',
        description: {
          ru: 'Переводит фокус на последний заголовок.',
          en: 'Moves the focus to the last heading.',
        },
      },
      {
        keys: 'Enter',
        description: { ru: 'Открывает или закрывает секцию.', en: 'Opens or closes the section.' },
      },
      {
        keys: 'Space',
        description: { ru: 'Открывает или закрывает секцию.', en: 'Opens or closes the section.' },
      },
    ],
  },
  NuiAccordionItem: {
    props: {
      value: {
        ru: 'Значение, которое попадает в модель аккордеона, когда секция открыта.',
        en: 'Value that goes into the accordion model while the section is open.',
      },
      label: { ru: 'Текст заголовка.', en: 'Heading text.' },
      disabled: {
        ru: 'Отключает заголовок секции: её нельзя открыть или закрыть, а открытая остаётся открытой.',
        en: 'Turns off the section heading: the section does not open or close, and an open one stays open.',
      },
    },
    slots: {
      trigger: {
        ru: 'Свой заголовок секции. Получает `open` — открыта ли секция.',
        en: 'Custom section heading. Receives `open`, whether the section is open.',
      },
      default: { ru: 'Содержимое секции.', en: 'Section content.' },
    },
  },
};

export default docs;
