import type { NuiMessageCatalog } from '@numior/primitives';

export interface NuiEditorMessages {
  readonly toolbar: string;
  readonly undo: string;
  readonly redo: string;
  readonly blockType: string;
  readonly currentBlock: (params: { readonly type: string }) => string;
  readonly text: string;
  readonly heading: (params: { readonly level: number }) => string;
  readonly codeBlock: string;
  readonly bold: string;
  readonly italic: string;
  readonly underline: string;
  readonly strike: string;
  readonly code: string;
  readonly bulletList: string;
  readonly orderedList: string;
  readonly todoList: string;
  readonly quote: string;
  readonly divider: string;
  readonly link: string;
  readonly linkAddress: string;
  readonly linkApply: string;
  readonly linkRemove: string;
  readonly linkInvalid: string;
  readonly colour: string;
  readonly textColour: string;
  readonly defaultColour: string;
  readonly highlight: string;
  readonly noHighlight: string;
  readonly colourName: (params: { readonly name: string }) => string;
  readonly formatting: string;
  readonly callout: string;
  readonly toggle: string;
  readonly blocks: string;
  readonly blockActions: string;
  readonly turnInto: string;
  readonly duplicate: string;
  readonly moveUp: string;
  readonly moveDown: string;
  readonly wholeOf: (params: { readonly type: string }) => string;
  readonly done: (params: { readonly text: string }) => string;
  readonly expand: string;
  readonly collapse: string;
  readonly openByDefault: string;
  readonly tone: string;
  readonly toneName: (params: { readonly tone: string }) => string;
  readonly calloutTone: (params: { readonly tone: string }) => string;
  readonly codeLanguage: string;
  readonly codePlain: string;
  readonly codeLanguageSearch: string;
  readonly copyCode: string;
  readonly codeCopied: string;
  readonly columns: (params: { readonly count: number }) => string;
  readonly columnWidth: (params: { readonly index: number }) => string;
  readonly deleteBlock: string;
  readonly table: string;
  readonly insert: string;
  readonly embed: string;
  readonly bookmark: string;
  readonly openLink: string;
  readonly toBookmark: string;
  readonly toEmbed: string;
  readonly linkRefresh: string;
  readonly linkLoading: string;
  readonly embedTitle: (params: { readonly provider: string }) => string;
  readonly embedUnavailable: (params: { readonly provider: string }) => string;
  readonly embedInvalid: string;
  readonly pasteAs: string;
  readonly pasteEmbed: (params: { readonly provider: string }) => string;
  readonly pasteLink: string;
  readonly tableColumn: (params: { readonly index: number }) => string;
  readonly tableAddRow: string;
  readonly tableAddColumn: string;
  readonly tableRowAbove: string;
  readonly tableRowBelow: string;
  readonly tableDeleteRow: string;
  readonly tableColumnBefore: string;
  readonly tableColumnAfter: string;
  readonly tableDeleteColumn: string;
  readonly tableRename: string;
  readonly tableColumnName: string;
  readonly tableType: string;
  readonly tableTypeName: (params: { readonly type: string }) => string;
  readonly image: string;
  readonly file: string;
  readonly mediaUpload: string;
  readonly mediaLink: string;
  readonly chooseImage: string;
  readonly chooseFile: string;
  readonly mediaDropHint: string;
  readonly mediaAddress: string;
  readonly mediaInsert: string;
  readonly mediaInvalid: string;
  readonly uploading: (params: { readonly percent: number }) => string;
  readonly uploadCancel: (params: { readonly name: string }) => string;
  readonly uploadRetry: string;
  readonly uploadDismiss: string;
  readonly uploaded: (params: { readonly name: string }) => string;
  readonly uploadFailed: (params: { readonly name: string }) => string;
  readonly uploadType: (params: { readonly name: string }) => string;
  readonly uploadSize: (params: { readonly name: string; readonly size: string }) => string;
  readonly uploadUnavailable: string;
  readonly uploadLost: (params: { readonly name: string }) => string;
  readonly imageWidth: string;
  readonly imageAlign: string;
  readonly imageAlignStart: string;
  readonly imageAlignCenter: string;
  readonly imageAlignEnd: string;
  readonly imageReplace: string;
  readonly download: string;
  readonly imageAlt: string;
  readonly imageAltHint: string;
  readonly imageAltSave: string;
  readonly imageCaption: string;
}

