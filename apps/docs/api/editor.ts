import type { DocsMap } from '../.vitepress/reference/reference.types';
import { fieldControl } from './shared/field.ts';

const docs: DocsMap = {
  NuiEditor: {
    props: {
      ...fieldControl,
      readonly: {
        ru: 'Показывает документ без возможности правки. Текст можно выделить и скопировать.',
        en: 'Shows the document without editing. The text can still be selected and copied.',
      },
      schema: {
        ru: 'Схема документа: какие блоки и стили допустимы. По умолчанию — `contentSchema` из `@numior/content`.',
        en: 'Document schema: which blocks and styles are allowed. Defaults to `contentSchema` from `@numior/content`.',
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
        ru: 'Панель форматирования: `fixed` — над текстом, `bubble` — над выделением, `both` — обе, `none` — без панели. Alt+F10 переводит в неё фокус, Escape возвращает в текст.',
        en: 'Formatting bar: `fixed` above the text, `bubble` over the selection, `both`, or `none`. Alt+F10 moves the focus into it, Escape returns to the text.',
      },
      colours: {
        ru: 'Цвета текста в меню, например `red` или `blue`. По умолчанию — все девять. Цвета, которые уже есть в документе, сохраняются.',
        en: 'Text colors in the menu, such as `red` or `blue`. All nine by default. Colors already in the document stay.',
      },
      upload: {
        ru: 'Функция загрузки `(file, { onProgress, signal }) => Promise<{ url }>`. С ней файлы и картинки можно вставить, перетащить или выбрать в меню «/». Без неё — только по ссылке.',
        en: 'Upload function `(file, { onProgress, signal }) => Promise<{ url }>`. With it, files and images can be pasted, dropped or picked in the slash menu. Without it, only by link.',
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
        ru: 'Свои блоки из `defineBlock`: компонент, клавиши, пункты меню «/» и меню блока. Читается один раз при монтировании.',
        en: 'Custom blocks from `defineBlock`: a component, keys, slash menu items and block menu items. Read once on mount.',
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
        ru: 'Свои кнопки для выделенного текста: в панели над выделением и в панели инструментов. Кнопка отключена, пока команда неприменима.',
        en: 'Your own buttons for selected text, in the bar over the selection and in the toolbar. A button is disabled while its command does not apply.',
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
  },
};

export default docs;
