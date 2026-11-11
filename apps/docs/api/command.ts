import type { DocsMap } from '../.vitepress/reference/reference.types';

const dictionary = (ru: string, en: string, ruDefault: string, enDefault: string) => ({
  ru: `${ru}. По умолчанию — «${ruDefault}» из словаря.`,
  en: `${en}. Defaults to "${enDefault}" from the dictionary.`,
});

const docs: DocsMap = {
  NuiCommand: {
    configurator: {
      scene: 'command/Example',
      props: ['placeholder', 'label', 'embedded', 'loading', 'loop'],
      values: {
        placeholder: { ru: 'Найти команду', en: 'Search commands' },
        label: { ru: 'Команды магазина', en: 'Store commands' },
      },
    },
    props: {
      id: {
        ru: 'Атрибут `id` поля поиска. Без него создаётся автоматически.',
        en: 'The `id` attribute of the search input. Generated when omitted.',
      },
      items: {
        ru: 'Команды или группы команд. У команды есть `label`, `value`, `shortcut` и `keywords` для поиска.',
        en: 'Commands or command groups. A command has `label`, `value`, `shortcut` and search `keywords`.',
      },
      selected: {
        ru: 'Значение текущей команды. Она отмечена галочкой и выделена, пока запрос пуст. Выбор другой команды его не меняет.',
        en: 'Value of the current command. It is checked and highlighted while the query is empty. Picking another command keeps it.',
      },
      filter: {
        ru: 'Своя функция отбора команд по запросу. `false` отключает отбор, если команды ищет сервер.',
        en: 'Custom function that matches commands to the query. `false` turns matching off when the server searches.',
      },
      loading: {
        ru: 'Показывает в списке строку «Загрузка».',
        en: 'Shows a "Loading" row in the list.',
      },
      loop: {
        ru: 'Стрелки переходят с последней команды на первую и обратно.',
        en: 'Arrow keys wrap from the last command to the first and back.',
      },
      autofocus: {
        ru: 'Переводит фокус в поле поиска при монтировании.',
        en: 'Focuses the search input on mount.',
      },
      embedded: {
        ru: 'Убирает рамку и скругление. Нужно внутри поповера или диалога, у которых уже есть своя рамка.',
        en: 'Removes the border and radius. Use it inside a popover or a dialog that has its own frame.',
      },
      getKey: {
        ru: 'Функция, которая возвращает ключ значения-объекта. Без неё ключом служит JSON значения.',
        en: 'Function that returns the key of an object value. Without it the JSON of the value is the key.',
      },
      label: dictionary(
        'Подпись поля и списка для экранных дикторов',
        'Input and list label for screen readers',
        'Команды',
        'Commands',
      ),
      placeholder: dictionary(
        'Текст в пустом поле',
        'Text shown in the empty input',
        'Команда или поиск…',
        'Type a command or search…',
      ),
      emptyLabel: dictionary(
        'Текст, когда ничего не нашлось',
        'Text when nothing matches',
        'Ничего не найдено',
        'No results',
      ),
      loadingLabel: {
        ru: 'Текст строки загрузки. По умолчанию — «Загрузка» из словаря списка.',
        en: 'Text of the loading row. Defaults to "Loading" from the list dictionary.',
      },
    },
    models: { 'v-model:query': { ru: 'Текст в поле поиска.', en: 'Text in the search input.' } },
    events: {
      search: {
        ru: 'Срабатывает, когда пользователь меняет запрос. Передаёт текст запроса.',
        en: 'Fires when the user changes the query, with the query text.',
      },
      select: {
        ru: 'Срабатывает при выборе команды. Передаёт выбранную команду.',
        en: 'Fires when a command is selected, with that command.',
      },
    },
    slots: {
      item: {
        ru: 'Своя строка команды. Получает `item` и `active` — выделена ли строка.',
        en: 'Custom command row. Receives `item` and `active`, whether the row is highlighted.',
      },
      end: { ru: 'Содержимое после поля поиска.', en: 'Content after the search input.' },
      footer: {
        ru: 'Строка под списком, например подсказки клавиш.',
        en: 'Row under the list, such as key hints.',
      },
    },
    keyboard: [
      {
        keys: 'ArrowDown',
        description: { ru: 'Выделяет следующую команду.', en: 'Highlights the next command.' },
      },
      {
        keys: 'ArrowUp',
        description: {
          ru: 'Выделяет предыдущую команду.',
          en: 'Highlights the previous command.',
        },
      },
      {
        keys: 'Home',
        description: { ru: 'Выделяет первую команду.', en: 'Highlights the first command.' },
      },
      {
        keys: 'End',
        description: { ru: 'Выделяет последнюю команду.', en: 'Highlights the last command.' },
      },
      {
        keys: 'Enter',
        description: { ru: 'Выбирает выделенную команду.', en: 'Selects the highlighted command.' },
      },
    ],
  },
  NuiCommandDialog: {
    props: {
      id: {
        ru: 'Атрибут `id` поля поиска. Без него создаётся автоматически.',
        en: 'The `id` attribute of the search input. Generated when omitted.',
      },
      items: {
        ru: 'Команды или группы команд. У команды есть `label`, `value`, `shortcut` и `keywords` для поиска.',
        en: 'Commands or command groups. A command has `label`, `value`, `shortcut` and search `keywords`.',
      },
      selected: {
        ru: 'Значение текущей команды. Она отмечена галочкой и выделена, пока запрос пуст. Выбор другой команды его не меняет.',
        en: 'Value of the current command. It is checked and highlighted while the query is empty. Picking another command keeps it.',
      },
      filter: {
        ru: 'Своя функция отбора команд по запросу. `false` отключает отбор, если команды ищет сервер.',
        en: 'Custom function that matches commands to the query. `false` turns matching off when the server searches.',
      },
      loading: {
        ru: 'Показывает в списке строку «Загрузка».',
        en: 'Shows a "Loading" row in the list.',
      },
      loop: {
        ru: 'Стрелки переходят с последней команды на первую и обратно.',
        en: 'Arrow keys wrap from the last command to the first and back.',
      },
      autofocus: {
        ru: 'Переводит фокус в поле поиска при монтировании.',
        en: 'Focuses the search input on mount.',
      },
      getKey: {
        ru: 'Функция, которая возвращает ключ значения-объекта. Без неё ключом служит JSON значения.',
        en: 'Function that returns the key of an object value. Without it the JSON of the value is the key.',
      },
      label: dictionary(
        'Подпись поля и списка для экранных дикторов',
        'Input and list label for screen readers',
        'Команды',
        'Commands',
      ),
      placeholder: dictionary(
        'Текст в пустом поле',
        'Text shown in the empty input',
        'Команда или поиск…',
        'Type a command or search…',
      ),
      emptyLabel: dictionary(
        'Текст, когда ничего не нашлось',
        'Text when nothing matches',
        'Ничего не найдено',
        'No results',
      ),
      loadingLabel: {
        ru: 'Текст строки загрузки. По умолчанию — «Загрузка» из словаря списка.',
        en: 'Text of the loading row. Defaults to "Loading" from the list dictionary.',
      },
      title: dictionary(
        'Заголовок диалога для экранных дикторов',
        'Dialog title for screen readers',
        'Палитра команд',
        'Command palette',
      ),
      hotkey: {
        ru: 'Сочетание клавиш, которое открывает диалог, например `mod+k`. `false` отключает его.',
        en: 'Key combo that opens the dialog, such as `mod+k`. `false` turns it off.',
      },
      closeOnSelect: {
        ru: 'Закрывает диалог после выбора команды.',
        en: 'Closes the dialog after a command is selected.',
      },
    },
    models: {
      'v-model:open': { ru: 'Открыт ли диалог.', en: 'Whether the dialog is open.' },
      'v-model:query': { ru: 'Текст в поле поиска.', en: 'Text in the search input.' },
    },

    events: {
      search: {
        ru: 'Срабатывает, когда пользователь меняет запрос. Передаёт текст запроса.',
        en: 'Fires when the user changes the query, with the query text.',
      },
      select: {
        ru: 'Срабатывает при выборе команды. Передаёт выбранную команду.',
        en: 'Fires when a command is selected, with that command.',
      },
    },
    slots: {
      item: {
        ru: 'Своя строка команды. Получает `item` и `active` — выделена ли строка.',
        en: 'Custom command row. Receives `item` and `active`, whether the row is highlighted.',
      },
      end: { ru: 'Содержимое после поля поиска.', en: 'Content after the search input.' },
      footer: {
        ru: 'Строка под списком, например подсказки клавиш.',
        en: 'Row under the list, such as key hints.',
      },
    },
    keyboard: [
      {
        keys: 'Ctrl+K',
        description: {
          ru: 'Открывает диалог. На Mac — ⌘K. Сочетание меняет `hotkey`.',
          en: 'Opens the dialog. ⌘K on Mac. Change it with `hotkey`.',
        },
      },
      { keys: 'Escape', description: { ru: 'Закрывает диалог.', en: 'Closes the dialog.' } },
      {
        keys: 'Enter',
        description: {
          ru: 'Выбирает команду и закрывает диалог.',
          en: 'Selects the command and closes the dialog.',
        },
      },
    ],
  },
};

export default docs;
