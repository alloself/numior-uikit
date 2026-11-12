import type { DocsMap } from '../.vitepress/reference/reference.types';

const docs: DocsMap = {
  NuiChip: {
    props: {
      tone: {
        ru: 'Цвет по смыслу: `primary`, `success`, `warning`, `error` и другие.',
        en: 'Color by meaning: `primary`, `success`, `warning`, `error` and others.',
      },
      variant: {
        ru: 'Оформление: мягкая заливка (`soft`), контур (`outline`) или сплошная заливка (`solid`).',
        en: 'Style: `soft` fill, `outline` or `solid` fill.',
      },
      size: {
        ru: 'Размер: `md` — обычный, `sm` — компактный.',
        en: 'Size: `md` for regular, `sm` for compact.',
      },
      icon: {
        ru: 'Иконка перед текстом.',
        en: 'Icon to display before the text.',
      },
      removable: {
        ru: 'Показывает кнопку удаления. Нажатие вызывает событие `remove`.',
        en: 'Shows a remove button. Pressing it fires the `remove` event.',
      },
      removeTabbable: {
        ru: 'Можно ли перейти к кнопке удаления клавишей Tab. Выключите, если чип удаляется из поля ввода.',
        en: 'Whether Tab reaches the remove button. Turn it off when the chip is removed from an input.',
      },
      removeLabel: {
        ru: 'Подпись кнопки удаления для экранных дикторов. По умолчанию — «Убрать» из словаря.',
        en: 'Remove button label for screen readers. Defaults to "Remove" from the dictionary.',
      },
      disabled: {
        ru: 'Приглушает чип и отключает кнопку удаления.',
        en: 'Dims the chip and disables the remove button.',
      },
    },
    events: {
      remove: {
        ru: 'Срабатывает при нажатии на кнопку удаления.',
        en: 'Fires when the remove button is pressed.',
      },
    },
    slots: { default: { ru: 'Текст чипа.', en: 'Chip text.' } },
    configurator: {
      props: ['tone', 'variant', 'size', 'removable', 'disabled'],
      content: { ru: 'Новинка', en: 'New' },
    },
  },
};

export default docs;
