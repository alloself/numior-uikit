# useHotkey

`useHotkey(combo, handler, options)` вызывает обработчик на сочетании клавиш в записи
`mod+shift+u`. `mod` — Ctrl или ⌘; буквы и цифры сравниваются по физической клавише, поэтому
сочетание работает на любой раскладке. Слушатель живёт, пока жив компонент.

<Example name="composables/Hotkey" />

## Сигнатура

<SignatureReference :names="['useHotkey', 'HotkeyOptions', 'parseHotkey', 'Hotkey']" />

## Поведение

`enabled` выключает сочетание, `target` вешает слушатель не на окно, `preventDefault`
отменяет действие браузера. Сочетания без Ctrl и Meta по умолчанию молчат в полях ввода;
`inEditable: true` включает их и там. `parseHotkey` разбирает запись в объект `Hotkey` — тот
же формат читает [Kbd](/components/kbd).
