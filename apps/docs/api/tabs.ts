import type { DocsMap } from '../.vitepress/reference/reference.types';

const docs: DocsMap = {
  NuiTabs: {
    configurator: {
      scene: 'tabs/Example',
      props: ['variant', 'size', 'orientation', 'activation', 'label'],
      values: { label: { ru: 'Заказы по статусу', en: 'Orders by status' } },
    },
    props: {
      id: {
        ru: 'Идентификатор вкладок. По умолчанию создаётся автоматически.',
        en: 'Id of the tabs. Generated automatically by default.',
      },
      activation: {
        ru: '`automatic` — стрелки сразу открывают вкладку, `manual` — только переводят фокус, открывает Enter.',
        en: '`automatic` opens a tab on arrow keys, `manual` only moves focus until Enter.',
      },
      orientation: {
        ru: 'Располагает вкладки в строку или столбцом.',
        en: 'Lays out the tabs in a row or a column.',
      },
      variant: {
        ru: 'Оформление: `line` подчёркивает выбранную вкладку, `soft` выделяет её фоном.',
        en: 'Style: `line` underlines the selected tab, `soft` gives it a background.',
      },
      size: {
        ru: 'Размер вкладок: `sm`, `md` или `lg`. Высоту каждого размера сдвигает плотность темы.',
        en: 'Changes the size of the tabs: `sm`, `md` or `lg`. The theme density shifts the height of each size.',
      },
      lazy: {
        ru: 'Создаёт содержимое панели, только когда её вкладку открывают впервые.',
        en: 'Renders a panel only when its tab is opened for the first time.',
      },
      tabs: {
        ru: 'Вкладки массивом вместо `NuiTabList` и `NuiTab`.',
        en: 'Tabs as an array instead of `NuiTabList` and `NuiTab`.',
      },
      links: {
        ru: 'Вкладки-ссылки массивом: `to`, `label`, `icon`, `disabled`. Вместо списка вкладок рендерит `nav` со ссылками.',
        en: 'Link tabs as an array of `to`, `label`, `icon` and `disabled`. Renders a `nav` of links instead of a tab list.',
      },
      getKey: {
        ru: 'Ключ вкладки-ссылки по её `to`. По умолчанию строковый адрес служит ключом сам.',
        en: 'Key of a link tab from its `to`. A string address is its own key by default.',
      },
      as: {
        ru: 'Компонент ссылок для `links` вместо общего помощника кита.',
        en: 'Link component for `links` instead of the shared kit helper.',
      },
      label: {
        ru: 'Подпись списка вкладок или навигации для экранных дикторов.',
        en: 'Label of the tab list or the navigation for screen readers.',
      },
    },
    models: {
      'v-model': {
        ru: '`value` выбранной вкладки или ключ текущей вкладки-ссылки.',
        en: '`value` of the selected tab or the key of the current link tab.',
      },
    },
    events: {
      close: {
        ru: 'Срабатывает, когда закрывают вкладку из `tabs`, передаёт её `value`.',
        en: 'Fires when a tab from `tabs` is closed, with its `value`.',
      },
    },
    slots: {
      default: {
        ru: 'Список `NuiTabList` и панели `NuiTabPanel`.',
        en: 'A `NuiTabList` and `NuiTabPanel` panels.',
      },
      panel: {
        ru: 'Содержимое панели для вкладки из `tabs`. Получает `tab`.',
        en: 'Panel content for a tab from `tabs`. Receives `tab`.',
      },
    },
    keyboard: [
      {
        keys: 'ArrowRight',
        description: {
          ru: 'Переходит к следующей вкладке в строке.',
          en: 'Moves to the next tab in a row.',
        },
      },
      {
        keys: 'ArrowLeft',
        description: {
          ru: 'Переходит к предыдущей вкладке в строке.',
          en: 'Moves to the previous tab in a row.',
        },
      },
      {
        keys: 'ArrowDown',
        description: {
          ru: 'Переходит к следующей вкладке в столбце.',
          en: 'Moves to the next tab in a column.',
        },
      },
      {
        keys: 'ArrowUp',
        description: {
          ru: 'Переходит к предыдущей вкладке в столбце.',
          en: 'Moves to the previous tab in a column.',
        },
      },
      {
        keys: 'Home',
        description: { ru: 'Переходит к первой вкладке.', en: 'Moves to the first tab.' },
      },
      {
        keys: 'End',
        description: { ru: 'Переходит к последней вкладке.', en: 'Moves to the last tab.' },
      },
      {
        keys: 'Delete',
        description: { ru: 'Закрывает вкладку с `closable`.', en: 'Closes a `closable` tab.' },
      },
      {
        keys: 'Enter',
        description: {
          ru: 'Открывает вкладку в фокусе, когда `activation` равно `manual`.',
          en: 'Opens the focused tab when `activation` is `manual`.',
        },
      },
      {
        keys: 'Space',
        description: {
          ru: 'Открывает вкладку в фокусе, когда `activation` равно `manual`.',
          en: 'Opens the focused tab when `activation` is `manual`.',
        },
      },
    ],
  },
  NuiTabList: {
    props: {
      label: {
        ru: 'Подпись списка вкладок для экранных дикторов.',
        en: 'Label of the tab list for screen readers.',
      },
    },
    slots: { default: { ru: 'Вкладки `NuiTab`.', en: '`NuiTab` tabs.' } },
  },
  NuiTab: {
    props: {
      value: {
        ru: 'Значение вкладки, которое получит `v-model`.',
        en: 'Value of the tab that `v-model` receives.',
      },
      icon: {
        ru: 'Иконка перед подписью, например `settings`.',
        en: 'Icon before the label, such as `settings`.',
      },
      disabled: {
        ru: 'Отключает вкладку: она видна, но не открывается и не закрывается.',
        en: 'Disables the tab: it stays visible but cannot be opened or closed.',
      },
      closable: {
        ru: 'Показывает крестик. Вкладку закрывают крестиком, средней кнопкой мыши или клавишей Delete.',
        en: 'Shows a close button. The tab closes with it, the middle mouse button or the Delete key.',
      },
    },
    events: {
      close: {
        ru: 'Срабатывает, когда вкладку закрывают. Уберите её из списка сами.',
        en: 'Fires when the tab is closed. Remove it from the list yourself.',
      },
    },
    slots: { default: { ru: 'Текст вкладки.', en: 'Text of the tab.' } },
  },
  NuiTabPanel: {
    props: {
      value: {
        ru: '`value` вкладки, к которой относится панель.',
        en: '`value` of the tab the panel belongs to.',
      },
      lazy: {
        ru: 'Создаёт содержимое, только когда панель открывают впервые.',
        en: 'Renders the content only when the panel is opened for the first time.',
      },
      focusable: {
        ru: 'Делает панель доступной для Tab. Выключите, если в панели всегда есть кнопки или ссылки.',
        en: 'Makes the panel reachable with Tab. Turn it off when the panel always holds buttons or links.',
      },
    },
    slots: { default: { ru: 'Содержимое панели.', en: 'Content of the panel.' } },
  },
};

export default docs;
