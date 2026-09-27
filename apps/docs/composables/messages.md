# useMessages

`useMessages(catalog, locale)` отдаёт тексты каталога на текущем языке с учётом слоёв
конфигурации: хук `translate`, переопределения `messages`, встроенный русский или
английский. Так каждый компонент kit получает свои подписи; `plural` выбирает форму слова по
числу.

## Сигнатура

<SignatureReference :names="['useMessages', 'plural']" />

## Множественное число

```ts
import { plural } from '@numior/vue';

const files = (count: number): string =>
  `${count} ${plural('ru', count, { one: 'файл', few: 'файла', many: 'файлов', other: 'файлов' })}`;
```

`plural(language, count, forms)` использует `Intl.PluralRules` и падает на `other`; язык —
тот, на котором написаны формы, а не локаль приложения. Порядок выбора текста и свои языки
описаны в [Локализации](/guide/localization).
