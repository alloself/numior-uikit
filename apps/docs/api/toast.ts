import type { DocsMap } from '../.vitepress/reference/reference.types';

const closeLabel = {
  ru: 'Подпись кнопки закрытия для экранных дикторов. По умолчанию — «Закрыть» из словаря.',
  en: 'Close button label for screen readers. Defaults to "Close" from the dictionary.',
};

const docs: DocsMap = {
  NuiToaster: {
    props: {
      id: {
        ru: 'Идентификатор области уведомлений. По умолчанию создаётся автоматически.',
        en: 'Id of the notification area. Generated automatically by default.',
      },
      placement: {
        ru: 'Где на экране появляются уведомления: сверху или снизу, слева, по центру или справа.',
        en: 'Where toasts appear: top or bottom, at the start, center or end.',
      },
      expand: {
        ru: 'Всегда показывает уведомления списком. Без него стопка раскрывается при наведении.',
        en: 'Always shows the toasts as a list. Otherwise the stack expands on hover.',
      },
      label: {
        ru: 'Подпись области для экранных дикторов. По умолчанию — «Уведомления» из словаря.',
        en: 'Area label for screen readers. Defaults to "Notifications" from the dictionary.',
      },
      closeLabel,
    },
    slots: {
      default: {
        ru: 'Своя разметка уведомления. Получает `toast` и функцию `dismiss`.',
        en: 'Custom toast markup. Receives `toast` and a `dismiss` function.',
      },
    },
  },
  NuiToast: {
    props: {
      toast: {
        ru: 'Уведомление из хранилища: заголовок, текст, цвет и действие.',
        en: 'Toast from the store: title, description, tone and action.',
      },
      closeLabel,
    },
  },
};

export default docs;
