# Code

`NuiCode` — блок кода с шапкой, кнопкой копирования, номерами строк, подсветкой строк и
сворачиванием длинного вывода. Цвета синтаксиса приходят токенами: их даёт любой
подсветчик, в этой документации — Shiki на этапе сборки. Без токенов код выводится одним
цветом.

<Example name="code/Basic" />

## Установка

```ts
import { NuiCode } from '@numior/vue';
import '@numior/vue/styles/button.css';
import '@numior/vue/styles/code.css';
```

## Примеры

### Длинный вывод

`maxLines` сворачивает код до указанного числа строк и добавляет кнопку разворота; `wrap`
переносит длинные строки вместо горизонтальной прокрутки.

<Example name="code/Collapsed" />

## Подсветчик

Без `tokens` блок спрашивает подсветчик из `createNuiConfig({ highlighter })` или из пропа
`highlighter`; `false` выключает подсветку. Подсветчик знает свои языки с алиасами и отдаёт
токены сразу или обещанием. Пока ответа нет, и на сервере, код выводится одним цветом той же
высоты, ответы кешируются по языку и тексту.

Готовый подсветчик на Shiki лежит в отдельном входе: Shiki грузится при первой подсветке, а
грамматики — по одной на язык.

```ts
import { createNuiConfig } from '@numior/vue';
import { createShikiHighlighter } from '@numior/vue/shiki';

app.use(createNuiConfig({ highlighter: createShikiHighlighter() }));
```

<SignatureReference :names="['useHighlighter', 'highlightCode', 'languageOf', 'NuiHighlighter']" />

## Поведение

`tokens` описывают строки параллельно `code`: каждая строка — список фрагментов с областью
`keyword`, `string`, `number`, `function`, `type`, `tag`, `attribute`, `property`, `comment`,
`punctuation` или `variable`. Цвета областей задают токены `--nui-syntax-*` темы. Копирование
идёт через буфер обмена с запасным путём для старых браузеров; без шапки кнопка плавает в
углу.

## Доступность

Кнопка копирования подписана словарём, а результат сообщает элемент с `role="status"`.
Код лежит в `<pre>`, поэтому скринридер читает его построчно; номера строк не попадают в
выделение и копирование.

## API

<ApiReference name="NuiCode" />
