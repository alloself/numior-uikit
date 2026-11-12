import type { DocsMap } from '../.vitepress/reference/reference.types';

const route = {
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
};

const docs: DocsMap = {
  NuiList: {
    configurator: {
      scene: 'list/Example',
      props: ['variant', 'size', 'selectable', 'loading', 'loop', 'label'],
      choices: { variant: ['plain', 'divided', 'outline'] },
      values: { variant: 'outline', label: { ru: 'Команда магазина', en: 'Store team' } },
    },
    props: {
      id: {
        ru: 'Идентификатор списка. По умолчанию создаётся автоматически.',
        en: 'Id of the list. Generated automatically by default.',
      },
      as: {
        ru: 'Тег списка: `ul` или нумерованный `ol`.',
        en: 'List tag: `ul` or the numbered `ol`.',
      },
      variant: {
        ru: 'Оформление списка: обычный, с разделителями, в рамке, всплывающий или навигация.',
        en: 'Style of the list: plain, divided, outline, floating or nav.',
      },
      size: {
        ru: 'Высота строк: `sm`, `md` или `lg`.',
        en: 'Height of the rows: `sm`, `md` or `lg`.',
      },
      items: {
        ru: 'Пункты и группы списка массивом вместо слота.',
        en: 'Items and groups as an array instead of the slot.',
      },
      selectable: {
        ru: 'Включает выбор пунктов: `single` — одного, `multiple` — нескольких.',
        en: 'Turns on item selection: `single` for one item, `multiple` for several.',
      },
      getKey: {
        ru: 'Функция, которая даёт ключ значению-объекту. Без неё ключом служит JSON значения.',
        en: 'Function that returns a key for an object value. Without it, the JSON of the value is used.',
      },
      loop: {
        ru: 'С последнего пункта стрелка переходит на первый и обратно.',
        en: 'Arrow keys wrap from the last item to the first and back.',
      },
      typeahead: {
        ru: 'Переводит фокус на пункт по первым набранным буквам.',
        en: 'Moves focus to an item when the user types its first letters.',
      },
      keyboard: {
        ru: 'Список сам обрабатывает стрелки. Выключите, если клавиатурой управляет поле снаружи, как в селекте.',
        en: 'The list handles arrow keys itself. Turn it off when an outer field, such as a select, drives the keyboard.',
      },
      activeId: {
        ru: '`id` подсвеченного пункта, когда клавиатурой управляет поле снаружи. Его даёт `optionElementId(listId, index)`; обратно номер пункта возвращает `optionIndexOf(element)`.',
        en: '`id` of the highlighted item while an outer field drives the keyboard. `optionElementId(listId, index)` builds it; `optionIndexOf(element)` gives the index back.',
      },
      loading: {
        ru: 'Показывает индикатор загрузки вместо пунктов.',
        en: 'Shows a loading indicator in place of the items.',
      },
      loadingLabel: {
        ru: 'Текст загрузки. По умолчанию — «Загрузка» из словаря.',
        en: 'Loading text. Defaults to "Loading" from the dictionary.',
      },
      label: {
        ru: 'Подпись списка для экранных дикторов.',
        en: 'Label of the list for screen readers.',
      },
      labelledBy: {
        ru: '`id` элемента, текст которого подписывает список.',
        en: '`id` of the element whose text labels the list.',
      },
      emptyLabel: {
        ru: 'Текст пустого списка. По умолчанию — «Список пуст» из словаря.',
        en: 'Text of an empty list. Defaults to "No items" from the dictionary.',
      },
      linkAs: {
        ru: 'Компонент ссылки для пунктов с `to` вместо роутера приложения.',
        en: 'Link component for items with `to` in place of the app router.',
      },
    },
    models: {
      'v-model': {
        ru: 'Выбранное значение, когда `selectable` равно `single`.',
        en: 'Selected value when `selectable` is `single`.',
      },
      'v-model:values': {
        ru: 'Выбранные значения, когда `selectable` равно `multiple`.',
        en: 'Selected values when `selectable` is `multiple`.',
      },
    },
    events: {
      select: {
        ru: 'Срабатывает при выборе пункта из `items`, передаёт пункт.',
        en: 'Fires when an item from `items` is picked, with the item.',
      },
    },
    slots: {
      item: {
        ru: 'Своя разметка пункта из `items`. Получает `item`, `selected` и `active`.',
        en: 'Custom markup of an item from `items`. Receives `item`, `selected` and `active`.',
      },
      leading: {
        ru: 'Содержимое перед текстом пункта из `items` вместо иконки, например аватар.',
        en: 'Content before the text of an item from `items` in place of the icon, such as an avatar.',
      },
      default: { ru: 'Пункты `NuiListItem`.', en: '`NuiListItem` items.' },
      empty: {
        ru: 'Что показать, когда пунктов нет.',
        en: 'Content shown when there are no items.',
      },
    },
    keyboard: [
      {
        keys: 'ArrowDown',
        description: {
          ru: 'Переходит к следующему пункту в списке с выбором.',
          en: 'Moves to the next item in a selectable list.',
        },
      },
      {
        keys: 'ArrowUp',
        description: {
          ru: 'Переходит к предыдущему пункту в списке с выбором.',
          en: 'Moves to the previous item in a selectable list.',
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
        keys: 'Enter',
        description: {
          ru: 'Выбирает пункт. При выборе нескольких снимает или ставит отметку.',
          en: 'Selects the item. With multiple selection, toggles it.',
        },
      },
      {
        keys: 'Space',
        description: {
          ru: 'Выбирает пункт. При выборе нескольких снимает или ставит отметку.',
          en: 'Selects the item. With multiple selection, toggles it.',
        },
      },
    ],
  },
  NuiListItem: {
    props: {
      value: {
        ru: 'Значение пункта в списке с выбором.',
        en: 'Value of the item in a selectable list.',
      },
      id: {
        ru: 'Идентификатор пункта. По умолчанию создаётся автоматически.',
        en: 'Id of the item. Generated automatically by default.',
      },
      label: { ru: 'Текст пункта вместо слота.', en: 'Text of the item in place of the slot.' },
      description: {
        ru: 'Пояснение второй строкой под подписью.',
        en: 'Secondary text under the label.',
      },
      icon: {
        ru: 'Иконка перед подписью, например `settings`.',
        en: 'Icon before the label, such as `settings`.',
      },
      ...route,
      interactive: {
        ru: 'Делает пункт кнопкой, когда у него нет ссылки и значения.',
        en: 'Makes the item a button when it has no link or value.',
      },
      disabled: {
        ru: 'Отключает пункт: он виден, но не выбирается.',
        en: 'Disables the item: it stays visible but cannot be picked.',
      },
      current: {
        ru: 'Отмечает пункт навигации как текущую страницу.',
        en: 'Marks the navigation item as the current page.',
      },
      badge: {
        ru: 'Счётчик или метка в конце строки, например `12`.',
        en: 'Counter or tag at the end of the row, such as `12`.',
      },
      shortcut: {
        ru: 'Сочетание клавиш в конце строки, например `Ctrl+S`.',
        en: 'Keyboard shortcut at the end of the row, such as `Ctrl+S`.',
      },
    },
    slots: {
      leading: {
        ru: 'Содержимое перед подписью, например аватар.',
        en: 'Content before the label, such as an avatar.',
      },
      default: { ru: 'Текст пункта.', en: 'Text of the item.' },
      description: { ru: 'Разметка пояснения под подписью.', en: 'Markup of the secondary text.' },
      trailing: { ru: 'Содержимое в конце строки.', en: 'Content at the end of the row.' },
      nested: {
        ru: 'Содержимое под строкой во всю ширину, например вложенный список.',
        en: 'Full-width content under the row, such as a nested list.',
      },
    },
    exposed: {
      action: {
        ru: 'DOM-элемент ссылки или кнопки пункта.',
        en: 'DOM element of the item link or button.',
      },
    },
  },
};

export default docs;
