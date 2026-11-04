# useHotkey

`useHotkey(combo, handler, options)` вызывает `handler`, когда пользователь нажимает сочетание
клавиш, например `mod+shift+u`. `mod` срабатывает и на Ctrl, и на ⌘.

Буквы и цифры сравниваются по физической клавише, поэтому Ctrl+K работает и на русской
раскладке. Сочетание перестаёт работать, когда компонент размонтирован.

<Example name="composables/Hotkey" />

## Сигнатура

<SignatureReference :names="['useHotkey', 'HotkeyOptions', 'parseHotkey', 'Hotkey']" />

## Поведение

`enabled: false` выключает сочетание, а `target` слушает клавиши на заданном элементе вместо
окна. По умолчанию действие браузера для сочетания отменяется, `preventDefault: false` его
оставляет.

Сочетания без Ctrl и ⌘ не срабатывают, пока пользователь печатает в поле ввода.
`inEditable: true` включает их и там.

`parseHotkey` разбирает запись сочетания в объект `Hotkey`. Ту же запись понимает
[Kbd](/components/kbd).
