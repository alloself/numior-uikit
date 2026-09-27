# Input

`NuiInput` — нативный `<input>` в рамке с кольцом фокуса и слотами `prefix` и `suffix`.
Значение идёт через `v-model` с модификаторами `.lazy`, `.trim` и `.unmasked`.

<Example name="input/Basic" />

## Установка

```ts
import { NuiInput } from '@numior/vue';
import '@numior/vue/styles/field.css';
import '@numior/vue/styles/input.css';
```

## Использование

<Configurator name="NuiInput" />

## Примеры

### Префикс и суффикс

Слоты встают внутрь рамки по краям поля и не попадают в значение.

<Example name="input/Affixes" />

### Маска

`mask` форматирует ввод на лету: `#` — цифра, `A` — буква, `*` — буква или цифра, остальные
символы подставляются сами. `v-model.unmasked` оставляет в модели только значимые символы.

<Example name="input/Mask" />

### Ленивое обновление

`v-model.lazy` пишет в модель по уходу фокуса или Enter, `.trim` убирает пробелы по краям.

<Example name="input/Lazy" />

### Состояния

`readonly` оставляет текст доступным для выделения, `disabled` выключает поле, `error`
включает состояние ошибки и показывает текст под полем.

<Example name="input/States" />

## Доступность

Поле остаётся нативным `<input>`: `placeholder`, `name`, `autocomplete`, `inputmode` и
обработчики событий уходят на него, `class` и `style` — на рамку. Подпись связана через
`for`, описание и ошибка — через `aria-describedby`.

## API

<ApiReference name="NuiInput" />
