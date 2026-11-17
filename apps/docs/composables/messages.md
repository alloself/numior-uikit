# useMessages

`useMessages(catalog, locale)` возвращает подписи вашего компонента на текущем языке.
Используйте его, когда пишете компонент со своими встроенными текстами.

Подписи ищутся так же, как у компонентов Numior UI: сначала функция `translate`, затем словарь
`messages` из настроек, затем встроенный русский или английский текст.

## Сигнатура

<SignatureReference :names="['useMessages', 'plural']" />

## Множественное число

```ts
import { plural } from '@numior/kit';

const files = (count: number): string =>
  `${count} ${plural('ru', count, { one: 'файл', few: 'файла', many: 'файлов', other: 'файлов' })}`;
```

`plural(language, count, forms)` выбирает форму слова по числу через `Intl.PluralRules`. Если
нужной формы нет, берётся `other`. `language` — язык, на котором написаны формы, а не локаль
приложения.

Порядок выбора подписи и новые языки описаны в [Локализации](/guide/localization).