const EN_TYPES: Readonly<Record<string, string>> = {
  text: 'Text',
  number: 'Number',
  date: 'Date',
  boolean: 'Checkbox',
  select: 'Select',
};

const RU_TYPES: Readonly<Record<string, string>> = {
  text: 'Текст',
  number: 'Число',
  date: 'Дата',
  boolean: 'Флажок',
  select: 'Выбор',
};

const EN_WHOLE: Readonly<Record<string, string>> = {
  bullet_list: 'Whole list',
  ordered_list: 'Whole list',
  todo_list: 'Whole list',
  list_item: 'Whole item',
  todo_item: 'Whole item',
  blockquote: 'Whole quote',
  callout: 'Whole callout',
  toggle: 'Whole toggle',
  columns: 'All columns',
};

const RU_WHOLE: Readonly<Record<string, string>> = {
  bullet_list: 'Весь список',
  ordered_list: 'Весь список',
  todo_list: 'Весь список',
  list_item: 'Весь пункт',
  todo_item: 'Весь пункт',
  blockquote: 'Вся цитата',
  callout: 'Вся выноска',
  toggle: 'Весь раскрывающийся блок',
  columns: 'Все колонки',
};

const EN_TONES: Readonly<Record<string, string>> = {
  info: 'Info',
  success: 'Success',
  warning: 'Warning',
  error: 'Error',
};

const RU_TONES: Readonly<Record<string, string>> = {
  info: 'Информация',
  success: 'Успех',
  warning: 'Предупреждение',
  error: 'Ошибка',
};

const EN_COLOURS: Readonly<Record<string, string>> = {
  gray: 'Gray',
  brown: 'Brown',
  orange: 'Orange',
  yellow: 'Yellow',
  green: 'Green',
  blue: 'Blue',
  purple: 'Purple',
  pink: 'Pink',
  red: 'Red',
};

const RU_COLOURS: Readonly<Record<string, string>> = {
  gray: 'Серый',
  brown: 'Коричневый',
  orange: 'Оранжевый',
  yellow: 'Жёлтый',
  green: 'Зелёный',
  blue: 'Синий',
  purple: 'Фиолетовый',
  pink: 'Розовый',
  red: 'Красный',
};

