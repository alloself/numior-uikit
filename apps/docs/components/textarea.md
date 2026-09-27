# Textarea

`NuiTextarea` — нативный `<textarea>` для многострочного текста. Значение идёт через `v-model`
с модификаторами `.lazy` и `.trim`.

<Example name="textarea/Basic" />

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

`resize` разрешает тянуть поле по вертикали, в обе стороны или запрещает совсем.

<Example name="textarea/Resize" />

### Ленивое обновление

`v-model.lazy` пишет в модель по уходу фокуса, `.trim` убирает пробелы по краям.

<Example name="textarea/Lazy" />

## Доступность

Атрибуты, классы и обработчики событий попадают прямо на `<textarea>`. Подпись связана через
`for`, описание и ошибка — через `aria-describedby`.

## API

<ApiReference name="NuiTextarea" />
