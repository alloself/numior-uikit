# Command

`NuiCommand` — палитра команд: поле поиска и список команд под ним, который сужается по мере
ввода. `NuiCommandDialog` открывает палитру в окне по сочетанию клавиш, так работает поиск в этой
документации.

<Example name="command/Basic" />

## Установка

```ts
import { NuiCommand, NuiCommandDialog } from '@numior/vue';
import '@numior/vue/styles/list.css';
import '@numior/vue/styles/dialog.css';
import '@numior/vue/styles/command.css';
```

## Использование

Команды передайте в `items`: у каждой есть `value`, `label` и при желании `icon` и `description`.
Чтобы разбить команды на группы, передайте объекты `{ label, items }`. Выбранная команда приходит
в событии `select`.

Поле `shortcut` показывает рядом с командой сочетание клавиш, например `mod+1`. Нажатие этого
сочетания задаёт ваше приложение.

## Примеры

### В диалоге

`NuiCommandDialog` открывается через `v-model:open` или сочетанием клавиш из `hotkey`, по
умолчанию Ctrl+K, а на macOS — ⌘K. Пример открывается по Ctrl+J, потому что Ctrl+K открывает
поиск по документации.

<Example name="command/Dialog" />

Выбор команды закрывает диалог, `:close-on-select="false"` оставляет его открытым.

## Поведение

Палитра ищет введённый текст в названии, описании и в списке `keywords`. Так команда «Button»
находится и по слову «кнопка».

Для поиска на сервере передайте `:filter="false"` и слушайте событие `search`, которое приходит с
текстом запроса. Найденные команды передайте в `items`, а на время загрузки включите `loading`.

## Доступность

Фокус остаётся в поле поиска, а стрелки переходят по командам. Диалог закрывается по Escape и
возвращает фокус на элемент, с которого его открыли.

<KeyboardReference name="NuiCommandDialog" />

## API

<ApiReference :names="['NuiCommand', 'NuiCommandDialog']" />
