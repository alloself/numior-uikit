import type { DocsMap } from '../.vitepress/reference/reference.types';

const dictionary = (ru: string, en: string, ruDefault: string, enDefault: string) => ({
  ru: `${ru}. По умолчанию — «${ruDefault}» из словаря.`,
  en: `${en}. Defaults to "${enDefault}" from the dictionary.`,
});

const docs: DocsMap = {
  NuiCode: {
    configurator: {
      scene: 'code/Example',
      props: ['title', 'lineNumbers', 'copyable', 'wrap', 'maxLines'],
      values: { title: 'orders.jsonl' },
    },
    props: {
      code: {
        ru: 'Текст кода. Каждый перевод строки начинает новую строку.',
        en: 'Code text. Every newline starts a new line.',
      },
      tokens: {
        ru: 'Готовая подсветка: токены по строкам. С ними подсветчик не вызывается.',
        en: 'Ready highlighting as tokens per line. With them no highlighter runs.',
      },
      language: {
        ru: 'Язык кода, например `ts` или `vue`. Показывается в шапке и задаёт подсветку.',
        en: 'Code language, such as `ts` or `vue`. Shown in the header and used for highlighting.',
      },
      highlighter: {
        ru: 'Подсветка вместо заданной в `createNuiConfig` или встроенного Shiki. `false` выводит код одним цветом.',
        en: 'Highlighter to use instead of the one set in `createNuiConfig` or the built-in Shiki. `false` renders the code in one color.',
      },
      title: {
        ru: 'Имя файла в шапке вместо языка.',
        en: 'File name in the header instead of the language.',
      },
      lineNumbers: {
        ru: 'Нумерует строки слева. Номера не попадают в скопированный текст.',
        en: 'Numbers the lines on the left. The numbers stay out of the copied text.',
      },
      highlight: {
        ru: 'Номера строк, которые выделяются фоном. Счёт идёт с единицы.',
        en: 'Numbers of the lines to highlight with a background, starting at one.',
      },
      copyable: {
        ru: 'Кнопка копирования: в шапке, а без шапки — в углу блока.',
        en: 'Copy button: in the header, or in the corner of the block when there is no header.',
      },
      maxLines: {
        ru: 'Сворачивает код длиннее этого числа строк и добавляет кнопку «Показать всё».',
        en: 'Collapses code longer than this many lines and adds a "Show more" button.',
      },
      wrap: {
        ru: 'Переносит длинные строки вместо горизонтальной прокрутки.',
        en: 'Wraps long lines instead of scrolling horizontally.',
      },
      copyLabel: dictionary(
        'Подпись кнопки копирования для экранных дикторов',
        'Copy button label for screen readers',
        'Скопировать код',
        'Copy code',
      ),
      copiedLabel: dictionary(
        'Сообщение для дикторов после копирования',
        'Screen reader message after copying',
        'Скопировано',
        'Copied',
      ),
      expandLabel: dictionary(
        'Текст кнопки, которая разворачивает код',
        'Text of the button that expands the code',
        'Показать всё',
        'Show more',
      ),
      collapseLabel: dictionary(
        'Текст кнопки, которая сворачивает код',
        'Text of the button that collapses the code',
        'Свернуть',
        'Show less',
      ),
    },
  },
};

export default docs;
