import type { DocsMap } from '../.vitepress/reference/reference.types';
import { fieldControl } from './shared/field.ts';

const docs: DocsMap = {
  NuiEditor: {
    props: {
      ...fieldControl,
      readonly: {
        ru: 'Запрещает правку, но оставляет текст доступным для выделения.',
        en: 'Blocks editing while keeping the text selectable.',
      },
      schema: {
        ru: 'Схема документа; по умолчанию contentSchema из @numior/content.',
        en: 'Document schema; contentSchema from @numior/content by default.',
      },
      placeholder: {
        ru: 'Подсказка в пустом документе.',
        en: 'Hint shown in an empty document.',
      },
      autofocus: {
        ru: 'Ставит фокус в редактор после монтирования.',
        en: 'Focuses the editor once it is mounted.',
      },
      toolbar: {
        ru: 'Панели форматирования: fixed — липкая панель над текстом, bubble — меню над выделенным текстом, both — обе, none — без них; в режиме чтения панелей нет. Alt+F10 переводит фокус в панель, Escape возвращает в текст, Ctrl+K открывает правку ссылки.',
        en: 'Formatting bars: fixed is a sticky bar above the text, bubble a menu over selected text, both shows both, none hides them; read-only editors have none. Alt+F10 moves focus into the bar, Escape returns to the text, Ctrl+K opens link editing.',
      },
      colours: {
        ru: 'Пресеты цвета текста, которые предлагает меню и принимает вставка; по умолчанию все девять. Цвета, которые уже есть в документе, сохраняются.',
        en: 'Text colour presets the menu offers and pastes keep; all nine by default. Colours already in the document stay.',
      },
      upload: {
        ru: 'Адаптер загрузки `(file, { onProgress, signal }) => Promise<{ url }>`: вставка, перетаскивание и «Картинка»/«Файл» из меню «/» загружают файлы, показывают карточку с прогрессом и вставляют блок после ответа. Без адаптера картинки и файлы вставляются только по ссылке.',
        en: 'An upload adapter `(file, { onProgress, signal }) => Promise<{ url }>`: pasting, dropping and Image/File from the slash menu upload files, show a card with progress and insert the block once the adapter answers. Without it images and files are inserted by link only.',
      },
      accept: {
        ru: 'Допустимые типы загружаемых файлов в формате атрибута `accept`.',
        en: 'Accepted upload types in the format of the `accept` attribute.',
      },
      maxSize: {
        ru: 'Наибольший размер загружаемого файла в байтах.',
        en: 'The largest upload size in bytes.',
      },
      format: {
        ru: 'Что отдаёт `v-model`: `html` — строку разметки, `json` — документ JSON.',
        en: 'What `v-model` carries: `html` is a markup string, `json` a JSON document.',
      },
      embeds: {
        ru: 'Разрешённые встраивания: id пресетов (`youtube`, `vimeo`, `loom`, `figma`, `maps`, `codepen`) или свои правила `{ id, label, aspect, source(url) }`. Ссылка разрешённого провайдера встраивается окном, в документе хранится только исходная ссылка. Без пропа встраиваний нет.',
        en: 'Allowed embeds: preset ids (`youtube`, `vimeo`, `loom`, `figma`, `maps`, `codepen`) or own rules `{ id, label, aspect, source(url) }`. A link of an allowed provider is embedded as a frame and only the original link is kept in the document. Without the prop there are no embeds.',
      },
      linkMetadata: {
        ru: 'Адаптер `(url, { signal }) => Promise<{ title, description, image, icon, site }>` для закладок: ответ сохраняется в документе снимком, «Обновить» на панели закладки запрашивает заново. Без адаптера закладка показывает адрес и домен.',
        en: 'An adapter `(url, { signal }) => Promise<{ title, description, image, icon, site }>` for bookmarks: the answer is kept in the document as a snapshot and Refresh on the bookmark bar asks again. Without it a bookmark shows the address and the domain.',
      },
      mentions: {
        ru: 'Поиск людей `(query, { signal }) => Promise<{ id, label, description?, avatar? }[]>` для упоминаний: «@» открывает список у каретки, запрос уходит после паузы в наборе, устаревший отменяется; выбор вставляет узел `mention`. Без адаптера «@» — обычный символ.',
        en: 'A people search `(query, { signal }) => Promise<{ id, label, description?, avatar? }[]>` for mentions: @ opens a list at the caret, the request goes out once typing pauses and a stale one is aborted; a choice inserts a `mention` node. Without it @ is a plain character.',
      },
      highlighter: {
        ru: 'Подсветчик блоков кода вместо настроенного в `createNuiConfig`; `false` выключает подсветку.',
        en: 'A highlighter for code blocks instead of the one set in `createNuiConfig`; `false` turns highlighting off.',
      },
      blocks: {
        ru: 'Свои блоки из `defineBlock`: Vue-компонент в узле схемы (node view), клавиши, пункты меню «/» и меню ручки. Читается один раз при монтировании.',
        en: 'Custom blocks from `defineBlock`: a Vue component inside a schema node (a node view), keys, slash menu items and handle menu entries. Read once on mount.',
      },
      blockHandles: {
        ru: 'Ручка у блока под указателем (на сенсорных экранах — у блока с курсором): меню «Превратить в», «Дублировать», «Переместить», «Удалить» и перетаскивание блока. Ctrl+Shift+↑/↓ переносит блок с курсором.',
        en: 'A handle on the block under the pointer (on touch screens, the block with the caret): a menu to turn, duplicate, move or delete the block and dragging. Ctrl+Shift+Up/Down moves the block with the caret.',
      },
      highlights: {
        ru: 'Пресеты фонового выделения, которые предлагает меню и принимает вставка; по умолчанию все девять.',
        en: 'Highlight presets the menu offers and pastes keep; all nine by default.',
      },
    },
    models: {
      'v-model': {
        ru: 'Документ в формате из `format`: строка HTML (по умолчанию) или JSON формата 1. Тип значения выводится из привязки. HTML обновляется через 300 мс после правки, сразу при уходе фокуса и при отправке формы, JSON — на каждую правку; значение, заданное снаружи, читается схемой и начинает историю заново.',
        en: 'The document in the `format` encoding: an HTML string (the default) or format 1 JSON. The value type follows the binding. HTML updates 300 ms after an edit, right away on blur and when a form submits, JSON on every edit; a value set from outside is read through the schema and restarts the history.',
      },
    },
    events: {
      change: { ru: 'Документ изменился.', en: 'The document changed.' },
      focus: { ru: 'Редактор получил фокус.', en: 'The editor received focus.' },
      blur: { ru: 'Редактор потерял фокус.', en: 'The editor lost focus.' },
      paste: {
        ru: 'Пользователь вставил содержимое; source — откуда оно: own, word, google-docs, excel, sheets, html или text.',
        en: 'The user pasted content; source tells where it came from: own, word, google-docs, excel, sheets, html or text.',
      },
    },
  },
};

export default docs;
