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