export const editorMessages: NuiMessageCatalog<'editor'> = {
  namespace: 'editor',
  en: {
    toolbar: 'Formatting',
    undo: 'Undo',
    redo: 'Redo',
    blockType: 'Block type',
    currentBlock: ({ type }) => `Block type: ${type}`,
    text: 'Text',
    heading: ({ level }) => `Heading ${String(level)}`,
    codeBlock: 'Code block',
    bold: 'Bold',
    italic: 'Italic',
    underline: 'Underline',
    strike: 'Strikethrough',
    code: 'Inline code',
    bulletList: 'Bulleted list',
    orderedList: 'Numbered list',
    todoList: 'To-do list',
    quote: 'Quote',
    divider: 'Divider',
    link: 'Link',
    linkAddress: 'Link address',
    linkApply: 'Apply',
    linkRemove: 'Remove link',
    linkInvalid: 'This address cannot be linked',
    colour: 'Colour',
    textColour: 'Text colour',
    defaultColour: 'Default',
    highlight: 'Highlight',
    noHighlight: 'None',
    colourName: ({ name }) => EN_COLOURS[name] ?? name,
    formatting: 'Selection formatting',
    callout: 'Callout',
    toggle: 'Toggle',
    blocks: 'Blocks',
    blockActions: 'Block actions',
    turnInto: 'Turn into',
    duplicate: 'Duplicate',
    moveUp: 'Move up',
    moveDown: 'Move down',
    wholeOf: ({ type }) => EN_WHOLE[type] ?? 'Whole block',
    done: ({ text }) => (text === '' ? 'Done' : `Done: ${text}`),
    expand: 'Expand',
    collapse: 'Collapse',
    openByDefault: 'Open by default',
    tone: 'Tone',
    toneName: ({ tone }) => EN_TONES[tone] ?? tone,
    calloutTone: ({ tone }) => `Callout tone: ${EN_TONES[tone] ?? tone}`,
    codeLanguage: 'Code language',
    codePlain: 'Plain text',
    codeLanguageSearch: 'Search languages',
    copyCode: 'Copy code',
    codeCopied: 'Copied',
    columns: ({ count }) => `${String(count)} columns`,
    columnWidth: ({ index }) => `Column ${String(index)} width`,
    deleteBlock: 'Delete',
    table: 'Table',
    insert: 'Insert',
    embed: 'Embed',
    bookmark: 'Bookmark',
    openLink: 'Open link',
    toBookmark: 'Show as bookmark',
    toEmbed: 'Embed',
    linkRefresh: 'Refresh',
    linkLoading: 'Loading…',
    embedTitle: ({ provider }) => `${provider} embed`,
    embedUnavailable: ({ provider }) => `${provider} embeds are not allowed here`,
    embedInvalid: 'This link cannot be embedded',
    pasteAs: 'Paste the link as',
    pasteEmbed: ({ provider }) => `Embed ${provider}`,
    pasteLink: 'Keep as a link',
    tableColumn: ({ index }) => `Column ${String(index)}`,
    tableAddRow: 'Row',
    tableAddColumn: 'Column',
    tableRowAbove: 'Insert row above',
    tableRowBelow: 'Insert row below',
    tableDeleteRow: 'Delete row',
    tableColumnBefore: 'Insert column before',
    tableColumnAfter: 'Insert column after',
    tableDeleteColumn: 'Delete column',
    tableRename: 'Rename',
    tableColumnName: 'Column name',
    tableType: 'Type',
    tableTypeName: ({ type }) => EN_TYPES[type] ?? type,
    image: 'Image',
    file: 'File',
    mediaUpload: 'Upload',
    mediaLink: 'By link',
    chooseImage: 'Choose an image',
    chooseFile: 'Choose files',
    mediaDropHint: 'Or drop files into the editor or paste them',
    mediaAddress: 'Address',
    mediaInsert: 'Insert',
    mediaInvalid: 'Enter a web address',
    uploading: ({ percent }) => `Uploading… ${String(percent)}%`,
    uploadCancel: ({ name }) => `Cancel the upload of ${name}`,
    uploadRetry: 'Retry',
    uploadDismiss: 'Remove',
    uploaded: ({ name }) => `${name} is uploaded`,
    uploadFailed: ({ name }) => `Could not upload ${name}`,
    uploadType: ({ name }) => `${name}: this file type is not accepted`,
    uploadSize: ({ name, size }) => `${name} is larger than ${size}`,
    uploadUnavailable: 'Files cannot be uploaded here; insert them by link',
    uploadLost: ({ name }) => `${name} is uploaded, but there is no place left for it`,
    imageWidth: 'Image width',
    imageAlign: 'Alignment',
    imageAlignStart: 'Align to the line start',
    imageAlignCenter: 'Centre',
    imageAlignEnd: 'Align to the line end',
    imageReplace: 'Replace',
    download: 'Download',
    imageAlt: 'Alt text',
    imageAltHint: 'Describes the image to people who cannot see it',
    imageAltSave: 'Save',
    imageCaption: 'Add a caption',
  },
  ru: {
    toolbar: 'Форматирование',
    undo: 'Отменить',
    redo: 'Повторить',
    blockType: 'Тип блока',
    currentBlock: ({ type }) => `Тип блока: ${type}`,
    text: 'Текст',
    heading: ({ level }) => `Заголовок ${String(level)}`,
    codeBlock: 'Блок кода',
    bold: 'Жирный',
    italic: 'Курсив',
    underline: 'Подчёркнутый',
    strike: 'Зачёркнутый',
    code: 'Код в строке',
    bulletList: 'Маркированный список',
    orderedList: 'Нумерованный список',
    todoList: 'Список задач',
    quote: 'Цитата',
    divider: 'Разделитель',
    link: 'Ссылка',
    linkAddress: 'Адрес ссылки',
    linkApply: 'Готово',
    linkRemove: 'Убрать ссылку',
    linkInvalid: 'Такой адрес нельзя сделать ссылкой',
    colour: 'Цвет',
    textColour: 'Цвет текста',
    defaultColour: 'Обычный',
    highlight: 'Выделение',
    noHighlight: 'Нет',
    colourName: ({ name }) => RU_COLOURS[name] ?? name,
    formatting: 'Форматирование выделения',
    callout: 'Выноска',
    toggle: 'Раскрывающийся блок',
    blocks: 'Блоки',
    blockActions: 'Действия с блоком',
    turnInto: 'Превратить в',
    duplicate: 'Дублировать',
    moveUp: 'Переместить выше',
    moveDown: 'Переместить ниже',
    wholeOf: ({ type }) => RU_WHOLE[type] ?? 'Весь блок',
    done: ({ text }) => (text === '' ? 'Выполнено' : `Выполнено: ${text}`),
    expand: 'Развернуть',
    collapse: 'Свернуть',
    openByDefault: 'Открыт по умолчанию',
    tone: 'Тон',
    toneName: ({ tone }) => RU_TONES[tone] ?? tone,
    calloutTone: ({ tone }) => `Тон выноски: ${RU_TONES[tone] ?? tone}`,
    codeLanguage: 'Язык кода',
    codePlain: 'Обычный текст',
    codeLanguageSearch: 'Найти язык',
    copyCode: 'Копировать код',
    codeCopied: 'Скопировано',
    columns: ({ count }) => `${String(count)} колонки`,
    columnWidth: ({ index }) => `Ширина колонки ${String(index)}`,
    deleteBlock: 'Удалить',
    table: 'Таблица',
    insert: 'Вставить',
    embed: 'Встраивание',
    bookmark: 'Закладка',
    openLink: 'Открыть ссылку',
    toBookmark: 'Показать закладкой',
    toEmbed: 'Встроить',
    linkRefresh: 'Обновить',
    linkLoading: 'Загрузка…',
    embedTitle: ({ provider }) => `Встраивание ${provider}`,
    embedUnavailable: ({ provider }) => `Встраивания ${provider} здесь не разрешены`,
    embedInvalid: 'Эту ссылку нельзя встроить',
    pasteAs: 'Вставить ссылку как',
    pasteEmbed: ({ provider }) => `Встроить ${provider}`,
    pasteLink: 'Оставить ссылкой',
    tableColumn: ({ index }) => `Колонка ${String(index)}`,
    tableAddRow: 'Строка',
    tableAddColumn: 'Колонка',
    tableRowAbove: 'Вставить строку выше',
    tableRowBelow: 'Вставить строку ниже',
    tableDeleteRow: 'Удалить строку',
    tableColumnBefore: 'Вставить колонку перед',
    tableColumnAfter: 'Вставить колонку после',
    tableDeleteColumn: 'Удалить колонку',
    tableRename: 'Переименовать',
    tableColumnName: 'Название колонки',
    tableType: 'Тип',
    tableTypeName: ({ type }) => RU_TYPES[type] ?? type,
    image: 'Картинка',
    file: 'Файл',
    mediaUpload: 'Загрузить',
    mediaLink: 'По ссылке',
    chooseImage: 'Выбрать картинку',
    chooseFile: 'Выбрать файлы',
    mediaDropHint: 'Или перетащите файлы в редактор либо вставьте их',
    mediaAddress: 'Адрес',
    mediaInsert: 'Вставить',
    mediaInvalid: 'Введите веб-адрес',
    uploading: ({ percent }) => `Загрузка… ${String(percent)} %`,
    uploadCancel: ({ name }) => `Отменить загрузку ${name}`,
    uploadRetry: 'Повторить',
    uploadDismiss: 'Убрать',
    uploaded: ({ name }) => `${name} загружен`,
    uploadFailed: ({ name }) => `Не удалось загрузить ${name}`,
    uploadType: ({ name }) => `${name}: такой тип файла не принимается`,
    uploadSize: ({ name, size }) => `${name} больше ${size}`,
    uploadUnavailable: 'Сюда нельзя загрузить файлы — вставьте их по ссылке',
    uploadLost: ({ name }) => `${name} загружен, но вставить его некуда`,
    imageWidth: 'Ширина картинки',
    imageAlign: 'Выравнивание',
    imageAlignStart: 'К началу строки',
    imageAlignCenter: 'По центру',
    imageAlignEnd: 'К концу строки',
    imageReplace: 'Заменить',
    download: 'Скачать',
    imageAlt: 'Описание',
    imageAltHint: 'Рассказывает о картинке тем, кто её не видит',
    imageAltSave: 'Сохранить',
    imageCaption: 'Добавьте подпись',
  },
};
