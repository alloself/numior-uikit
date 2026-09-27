import type { DocsMap } from '../.vitepress/reference/reference.types';

const dictionary = (ru: string, en: string) => ({
  ru: `${ru}; по умолчанию из словаря.`,
  en: `${en}; the dictionary supplies the default.`,
});

const docs: DocsMap = {
  NuiCode: {
    props: {
      code: {
        ru: 'Исходный текст; строки делятся по переводу строки.',
        en: 'The source text; lines split on newlines.',
      },
      tokens: {
        ru: 'Токены подсветки по строкам; без них код выводится одним цветом.',
        en: 'Highlight tokens per line; without them the code renders in one colour.',
      },
      language: { ru: 'Подпись языка в шапке.', en: 'Language caption in the header.' },
      title: { ru: 'Имя файла в шапке.', en: 'File name in the header.' },
      lineNumbers: { ru: 'Номера строк.', en: 'Line numbers.' },
      highlight: {
        ru: 'Номера подсвеченных строк, с единицы.',
        en: 'Numbers of the highlighted lines, starting at one.',
      },
      copyable: { ru: 'Кнопка копирования.', en: 'Copy button.' },
      maxLines: {
        ru: 'Сворачивает код длиннее этого числа строк.',
        en: 'Collapses code longer than this many lines.',
      },
      wrap: {
        ru: 'Переносит длинные строки вместо горизонтальной прокрутки.',
        en: 'Wraps long lines instead of scrolling horizontally.',
      },
      copyLabel: dictionary('Имя кнопки копирования', 'Name of the copy button'),
      copiedLabel: dictionary('Текст после копирования', 'Text after copying'),
      expandLabel: dictionary('Текст кнопки разворота', 'Text of the expand button'),
      collapseLabel: dictionary('Текст кнопки сворачивания', 'Text of the collapse button'),
    },
  },
};

export default docs;
