import type { DocsMap } from '../.vitepress/reference/reference.types';

const docs: DocsMap = {
  NuiAvatar: {
    props: {
      src: {
        ru: 'Адрес картинки. Если она не загрузится, покажутся инициалы.',
        en: 'Image URL. If it fails to load, the initials show instead.',
      },
      alt: {
        ru: 'Подпись картинки для экранных дикторов. По умолчанию — `name`.',
        en: 'Image label for screen readers. Defaults to `name`.',
      },
      name: {
        ru: 'Имя человека. Из него берутся инициалы и подпись для дикторов.',
        en: 'Name of the person. It gives the initials and the screen reader label.',
      },
      size: { ru: 'Размер: `sm`, `md`, `lg` или `xl`.', en: 'Size: `sm`, `md`, `lg` or `xl`.' },
      shape: {
        ru: 'Форма: круг (`circle`) или квадрат со скруглёнными углами (`square`).',
        en: 'Shape: `circle` or rounded `square`.',
      },
      status: {
        ru: 'Показывает точку статуса: `online`, `offline`, `busy` или `away`. Подпись берётся из словаря.',
        en: 'Shows a status dot: `online`, `offline`, `busy` or `away`, labelled from the dictionary.',
      },
      statusLabel: {
        ru: 'Своя подпись точки статуса вместо словарной.',
        en: 'Custom status dot label instead of the dictionary one.',
      },
      icon: {
        ru: 'Иконка, когда нет ни картинки, ни имени.',
        en: 'Icon to display when there is neither an image nor a name.',
      },
    },
    slots: {
      default: { ru: 'Содержимое вместо инициалов.', en: 'Content instead of the initials.' },
      badge: { ru: 'Бейдж в углу аватара.', en: 'Badge in the corner of the avatar.' },
    },
    configurator: {
      props: ['size', 'shape', 'status', 'name'],
      values: { name: { ru: 'Анна Титова', en: 'Anna Titova' } },
    },
  },
  NuiAvatarGroup: {
    props: {
      items: {
        ru: 'Аватары списком объектов с полями `src`, `alt` и `name`.',
        en: 'Avatars as a list of objects with `src`, `alt` and `name`.',
      },
      max: {
        ru: 'Сколько аватаров показать. Остальные заменяет счётчик «+N».',
        en: 'How many avatars to show. A "+N" counter replaces the rest.',
      },
      size: { ru: 'Размер всех аватаров группы.', en: 'Size of every avatar in the group.' },
      shape: { ru: 'Форма всех аватаров группы.', en: 'Shape of every avatar in the group.' },
      label: {
        ru: 'Подпись группы для экранных дикторов.',
        en: 'Group label for screen readers.',
      },
      overflowLabel: {
        ru: 'Функция, которая строит текст счётчика по числу скрытых аватаров. По умолчанию — «+N».',
        en: 'Function that builds the counter text from the number of hidden avatars. Defaults to "+N".',
      },
    },
  },
};

export default docs;
