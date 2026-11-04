# useColorScheme

`useColorScheme` хранит тему, которую выбрал пользователь, и ставит её в атрибут
`data-nui-theme`. Используйте его для переключателя темы.

Без аргументов композабл возвращает тему из `createNuiConfig({ colorScheme })`, одну на всё
приложение. С аргументами он создаёт отдельную тему для элемента `scope`. Если задан
`storageKey`, выбор сохраняется в `localStorage`.

<Example name="guide/Scheme" />

## Сигнатура

<SignatureReference :names="['useColorScheme', 'ColorSchemeOptions', 'ColorSchemeControl', 'colorSchemeScript']" />

## Поведение

`scheme` — выбор пользователя: `light`, `dark` или `system`. `resolved` — тема на экране,
`systemDark` — включена ли тёмная тема в системе. `set`, `toggle` и `cycle` меняют выбор.

Композабл начинает работать после монтирования компонента, `start()` вызывать не нужно. На
сервере атрибут не меняется.

Добавьте `colorSchemeScript(storageKey, initial?)` в `<head>`, чтобы сохранённая тема
применилась до первой отрисовки. `initial` — тема для первого визита, когда сохранённой ещё нет,
см. [Темы оформления](/guide/theming).
