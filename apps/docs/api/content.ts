import type { DocsMap } from '../.vitepress/reference/reference.types';

const docs: DocsMap = {
  NuiContent: {
    props: {
      document: {
        ru: 'Документ редактора или его JSON; JSON читается схемой и проверяется.',
        en: 'An editor document or its JSON; JSON is read and checked through the schema.',
      },
      schema: {
        ru: 'Схема для чтения JSON; по умолчанию contentSchema.',
        en: 'Schema that reads JSON; contentSchema by default.',
      },
      size: { ru: 'Кегль текста.', en: 'Text size.' },
      views: {
        ru: 'Свои компоненты для типов узлов: компонент получает проп node и рисуется вместо разметки схемы. Таблицы данных как NuiTable с сортировкой и фильтрами — { table: NuiContentTable } из @numior/content/table; без этого таблица остаётся обычной <table>.',
        en: 'Own components for node types: the component receives the node prop and replaces the schema markup. Data tables as NuiTable with sorting and filters take { table: NuiContentTable } from @numior/content/table; without it a table stays a plain <table>.',
      },
    },
    events: {
      invalid: {
        ru: 'JSON не прочитан: список проблем с путями узлов.',
        en: 'The JSON could not be read: the problems with node paths.',
      },
    },
  },
};

export default docs;
