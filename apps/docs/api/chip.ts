import type { DocsMap } from '../.vitepress/reference/reference.types';

const docs: DocsMap = {
  NuiChip: {
    props: {
      tone: {
        ru: 'Семантическая роль; цвета берутся из токенов роли.',
        en: 'Semantic role; colours come from the role tokens.',
      },
      variant: {
        ru: 'Вид чипа: мягкая заливка, контур или сплошной.',
        en: 'Chip look: soft fill, outline or solid.',
      },
      size: { ru: 'Высота чипа: обычная или компактная.', en: 'Chip height: regular or compact.' },
      icon: {
        ru: 'Иконка перед текстом из реестра алиасов.',
        en: 'Icon before the text from the alias registry.',
      },
      removable: {
        ru: 'Кнопка удаления с событием remove.',
        en: 'Remove button with the remove event.',
      },
      removeTabbable: {
        ru: 'Кнопка удаления в порядке табуляции; false для списков, где удаление доступно из поля.',
        en: 'Remove button in the tab order; false for lists where removal is reachable from the field.',
      },
      removeLabel: {
        ru: 'Доступное имя кнопки удаления; по умолчанию из словаря.',
        en: 'Accessible name of the remove button; the dictionary supplies the default.',
      },
      disabled: {
        ru: 'Приглушает чип и выключает удаление.',
        en: 'Dims the chip and disables removal.',
      },
    },
    events: { remove: { ru: 'Нажата кнопка удаления.', en: 'The remove button was pressed.' } },
    slots: { default: { ru: 'Текст чипа.', en: 'Chip text.' } },
    configurator: {
      props: ['tone', 'variant', 'size', 'removable', 'disabled'],
      content: { ru: 'Дизайн-система', en: 'Design system' },
    },
  },
};

export default docs;
