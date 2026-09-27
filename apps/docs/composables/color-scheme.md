# useColorScheme

`useColorScheme` управляет атрибутом `data-nui-theme`: хранит выбор `light`, `dark` или
`system`, следит за системной схемой и пишет изменения в `localStorage`. Без аргументов
возвращает общую схему из `createNuiConfig({ colorScheme })`, с аргументами создаёт свою для
области `scope`.

<Example name="guide/Scheme" />

## Сигнатура

<SignatureReference :names="['useColorScheme', 'ColorSchemeOptions', 'ColorSchemeControl', 'colorSchemeScript']" />

## Поведение

`scheme` хранит выбор, `resolved` — фактическую схему, `systemDark` — состояние системы.
`set`, `toggle` и `cycle` меняют выбор; `start` вызывается автоматически после монтирования.

На сервере атрибут не трогается, а `colorSchemeScript(storageKey)` в `<head>` применяет
сохранённую схему до первой отрисовки, см. [Темизация](/guide/theming).
