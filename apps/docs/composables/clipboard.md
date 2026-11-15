# useClipboard

`useClipboard(options)` копирует текст в буфер обмена. В браузерах без Clipboard API
используется `document.execCommand('copy')`.

`copy(text)` возвращает `true`, если текст скопирован. После копирования `copied` равен `true`
в течение `copiedDuration` миллисекунд, по умолчанию 2 секунды: по нему удобно показать
«Скопировано». `supported` сообщает, можно ли копировать в этом браузере.

<Example name="composables/Clipboard" />

## Сигнатура

<SignatureReference
  :names="['useClipboard', 'ClipboardOptions', 'ClipboardControl', 'ClipboardPayload']"
/>

## Поведение

`copyRich({ text, html })` кладёт в буфер и текст, и HTML. В редактор документов или таблиц
вставится разметка, в обычное поле — текст. Так [Table](/table/editing) копирует выделенные
ячейки.

`copy` принимает и промис с текстом. Запрос за текстом идёт уже после нажатия, а Safari всё равно
разрешает запись в буфер.

Если браузер не принимает HTML, копируется только текст. На сервере `supported` равен `false`, а
`copy` возвращает `false`.
