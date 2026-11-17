import type { DocsMap } from '../.vitepress/reference/reference.types';
import { fieldControl } from './shared/field.ts';

const docs: DocsMap = {
  NuiEditor: {
    props: {
      ...fieldControl,
      readonly: {
        ru: 'Показывает документ без возможности правки. Текст можно выделить и скопировать, поле получает фокус. Кнопки из `selectionActions` остаются доступны.',
        en: 'Shows the document without editing. The text can still be selected and copied, and the field takes focus. Buttons from `selectionActions` stay available.',
      },
      schema: {
        ru: 'Схема документа: какие блоки и стили допустимы. По умолчанию — `contentSchema` из `@numior/kit/content`.',
        en: 'Document schema: which blocks and styles are allowed. Defaults to `contentSchema` from `@numior/kit/content`.',
      },
      placeholder: {
        ru: 'Текст в пустом документе.',
        en: 'Text shown in an empty document.',
      },
      autofocus: {
        ru: 'Переводит фокус в редактор после монтирования.',
        en: 'Focuses the editor once it is mounted.',
      },
      toolbar: {
        ru: 'Панель форматирования: `fixed` — над текстом, `bubble` — над выделением, `both` — обе, `none` — без панели. Тип блока выбирается в панели над выделением, а в верхней — в режиме `fixed` и в `both` на сенсорных экранах. Кнопка «+» верхней панели вставляет блок под курсором.',
        en: 'Formatting bar: `fixed` above the text, `bubble` over the selection, `both`, or `none`. The block type is picked in the bar over the selection, and in the top bar with `fixed` and with `both` on touch screens. The + button in the top bar inserts a block below the caret.',
      },
      colours: {
        ru: 'Цвета текста в меню, например `red` или `blue`. По умолчанию — все девять. Цвета, которые уже есть в документе, сохраняются.',
        en: 'Text colors in the menu, such as `red` or `blue`. All nine by default. Colors already in the document stay.',
      },
      upload: {
        ru: 'Функция загрузки `(file, { onProgress, signal }) => Promise<{ url }>`. С ней файлы и картинки можно вставить, перетащить или выбрать в меню «/» и «+». Без неё — только по ссылке.',
        en: 'Upload function `(file, { onProgress, signal }) => Promise<{ url }>`. With it, files and images can be pasted, dropped or picked in the slash menu and the + menu. Without it, only by link.',
      },
      accept: {
        ru: 'Какие файлы можно загрузить, в формате атрибута `accept`, например `image/*`.',
        en: 'File types that can be uploaded, in the `accept` attribute format, such as `image/*`.',
      },
      maxSize: {
        ru: 'Наибольший размер загружаемого файла в байтах.',
        en: 'Largest upload size in bytes.',
      },
      maxHeight: {
        ru: 'Наибольшая высота области текста (CSS-длина): дальше документ прокручивается внутри редактора, панель остаётся на месте.',
        en: 'Largest height of the text area (a CSS length): beyond it the document scrolls inside the editor and the toolbar stays put.',
      },
      format: {
        ru: 'Что хранит `v-model`: `html` — строку разметки, `json` — документ в JSON.',
        en: 'What `v-model` holds: `html` for a markup string, `json` for a JSON document.',
      },
      embeds: {
        ru: 'Какие ссылки встраиваются окном: `youtube`, `vimeo`, `loom`, `figma`, `maps`, `codepen` или свои правила `{ id, label, aspect, source(url) }`. Без свойства встраивания выключены.',
        en: 'Links that embed as a frame: `youtube`, `vimeo`, `loom`, `figma`, `maps`, `codepen` or custom rules `{ id, label, aspect, source(url) }`. Without the prop embeds are off.',
      },
      linkMetadata: {
        ru: 'Функция `(url, { signal }) => Promise<{ title, description, image, icon, site }>` для карточек ссылок. Без неё карточка показывает только адрес и домен.',
        en: 'Function `(url, { signal }) => Promise<{ title, description, image, icon, site }>` for link cards. Without it a card shows only the URL and the domain.',
      },
      mentions: {
        ru: 'Поиск людей для упоминаний: `(query, { signal }) => Promise<{ id, label, description?, avatar? }[]>`. С ним «@» открывает список у курсора, без него это обычный символ.',
        en: 'People search for mentions: `(query, { signal }) => Promise<{ id, label, description?, avatar? }[]>`. With it, @ opens a list at the caret. Without it, @ is plain text.',
      },
      plugins: {
        ru: 'Дополнительные плагины ядра, читается при монтировании. Через него подключается совместная работа.',
        en: 'Extra core plugins, read on mount. Collaboration connects through it.',
      },
      ids: {
        ru: 'Источник id новых узлов. В совместной работе у каждого клиента свой.',
        en: 'The source of ids for new nodes. Each client has its own in collaboration.',
      },
      highlighter: {
        ru: 'Подсветка блоков кода вместо заданной в `createNuiConfig`. `false` выводит код одним цветом.',
        en: 'Highlighter for code blocks instead of the one set in `createNuiConfig`. `false` renders code in one color.',
      },
      blocks: {
        ru: 'Свои блоки из `defineBlock`: компонент, клавиши, пункты меню «/» и меню блока; читаются один раз при монтировании. Контекст блока сообщает место внутри него через `setSpot(part)` и `leaveSpot()`, а `peers()` отдаёт места участников. Так таблица документа показывает ячейки соавторов.',
        en: 'Custom blocks from `defineBlock`, read once on mount: a component, keys, slash menu items and block menu items. The block context reports a place inside the block with `setSpot(part)` and `leaveSpot()`, and `peers()` returns where others are. This is how the document table shows the cells of co-authors.',
      },
      blockHandles: {
        ru: 'Показывает ручку у блока под указателем: меню блока и перетаскивание. Ctrl+Shift+↑ и ↓ переносят блок с курсором.',
        en: 'Shows a handle on the block under the pointer, with a block menu and dragging. Ctrl+Shift+Up and Down move the block with the caret.',
      },
      highlights: {
        ru: 'Цвета фонового выделения в меню. По умолчанию — все девять.',
        en: 'Background highlight colors in the menu. All nine by default.',
      },
      selectionActions: {
        ru: 'Свои кнопки для выделенного текста: в панели над выделением и в панели инструментов. Кнопка отключена, пока команда неприменима. В режиме `readonly` показываются только они: над выделением, а на сенсорном экране — в панели.',
        en: 'Your own buttons for selected text, in the bar over the selection and in the toolbar. A button is disabled while its command does not apply. In `readonly` mode only these are shown: over the selection, or in the toolbar on a touch screen.',
      },
    },
    models: {
      'v-model': {
        ru: 'Документ в формате из `format`. HTML обновляется через 300 мс после правки, JSON — в следующем кадре, а при уходе фокуса, отправке формы и `editor.flush()` — сразу. Новое значение снаружи сбрасывает историю отмены.',
        en: 'The document in the `format` encoding. HTML updates 300 ms after an edit, JSON on the next frame, and both right away on blur, form submit and `editor.flush()`. A value set from outside resets the undo history.',
      },
    },
    events: {
      change: {
        ru: 'Срабатывает после правки, не чаще раза за кадр. Передаёт документ в JSON.',
        en: 'Fires after an edit, at most once per frame, with the document as JSON.',
      },
      focus: {
        ru: 'Срабатывает, когда редактор получает фокус.',
        en: 'Fires when the editor gets focus.',
      },
      blur: {
        ru: 'Срабатывает, когда редактор теряет фокус.',
        en: 'Fires when the editor loses focus.',
      },
      paste: {
        ru: 'Срабатывает при вставке. В `source` — откуда текст: `own`, `word`, `google-docs`, `excel`, `sheets`, `html` или `text`.',
        en: 'Fires on paste. `source` tells where the content came from: `own`, `word`, `google-docs`, `excel`, `sheets`, `html` or `text`.',
      },
    },
    slots: {
      overlay: {
        ru: 'Слой поверх текста редактора, например чужие курсоры в совместной работе.',
        en: 'A layer above the editor text, such as remote cursors in collaboration.',
      },
    },
    keyboard: [
      {
        keys: 'Alt+F10',
        description: {
          ru: 'Переводит фокус в панель форматирования. Escape возвращает его в текст.',
          en: 'Moves the focus into the formatting bar. Escape returns it to the text.',
        },
      },
      {
        keys: 'Ctrl+K',
        description: {
          ru: 'Открывает поле ссылки для выделенного текста.',
          en: 'Opens the link field for the selected text.',
        },
      },
      {
        keys: 'Ctrl+B / Ctrl+I / Ctrl+U',
        description: {
          ru: 'Делает текст жирным, курсивом или подчёркнутым.',
          en: 'Makes the text bold, italic or underlined.',
        },
      },
      {
        keys: 'Ctrl+Shift+S / Ctrl+E',
        description: {
          ru: 'Зачёркивает текст или делает его кодом в строке.',
          en: 'Strikes the text through or turns it into inline code.',
        },
      },
      {
        keys: 'Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y',
        description: {
          ru: 'Отменяет и повторяет правку.',
          en: 'Undoes and redoes an edit.',
        },
      },
      {
        keys: 'Ctrl+Shift+ArrowUp / Ctrl+Shift+ArrowDown',
        description: {
          ru: 'Переносит блок с курсором выше или ниже.',
          en: 'Moves the block with the caret up or down.',
        },
      },
      {
        keys: 'Ctrl+Enter',
        description: {
          ru: 'Отмечает пункт списка задач. В блоке кода начинает строку текста после него.',
          en: 'Checks a task list item. In a code block, starts a text line after it.',
        },
      },
      {
        keys: 'Tab / Shift+Tab',
        description: {
          ru: 'Сдвигает пункт списка или строку кода вправо и влево.',
          en: 'Indents and outdents a list item or a code line.',
        },
      },
      {
        keys: '/',
        description: {
          ru: 'В начале строки или после пробела открывает меню блоков.',
          en: 'At the start of a line or after a space, opens the block menu.',
        },
      },
      {
        keys: '@',
        description: {
          ru: 'Открывает список людей, если задан `mentions`.',
          en: 'Opens the list of people when `mentions` is set.',
        },
      },
      {
        keys: 'ArrowUp / ArrowDown',
        description: {
          ru: 'Выбирает вариант в меню «/» и «@».',
          en: 'Moves through the options of the slash and @ menus.',
        },
      },
      {
        keys: 'Enter / Tab',
        description: {
          ru: 'Применяет выбранный вариант меню «/» или «@».',
          en: 'Applies the chosen option of the slash or @ menu.',
        },
      },
      {
        keys: 'Escape',
        description: {
          ru: 'Закрывает меню «/» и «@», набранный символ остаётся текстом.',
          en: 'Closes the slash and @ menus and keeps the typed character as text.',
        },
      },
    ],
  },
};

export default docs;
