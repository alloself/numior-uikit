import type { DocsMap } from '../.vitepress/reference/reference.types';

const docs: DocsMap = {
  NuiTree: {
    configurator: {
      scene: 'tree/Example',
      props: ['variant', 'size', 'checkable', 'icons', 'loop', 'label'],
      choices: { variant: ['plain', 'divided', 'outline'] },
      values: { variant: 'outline', label: { ru: 'Категории', en: 'Categories' } },
    },
    props: {
      id: {
        ru: 'Идентификатор дерева. По умолчанию создаётся автоматически.',
        en: 'Id of the tree. Generated automatically by default.',
      },
      items: {
        ru: 'Узлы дерева: поля пункта списка вроде `value`, `label` и `icon`, плюс вложенные `children` и `lazy`.',
        en: 'Tree nodes: list item fields such as `value`, `label` and `icon`, plus nested `children` and `lazy`.',
      },
      getKey: {
        ru: 'Функция, которая даёт ключ значению-объекту. Без неё ключом служит JSON значения.',
        en: 'Function that returns a key for an object value. Without it, the JSON of the value is used.',
      },
      variant: {
        ru: 'Оформление: обычное, с разделителями, в рамке или всплывающее.',
        en: 'Style: plain, divided, outline or floating.',
      },
      selectable: {
        ru: 'Выбор узлов: `single` — одного, `multiple` — нескольких, `none` — без выбора. С `checkable` не действует.',
        en: 'Node selection: `single` for one node, `multiple` for several, `none` to turn it off. Ignored with `checkable`.',
      },
      checkable: {
        ru: 'Выбор с вложенными узлами: у узлов появляются флажки, выбор родителя выбирает всех потомков.',
        en: 'Cascading selection: nodes get checkboxes, and selecting a parent selects all its descendants.',
      },
      icons: {
        ru: 'Показывает иконки папок и файлов у узлов без своей иконки.',
        en: 'Shows folder and file icons on nodes without their own icon.',
      },
      virtual: {
        ru: 'Рисует только видимые строки. Нужна `height`.',
        en: 'Renders only the visible rows. Needs `height`.',
      },
      height: {
        ru: 'Высота дерева с прокруткой, например `20rem`.',
        en: 'Height of the scrollable tree, such as `20rem`.',
      },
      itemHeight: {
        ru: 'Высота строки в пикселях. Без неё высота следует из `size`.',
        en: 'Row height in pixels. Without it, the height follows `size`.',
      },
      size: {
        ru: 'Высота строк: `sm`, `md` или `lg`.',
        en: 'Height of the rows: `sm`, `md` or `lg`.',
      },
      loop: {
        ru: 'С последнего узла стрелка переходит на первый и обратно.',
        en: 'Arrow keys wrap from the last node to the first and back.',
      },
      typeahead: {
        ru: 'Переводит фокус на видимый узел по первым набранным буквам.',
        en: 'Moves focus to a visible node when the user types its first letters.',
      },
      loading: { ru: 'Показывает индикатор загрузки.', en: 'Shows a loading indicator.' },
      loadingLabel: {
        ru: 'Текст загрузки. По умолчанию — «Загрузка» из словаря.',
        en: 'Loading text. Defaults to "Loading" from the dictionary.',
      },
      emptyLabel: {
        ru: 'Текст пустого дерева. По умолчанию — «Список пуст» из словаря.',
        en: 'Text of an empty tree. Defaults to "No items" from the dictionary.',
      },
      label: {
        ru: 'Подпись дерева для экранных дикторов.',
        en: 'Label of the tree for screen readers.',
      },
      labelledBy: {
        ru: '`id` элемента, текст которого подписывает дерево.',
        en: '`id` of the element whose text labels the tree.',
      },
    },
    models: {
      'v-model': {
        ru: 'Значение выбранного узла, когда `selectable` равно `single`.',
        en: 'Value of the selected node when `selectable` is `single`.',
      },
      'v-model:values': {
        ru: 'Значения выбранных или отмеченных узлов в порядке дерева.',
        en: 'Values of the selected or checked nodes, in tree order.',
      },
      'v-model:expanded': { ru: 'Значения раскрытых узлов.', en: 'Values of the expanded nodes.' },
    },
    events: {
      select: {
        ru: 'Срабатывает, когда узел выбирают или меняют его отметку.',
        en: 'Fires when a node is selected or its check changes.',
      },
      expand: {
        ru: 'Срабатывает, когда узел раскрывают. У узла с `lazy` приходит сразу, до загрузки детей.',
        en: 'Fires when a node is expanded. For a node with `lazy` it comes at once, before its children load.',
      },
      collapse: {
        ru: 'Срабатывает, когда узел сворачивают.',
        en: 'Fires when a node is collapsed.',
      },
      load: {
        ru: 'Срабатывает, когда раскрыт узел с `lazy`. Загрузите его `children`.',
        en: 'Fires when a node with `lazy` is expanded. Load its `children`.',
      },
    },
    slots: {
      item: {
        ru: 'Своя разметка строки. Получает `item`, `level`, `expanded`, `selected`, `checked` и `loading`. `expanded` становится `true`, когда дети узла показаны.',
        en: 'Custom row markup. Receives `item`, `level`, `expanded`, `selected`, `checked` and `loading`. `expanded` turns `true` once the children of the node are shown.',
      },
      empty: { ru: 'Что показать, когда узлов нет.', en: 'Content shown when there are no nodes.' },
    },
    keyboard: [
      {
        keys: 'ArrowDown',
        description: {
          ru: 'Переходит к следующему доступному узлу.',
          en: 'Moves to the next enabled node.',
        },
      },
      {
        keys: 'ArrowUp',
        description: {
          ru: 'Переходит к предыдущему доступному узлу.',
          en: 'Moves to the previous enabled node.',
        },
      },
      {
        keys: 'ArrowRight',
        description: {
          ru: 'Раскрывает узел или переходит к первому доступному вложенному. При письме справа налево — наоборот.',
          en: 'Expands the node or moves to its first enabled child. Reversed in right-to-left layouts.',
        },
      },
      {
        keys: 'ArrowLeft',
        description: {
          ru: 'Сворачивает узел или переходит к родителю. При письме справа налево — наоборот.',
          en: 'Collapses the node or moves to its parent. Reversed in right-to-left layouts.',
        },
      },
      {
        keys: 'Home',
        description: { ru: 'Переходит к первому узлу.', en: 'Moves to the first node.' },
      },
      {
        keys: 'End',
        description: {
          ru: 'Переходит к последнему видимому узлу.',
          en: 'Moves to the last visible node.',
        },
      },
      {
        keys: 'PageDown',
        description: { ru: 'Переводит фокус на страницу вниз.', en: 'Moves focus one page down.' },
      },
      {
        keys: 'PageUp',
        description: { ru: 'Переводит фокус на страницу вверх.', en: 'Moves focus one page up.' },
      },
      {
        keys: '*',
        description: {
          ru: 'Раскрывает все узлы на уровне текущего.',
          en: 'Expands every node on the level of the current one.',
        },
      },
      {
        keys: 'Enter',
        description: {
          ru: 'Выбирает узел. С выбором нескольких или `checkable` переключает его выбор.',
          en: 'Selects the node. With multiple selection or `checkable`, toggles it.',
        },
      },
      {
        keys: 'Space',
        description: {
          ru: 'Выбирает узел. С выбором нескольких или `checkable` переключает его выбор.',
          en: 'Selects the node. With multiple selection or `checkable`, toggles it.',
        },
      },
    ],
  },
};

export default docs;
