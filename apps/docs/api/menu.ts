import type { DocsMap } from '../.vitepress/reference/reference.types';

const icon = {
  ru: 'Иконка перед подписью, например `settings`.',
  en: 'Icon before the label, such as `settings`.',
};

const disabled = {
  ru: 'Отключает пункт: он виден, но не выбирается.',
  en: 'Disables the item: it stays visible but cannot be picked.',
};

const select = {
  ru: 'Срабатывает при выборе пункта клавиатурой или мышью.',
  en: 'Fires when the item is picked with the keyboard or the mouse.',
};

const label = { ru: 'Текст пункта.', en: 'Text of the item.' };

const docs: DocsMap = {
  NuiMenu: {
    props: {
      id: {
        ru: 'Идентификатор меню. По умолчанию создаётся автоматически.',
        en: 'Id of the menu. Generated automatically by default.',
      },
      placement: {
        ru: 'С какой стороны триггера открывается меню, например `bottom-start`.',
        en: 'Side of the trigger the menu opens on, such as `bottom-start`.',
      },
      offset: { ru: 'Отступ от триггера в пикселях.', en: 'Distance from the trigger in pixels.' },
      items: {
        ru: 'Пункты меню массивом вместо дочерних компонентов.',
        en: 'Menu entries as an array instead of child components.',
      },
      closeOnSelect: {
        ru: 'Закрывает меню после выбора пункта.',
        en: 'Closes the menu after an item is picked.',
      },
      loop: {
        ru: 'С последнего пункта стрелка переходит на первый и обратно.',
        en: 'Arrow keys wrap from the last item to the first and back.',
      },
      typeahead: {
        ru: 'Переводит фокус на пункт по первым набранным буквам.',
        en: 'Moves focus to an item when the user types its first letters.',
      },
      label: {
        ru: 'Подпись меню для экранных дикторов. Без неё меню подписано текстом триггера.',
        en: 'Menu label for screen readers. Without it, the trigger text labels the menu.',
      },
      compact: {
        ru: 'Убирает минимальную ширину меню. Подходит для пунктов из одних иконок.',
        en: 'Removes the minimum menu width. Suits icon-only items.',
      },
      lazy: {
        ru: 'Создаёт пункты при первом открытии. Подходит для больших меню в таблицах, но не для навигации: на сервере пунктов не будет.',
        en: 'Creates the items on the first open. Suits large menus in tables, not navigation: the server renders no items.',
      },
      anchor: {
        ru: 'Элемент вместо слота `trigger`, например ячейка таблицы. Меню открывается методом `show`, после закрытия фокус возвращается на элемент.',
        en: 'Element in place of the `trigger` slot, such as a table cell. Open the menu with `show`. Focus returns to the element on close.',
      },
    },
    models: { 'v-model:open': { ru: 'Открыто ли меню.', en: 'Whether the menu is open.' } },
    exposed: {
      trigger: {
        ru: 'Элемент кнопки из слота `trigger`, пока меню смонтировано.',
        en: 'The `trigger` slot button element while the menu is mounted.',
      },
      show: {
        ru: 'Открывает меню. С `first` или `last` ставит фокус на первый или последний пункт.',
        en: 'Opens the menu. With `first` or `last`, focuses the first or last item.',
      },
    },
    slots: {
      trigger: {
        ru: 'Кнопка, которая открывает меню. Получает `attrs` для `v-bind` и `open`.',
        en: 'Button that opens the menu. Receives `attrs` for `v-bind` and `open`.',
      },
      default: {
        ru: 'Пункты, группы и разделители меню.',
        en: 'Items, groups and separators of the menu.',
      },
    },
    keyboard: [
      {
        keys: 'ArrowDown',
        description: {
          ru: 'На триггере открывает меню на первом пункте. В меню переходит к следующему пункту.',
          en: 'On the trigger, opens the menu at the first item. Inside, moves to the next item.',
        },
      },
      {
        keys: 'ArrowUp',
        description: {
          ru: 'На триггере открывает меню на последнем пункте. В меню переходит к предыдущему пункту.',
          en: 'On the trigger, opens the menu at the last item. Inside, moves to the previous item.',
        },
      },
      {
        keys: 'Enter',
        description: {
          ru: 'Выбирает пункт или открывает подменю.',
          en: 'Picks the item or opens the submenu.',
        },
      },
      {
        keys: 'Space',
        description: {
          ru: 'Выбирает пункт или открывает подменю.',
          en: 'Picks the item or opens the submenu.',
        },
      },
      {
        keys: 'ArrowRight',
        description: {
          ru: 'Открывает подменю. При письме справа налево — закрывает.',
          en: 'Opens the submenu. Closes it in right-to-left layouts.',
        },
      },
      {
        keys: 'ArrowLeft',
        description: {
          ru: 'Закрывает подменю. При письме справа налево — открывает.',
          en: 'Closes the submenu. Opens it in right-to-left layouts.',
        },
      },
      {
        keys: 'Home',
        description: { ru: 'Переходит к первому пункту.', en: 'Moves to the first item.' },
      },
      {
        keys: 'End',
        description: { ru: 'Переходит к последнему пункту.', en: 'Moves to the last item.' },
      },
      {
        keys: 'Escape',
        description: {
          ru: 'Закрывает открытое подменю или само меню.',
          en: 'Closes the open submenu or the menu itself.',
        },
      },
      { keys: 'Tab', description: { ru: 'Закрывает всё меню.', en: 'Closes the whole menu.' } },
    ],
  },
  NuiMenuItem: {
    props: {
      icon,
      shortcut: {
        ru: 'Сочетание клавиш в конце строки, например `Ctrl+C`.',
        en: 'Keyboard shortcut at the end of the row, such as `Ctrl+C`.',
      },
      disabled,
      tone: {
        ru: 'Цвет пункта: `neutral` или красный `error` для опасных действий вроде удаления.',
        en: 'Colour of the item: `neutral`, or a red `error` for destructive actions such as deleting.',
      },
      closeOnSelect: {
        ru: 'Закрывает меню после выбора. Перекрывает `closeOnSelect` меню.',
        en: 'Closes the menu after picking. Overrides `closeOnSelect` of the menu.',
      },
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
    },
    events: { select },
    slots: {
      default: { ru: 'Текст пункта.', en: 'Text of the item.' },
      trailing: {
        ru: 'Содержимое в конце строки, например галочка.',
        en: 'Content at the end of the row, for example a check mark.',
      },
    },
  },
  NuiMenuCheckboxItem: {
    props: {
      icon,
      disabled,
      closeOnSelect: {
        ru: 'Закрывает меню после переключения.',
        en: 'Closes the menu after toggling.',
      },
    },
    models: { 'v-model:checked': { ru: 'Отмечен ли пункт.', en: 'Whether the item is checked.' } },
    events: { select },
    slots: { default: label },
  },
  NuiMenuRadioGroup: {
    models: { 'v-model': { ru: 'Значение выбранного пункта.', en: 'Value of the selected item.' } },
    slots: { default: { ru: 'Пункты `NuiMenuRadioItem`.', en: '`NuiMenuRadioItem` items.' } },
  },
  NuiMenuRadioItem: {
    props: {
      value: {
        ru: 'Значение, которое получит `v-model` группы.',
        en: 'Value the group `v-model` receives.',
      },
      icon,
      disabled,
      closeOnSelect: { ru: 'Закрывает меню после выбора.', en: 'Closes the menu after picking.' },
    },
    events: { select },
    slots: { default: label },
  },
  NuiMenuLabel: {
    slots: { default: { ru: 'Текст заголовка группы.', en: 'Group heading text.' } },
  },
  NuiMenuSeparator: {},
  NuiMenuSub: {
    props: {
      id: {
        ru: 'Идентификатор подменю. По умолчанию создаётся автоматически.',
        en: 'Id of the submenu. Generated automatically by default.',
      },
      label: {
        ru: 'Подпись пункта, открывающего подменю.',
        en: 'Label of the item that opens the submenu.',
      },
      icon,
      disabled,
      openDelay: {
        ru: 'Через сколько миллисекунд после наведения открывается подменю.',
        en: 'Delay in milliseconds before the submenu opens on hover.',
      },
      closeDelay: {
        ru: 'Через сколько миллисекунд после ухода курсора подменю закрывается.',
        en: 'Delay in milliseconds before the submenu closes after the pointer leaves.',
      },
    },
    slots: {
      label: {
        ru: 'Разметка подписи вместо текста `label`.',
        en: 'Label markup in place of the `label` text.',
      },
      default: { ru: 'Пункты подменю.', en: 'Submenu items.' },
    },
  },
};

export default docs;
