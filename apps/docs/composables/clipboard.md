# useClipboard

`useClipboard(options)` копирует текст через Clipboard API с запасным путём `execCommand` для
старых браузеров. `copy(text)` отвечает `true` при успехе, `copied` держится `copiedDuration`
миллисекунд, `supported` говорит, доступно ли копирование.

<Example name="composables/Clipboard" />

## Сигнатура

<SignatureReference
  :names="['useClipboard', 'ClipboardOptions', 'ClipboardControl', 'ClipboardPayload']"
/>

## Поведение

`copyRich({ text, html })` кладёт в буфер текст и HTML вместе, а если браузер не принимает HTML,
копирует только текст. Так [Table](/components/table) отдаёт выделенные ячейки таблицей.

На сервере `supported` равен `false`, а `copy` ничего не делает. Кнопки [Code](/components/code)
и копирование в этой документации построены на этом композабле.
