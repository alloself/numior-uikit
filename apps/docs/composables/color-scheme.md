# useColorScheme

`useColorScheme` хранит тему, которую выбрал пользователь, и ставит её классом
`nui-theme--light`, `nui-theme--dark` или `nui-theme--system`. Используйте его для переключателя
темы.

Без аргументов композабл возвращает тему из `createNuiConfig({ colorScheme })`, одну на всё
приложение. С аргументами он создаёт отдельную тему для элемента `scope`. Если задан
`storageKey`, выбор сохраняется в `localStorage`.

Пока пользователь не сменил тему, в хранилище ничего не пишется. Тема по умолчанию `system`
следует за настройкой системы.

<Example name="guide/Scheme" />

## Сигнатура

<SignatureReference :names="['useColorScheme', 'ColorSchemeOptions', 'ColorSchemeControl', 'colorSchemeScript']" />

## Поведение

`scheme` — выбор пользователя: `light`, `dark` или `system`. `resolved` — тема на экране,
`systemDark` — включена ли тёмная тема в системе. `set`, `toggle` и `cycle` меняют выбор.

Композабл начинает работать после монтирования компонента, `start()` вызывать не нужно. Он
снимает два других класса темы и не трогает остальные классы элемента. На сервере класс не
меняется.

Добавьте `colorSchemeScript(storageKey, initial?)` в `<head>`, чтобы класс сохранённой темы
встал на `<html>` до первой отрисовки. `initial` — тема для первого визита, когда сохранённой ещё нет,
см. [Темы оформления](/guide/theming).
