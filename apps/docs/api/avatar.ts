import type { DocsMap } from '../.vitepress/reference/reference.types';

const docs: DocsMap = {
  NuiAvatar: {
    props: {
      src: {
        ru: 'Адрес картинки; после ошибки загрузки показываются инициалы.',
        en: 'Image address; after a load error the initials show.',
      },
      alt: {
        ru: 'Доступное имя картинки; по умолчанию name.',
        en: 'Accessible name of the image; name by default.',
      },
      name: {
        ru: 'Имя для инициалов и доступного имени.',
        en: 'Name for the initials and the accessible name.',
      },
      size: { ru: 'Размер от sm до xl.', en: 'Size from sm to xl.' },
      shape: { ru: 'Круг или квадрат со скруглением.', en: 'A circle or a rounded square.' },
      status: {
        ru: 'Точка состояния с подписью из словаря.',
        en: 'Status dot with a label from the dictionary.',
      },
      statusLabel: { ru: 'Своя подпись точки состояния.', en: 'Custom label of the status dot.' },
      icon: {
        ru: 'Иконка, когда нет ни картинки, ни имени.',
        en: 'Icon when there is neither an image nor a name.',
      },
    },
    slots: {
      default: { ru: 'Содержимое вместо инициалов.', en: 'Content instead of the initials.' },
      badge: { ru: 'Бейдж в углу.', en: 'Badge in the corner.' },
    },
    configurator: {
      props: ['size', 'shape', 'status', 'name'],
      values: { name: { ru: 'Анна Титова', en: 'Anna Titova' } },
    },
  },
  NuiAvatarGroup: {
    props: {
      items: { ru: 'Аватары данными: src, alt, name.', en: 'Avatars as data: src, alt, name.' },
      max: {
        ru: 'Сколько показывать; остальные сворачиваются в «+N».',
        en: 'How many to show; the rest collapse into "+N".',
      },
      size: { ru: 'Общий размер аватаров.', en: 'Shared size of the avatars.' },
      shape: { ru: 'Общая форма аватаров.', en: 'Shared shape of the avatars.' },
      label: { ru: 'Доступное имя группы.', en: 'Accessible name of the group.' },
      overflowLabel: {
        ru: 'Функция текста переполнения по числу скрытых.',
        en: 'Function that formats the overflow text from the hidden count.',
      },
    },
  },
};

export default docs;
