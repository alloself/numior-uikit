# Textarea

`NuiTextarea` — поле для многострочного текста: комментария, описания, ответа клиенту. Внутри
обычный `<textarea>` с подписью, подсказкой и текстом ошибки.

<Example name="textarea/Basic" />

Значение привязывается через `v-model`, а высоту поля в строках задаёт `rows`, по умолчанию 3.

## Установка

```ts
import { NuiTextarea } from '@numior/vue';
import '@numior/vue/styles/field.css';
import '@numior/vue/styles/textarea.css';
```

## Использование

<Configurator name="NuiTextarea" />

## Примеры

### Изменение размера

Свойство `resize` решает, можно ли растянуть поле за угол: `vertical` — только по высоте, так
стоит по умолчанию, `both` — в обе стороны, `none` — никак.

<Example name="textarea/Resize" />

### Обновление после ввода

С `v-model.lazy` значение обновляется, когда пользователь уходит из поля, а не на каждый символ.
Модификатор `.trim` убирает пробелы в начале и в конце текста.

<Example name="textarea/Lazy" />

## Доступность

Атрибуты, классы и обработчики событий попадают прямо на `<textarea>`. Подпись связана с полем
через `for`, а подсказка и текст ошибки — через `aria-describedby`.

## API

<ApiReference name="NuiTextarea" />
