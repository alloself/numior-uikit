import type { DocsMap } from '../.vitepress/reference/reference.types';

const docs: DocsMap = {
  NuiContent: {
    props: {
      document: {
        ru: 'Документ редактора или его JSON. JSON проверяется по `schema` перед выводом.',
        en: 'Editor document or its JSON. JSON is checked against `schema` before rendering.',
      },
      schema: {
        ru: 'Схема, по которой читается JSON. По умолчанию — `contentSchema`.',
        en: 'Schema used to read the JSON. Defaults to `contentSchema`.',
      },
      size: { ru: 'Размер текста: `sm`, `md` или `lg`.', en: 'Text size: `sm`, `md` or `lg`.' },
      views: {
        ru: 'Свои компоненты для типов блоков, которые получают свойство `node`. Таблицу с сортировкой и фильтрами даёт `{ table: NuiContentTable }` из `@numior/content/table`, подсветку кода — `{ code_block: NuiContentCode }` из `@numior/content/code`.',
        en: 'Custom components for block types. Each receives the `node` prop. `{ table: NuiContentTable }` from `@numior/content/table` adds sorting and filters, `{ code_block: NuiContentCode }` from `@numior/content/code` highlights code.',
      },
    },
    events: {
      invalid: {
        ru: 'Срабатывает, если JSON не прошёл проверку. Передаёт список ошибок с путями до блоков.',
        en: 'Fires when the JSON fails the check, with the list of errors and their block paths.',
      },
    },
  },
};

export default docs;
