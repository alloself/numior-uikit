import type { DocsMap } from '../.vitepress/reference/reference.types';

const content = (ru: string, en: string) => ({ default: { ru, en } });

const docs: DocsMap = {
  NuiSidebar: {
    props: {
      collapsible: {
        ru: 'Как сворачивается панель: `icon` — до полосы иконок, `offcanvas` — уходит за край, `none` — не сворачивается.',
        en: 'How the sidebar collapses: `icon` to an icon rail, `offcanvas` off the screen edge, `none` not at all.',
      },
      side: {
        ru: 'Сторона панели: `start` или `end`. При письме справа налево стороны меняются местами.',
        en: 'Side of the sidebar: `start` or `end`. Sides swap in right-to-left layouts.',
      },
      variant: {
        ru: 'Оформление: `panel` — с фоном и рамкой, `plain` — без них, `inset` — страница в карточке рядом, `floating` — плавающая карточка.',
        en: 'Style: `panel` with a background and border, `plain` without them, `inset` with the page in a card, `floating` as a floating card.',
      },
      marker: {
        ru: 'Чем отмечен текущий пункт при `variant="plain"`: `line` — цветом текста у линии группы, `square` — квадратом перед пунктом. По умолчанию `line`.',
        en: 'How the current item is marked with `variant="plain"`: `line` by text colour next to the group rule, `square` by a square before the item. Defaults to `line`.',
      },
      label: {
        ru: 'Подпись панели для экранных дикторов. По умолчанию — «Навигация» из словаря.',
        en: 'Sidebar label for screen readers. Defaults to "Navigation" from the dictionary.',
      },
      title: {
        ru: 'Заголовок выдвижной панели на узком экране. По умолчанию равен `label`.',
        en: 'Title of the drawer on a narrow screen. Defaults to `label`.',
      },
      closeLabel: {
        ru: 'Подпись кнопки закрытия на узком экране для экранных дикторов. По умолчанию — «Закрыть».',
        en: 'Close button label on a narrow screen for screen readers. Defaults to "Close".',
      },
    },
    slots: content(
      'Части панели: `NuiSidebarHeader`, `NuiSidebarContent` и `NuiSidebarFooter`.',
      'Parts of the sidebar: `NuiSidebarHeader`, `NuiSidebarContent` and `NuiSidebarFooter`.',
    ),
  },
  NuiSidebarHeader: {
    slots: content(
      'Логотип или переключатель рабочего пространства.',
      'Logo or workspace switcher.',
    ),
  },
  NuiSidebarContent: {
    props: {
      label: {
        ru: 'Подпись навигации для экранных дикторов, например «Разделы».',
        en: 'Navigation label for screen readers, such as "Sections".',
      },
    },
    slots: content('Группы пунктов `NuiSidebarGroup`.', '`NuiSidebarGroup` groups of items.'),
  },
  NuiSidebarFooter: {
    slots: content(
      'Профиль или настройки внизу панели.',
      'Profile or settings at the bottom of the sidebar.',
    ),
  },
  NuiSidebarGroup: {
    props: {
      id: {
        ru: 'Идентификатор группы. По умолчанию создаётся автоматически.',
        en: 'Id of the group. Generated automatically by default.',
      },
      label: {
        ru: 'Заголовок группы, например «Проекты».',
        en: 'Heading of the group, such as "Projects".',
      },
      items: {
        ru: 'Пункты группы массивом вместо слота.',
        en: 'Items of the group as an array instead of the slot.',
      },
      collapsible: {
        ru: 'Добавляет в заголовок кнопку, которая сворачивает группу.',
        en: 'Adds a button to the heading that collapses the group.',
      },
    },
    models: {
      'v-model:open': {
        ru: 'Раскрыта ли группа с `collapsible`.',
        en: 'Whether a `collapsible` group is expanded.',
      },
    },
    slots: content(
      'Пункты `NuiSidebarItem` и подсписки `NuiSidebarSub`.',
      '`NuiSidebarItem` items and `NuiSidebarSub` sub lists.',
    ),
  },
  NuiSidebarItem: {
    props: {
      label: {
        ru: 'Текст пункта. В полосе иконок его по-прежнему читают экранные дикторы.',
        en: 'Text of the item. In the icon rail, screen readers still announce it.',
      },
      icon: { ru: 'Иконка пункта, например `home`.', en: 'Icon of the item, such as `home`.' },
      href: {
        ru: 'Адрес, по которому ведёт пункт. Пункт становится ссылкой.',
        en: 'Address the item points to. The item becomes a link.',
      },
      to: {
        ru: 'Маршрут для `RouterLink`, `NuxtLink` или ссылки из конфигурации. Без роутера строка становится `href`.',
        en: 'Route for `RouterLink`, `NuxtLink` or the configured link. Without a router, a string becomes `href`.',
      },
      as: {
        ru: 'Компонент ссылки для `to` вместо роутера приложения.',
        en: 'Link component for `to` in place of the app router.',
      },
      current: {
        ru: 'Отмечает пункт как текущую страницу.',
        en: 'Marks the item as the current page.',
      },
      disabled: {
        ru: 'Отключает пункт: он виден, но не нажимается.',
        en: 'Disables the item: it stays visible but cannot be clicked.',
      },
      badge: {
        ru: 'Счётчик или метка в конце строки, например `12`.',
        en: 'Counter or tag at the end of the row, such as `12`.',
      },
      tooltip: {
        ru: 'Текст подсказки в полосе иконок. По умолчанию — `label`.',
        en: 'Tooltip text in the icon rail. Defaults to `label`.',
      },
    },
    slots: {
      default: {
        ru: 'Разметка подписи вместо текста `label`.',
        en: 'Label markup in place of the `label` text.',
      },
      trailing: { ru: 'Содержимое в конце строки.', en: 'Content at the end of the row.' },
    },
  },
  NuiSidebarSub: {
    props: {
      label: {
        ru: 'Текст кнопки, которая раскрывает подсписок.',
        en: 'Text of the button that expands the sub list.',
      },
      icon: { ru: 'Иконка кнопки подсписка.', en: 'Icon of the sub list button.' },
      active: {
        ru: 'Подсвечивает кнопку, когда в подсписке есть текущая страница.',
        en: 'Highlights the button when the sub list holds the current page.',
      },
      id: {
        ru: 'Идентификатор подсписка. По умолчанию создаётся автоматически.',
        en: 'Id of the sub list. Generated automatically by default.',
      },
    },
    models: {
      'v-model:open': {
        ru: 'Раскрыт ли подсписок. В полосе иконок подсписок открывается всплывающим окном, и значение не меняется.',
        en: 'Whether the sub list is expanded. In the icon rail, it opens as a flyout and the value stays the same.',
      },
    },
    slots: content('Пункты подсписка.', 'Sub list items.'),
    keyboard: [
      {
        keys: '→ / Enter / Space',
        description: {
          ru: 'В полосе иконок открывает всплывающее окно и ставит фокус на первый пункт.',
          en: 'In the icon rail, opens the flyout and focuses its first item.',
        },
      },
      {
        keys: '↑ / ↓',
        description: {
          ru: 'Переходит между пунктами всплывающего окна.',
          en: 'Moves between the flyout items.',
        },
      },
      {
        keys: 'Esc / ←',
        description: {
          ru: 'Закрывает всплывающее окно и возвращает фокус на кнопку подсписка.',
          en: 'Closes the flyout and returns focus to the sub list button.',
        },
      },
    ],
  },
  NuiSidebarTrigger: {
    props: {
      label: {
        ru: 'Подпись кнопки для экранных дикторов. По умолчанию — «Переключить боковую панель».',
        en: 'Button label for screen readers. Defaults to "Toggle sidebar".',
      },
    },
  },
};

export default docs;
