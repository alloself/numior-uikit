# Command

`NuiCommand` — палитра команд: поле ввода и сгруппированный список, который фильтруется по
мере набора. `NuiCommandDialog` открывает ту же палитру в модальном диалоге по сочетанию
клавиш; так устроен поиск в этой документации.

<Example name="command/Basic" />

## Установка

```ts
import { NuiCommand, NuiCommandDialog } from '@numior/vue';
import '@numior/vue/styles/list.css';
import '@numior/vue/styles/dialog.css';
import '@numior/vue/styles/command.css';
```

## Примеры

### В диалоге

`NuiCommandDialog` открывается кнопкой через `v-model:open` или сочетанием из `hotkey`. По
умолчанию это `mod+k`; пример берёт `mod+j`, чтобы не спорить с поиском по документации.
Выбор команды закрывает диалог.

<Example name="command/Dialog" />

## Поведение

Команды — записи `NuiOption` с необязательными `shortcut` и `keywords`; группа задаётся
объектом `{ label, items }`. Встроенный фильтр сравнивает запрос с подписью и ключевыми
словами. Для серверного поиска передайте `:filter="false"`, слушайте `search` и отдавайте
`items` функцией от запроса; `loading` показывает состояние загрузки.

## Доступность

Поле — `role="combobox"` с `aria-activedescendant`, список — `listbox` с активной командой
без переноса фокуса. Диалог модален, закрывается по Escape и возвращает фокус на кнопку.

<KeyboardReference name="NuiCommandDialog" />

## API

<ApiReference :names="['NuiCommand', 'NuiCommandDialog']" />
