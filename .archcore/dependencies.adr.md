---
title: "Внешние зависимости: VueUse и lodash-es"
status: accepted
---

## Context

Kit писался с нуля: `engineering-quality.rule.md` требовал «писать код kit с нуля», а
`numior-ui.plan.md` допускал узкие зависимости после проверки лицензии и размера. На втором
ревью документации (2026-09-27) пользователь спросил, почему kit не использует VueUse и lodash,
и решил: обе библиотеки становятся зависимостями, свои реализации удаляются там, где у
библиотеки есть эквивалент. Перед решением каждый экспорт `@numior/primitives` и каждый
помощник `@numior/forms` были сверены с `@vueuse/core` 15.0.0 и `lodash-es` 4.18.1.

## Decision

- `@vueuse/core` 15.0.0 (MIT, `sideEffects: false`, peer `vue ^3.5`) — зависимость
  `@numior/primitives` и `@numior/vue`; `lodash-es` 4.18.1 (MIT) с `@types/lodash-es` —
  зависимость `@numior/forms`. Версии точные (`save-exact`), пакеты внешние в сборке Vite,
  `check-artifacts.mjs` проверяет, что сборка одной `NuiButton` не тянет `@vueuse/core`.
- Правило: своя реализация допустима только там, где у VueUse или lodash-es нет эквивалента
  с тем же поведением; каждое исключение перечислено здесь и обновляется вместе с кодом.
- Заменено библиотекой: слушатели событий с временем жизни компонента (`useEventListener`:
  подсказка, тостер, скролл-спай, виртуальный список), `useResizeObserver` (виртуальный
  список, тостер, таблица, список вкладок),
  `useRafFn` для автопрокрутки перетаскивания, `clamp` вместо семи локальных копий, в формах
  `toPath`/`get`/`set` вместо `segmentsOf`/`normalizePath`/`getAt`/`setAt` (пути передаются
  массивами сегментов, поэтому lodash не трактует `a.b` как литеральный ключ).
- Обёрнуто с сохранением публичной сигнатуры: `useMediaQuery` (VueUse + `useMounted`, значение
  остаётся `false` до монтирования ради гидрации), `useClipboard` (запись своя: VueUse глотает результат
  `execCommand` и читает `copiedDuring` один раз, поэтому обёртка сама пишет через
  `writeText` с запасным `execCommand`, возвращает его boolean и берёт `copiedDuration` при
  каждом копировании; от VueUse остаётся `useTimeoutFn`), `useHotkey` (парсер комбинаций, `mod`, псевдонимы и защита
  редактируемых целей свои, слушатель — `onKeyStroke`), `useDelayedOpen` (`useTimeoutFn`,
  задержка ≤ 0 применяется синхронно).
- Оставлено своё, потому что эквивалент меняет поведение: `useColorScheme` (`useColorMode`
  пишет только light/dark, не знает `system`, читает storage в setup и ломает гидрацию,
  вставляет `transition: none`, не имеет общего контрола и pre-paint скрипта);
  `useVirtualList` (`useVirtualList` VueUse владеет контейнером, ставит обёртку с margin,
  которая не встаёт в `<tbody>`, не рендерит строки на сервере, не умеет закреплённый индекс);
  `useFileDrop` (`useDropZone` принимает любое перетаскивание текста и ссылок);
  `useControlId` (`uniqueId` — глобальный счётчик, ломает SSR); `useDirection`,
  `useListNavigation`, `useFloating`, `usePopover`, `useDialog`, таймеры тостов с паузой по
  остатку, `useReorder`, `useBlockSizeTween`, `useSplitAttrs`, словари, маски, даты, intl,
  очередь загрузки; в формах `cloneValue` (`cloneDeep` копирует экземпляры классов и элементы
  Set, которые `forms.adr.md` держит по ссылке), `isEqualValue` (`isEqual` считает
  `{ a, b: undefined }` ≠ `{ a }`, поэтому очищенные поля читались бы как грязные; файлы
  сравниваются по идентичности), `deleteAt` (`unset` оставляет дыры в массивах), `mergeInto`
  (`merge` сливает массивы по индексу), дебаунс асинхронных правил (токен на поле и abort),
  `clampNumber` (lodash `clamp` с одной границей считает её верхней); в ядре редактора
  `sameDocJSON` (`isEqual` различает отсутствующее поле и пустое и на документе в 10 000 блоков
  работает 24 мс против 3–6 мс). С 2026-11-10 `lodash-es` — зависимость и `@numior/editor-core`
  (решение пользователя: общие утилиты ядро берёт из lodash, а не пишет свои).

## Alternatives Considered

- Оставить всё своё (прежнее правило): дублирует проверенный код там, где библиотека даёт
  ровно то же поведение, и не отвечает на вопрос владельца.
- Взять `useColorMode`, `useVirtualList`, `cloneDeep`/`isEqual`: перечисленные выше отличия
  ломают гидрацию, таблицу и грязное состояние форм.
- `@vueuse/integrations` и `@vueuse/math`: не нужны, `clamp` есть в `@vueuse/core`.

## Consequences

- `@numior/primitives` получает ~6 КБ gz при полном использовании VueUse, `NuiButton` без
  него; формы — `toPath`/`get`/`set` (~3 КБ gz).
- В jsdom нет Clipboard API и Permissions API, поэтому VueUse копирует через
  `document.execCommand`; тесты используют `packages/primitives/test/support/clipboard.ts`
  (`installClipboard`), e2e-стаб перехватывает `navigator.clipboard.write` и `execCommand`.
- `useMediaQuery` вызывает `matchMedia` в setup (значение по-прежнему `false` до монтирования);
  фейковые `MediaQueryList` в тестах передают `{ matches }` слушателю.
- Скролл-спай создаёт наблюдатель после монтирования в post-flush: тесты ждут `nextTick`.
- `engineering-quality.rule.md` и `numior-ui.plan.md` ссылаются на этот документ; новая
  зависимость в базовом UI по-прежнему требует записи здесь.

## Tailwind 4 вместо собственных утилит (2026-09-28)

`@numior/utilities` (модули `layout`, `spacing`, `sizing`, `typography`, `color`, `shape`)
удалён: он дублировал Tailwind и делал примеры доки некопируемыми для Tailwind-проектов.
`@numior/tailwind/theme.css` теперь кладёт токены на стандартные имена Tailwind 4
(`--color-*`, `--radius-*`, `--spacing`, `--text-*` с высотой строки, `--font-weight-*`,
`--leading-*`, `--shadow-*`, `--container-prose`), красит границы по умолчанию в `--nui-border`
и объявляет `@utility grid-auto`, `grid-auto-sm`, `grid-auto-lg`, `bg-dots`. Проза
`.nui-prose` переехала в `@numior/tokens/prose.css`. Дока и playground собираются через
`@tailwindcss/vite` и работают под preflight; компоненты по-прежнему на BEM CSS без
зависимости от Tailwind. Под preflight у голых элементов нет браузерных стилей, поэтому
`prose.css` описывает заголовки, списки и таблицы явно и каждым правилом покрывает и прозу,
вложенную в `.nui-not-prose` (`.nui-not-prose .nui-prose …`): пример прозы внутри превью
доки оформляется как страница. Решение пользователя после второго ревью доки.

## fast-check для свойств ядра редактора (2026-10-03)

`fast-check` 4.10.2 (MIT, точная версия) — dev-зависимость `@numior/editor-core`. Он генерирует
случайные документы и правки и сжимает контрпример до минимального, когда свойство нарушено:
обратимость шагов, монотонность отображений, валидность документа после каждого шага. В сборку
пакетов он не попадает. План волны 7 называет его среди немногих разрешённых новых
dev-зависимостей; своя замена потребовала бы собственного генератора со сжатием.

## Shiki как необязательный peer `@numior/vue` (2026-10-17)

- `shiki` 4.4.3 (MIT) — необязательный peer `@numior/vue` и только для входа `@numior/vue/shiki`:
  `createShikiHighlighter` грузит его через `import('shiki')` при первой подсветке и
  догружает грамматики по одной; `SHIKI_LANGUAGES` — список с алиасами для выбора языка;
  `shikiTokens` переводит TextMate-скоупы в `NuiSyntaxScope` (карта переехала из доков).
- `shikiTokens` зовёт `codeToTokensBase` с `tokenizeTimeLimit: 0` (2026-10-18). Со
  `includeExplanation` Shiki 4.4 токенизирует строку дважды, у каждого прохода свой лимит в
  500 мс; под нагрузкой один проход обрывается, списки токенов расходятся, и Shiki падает на
  `tokenWithScopes.startIndex`. Так дважды за день падала сборка доков в чистом worktree. Лимит
  в этом режиме не защищает, а ломает токенизацию, поэтому он выключен.
- Базовый бандл `@numior/vue` и остальные пакеты Shiki не импортируют (`check-artifacts`).
  Без входа подсветчиком может быть любой объект `NuiHighlighter` из `@numior/primitives`.
- Альтернатива — свой подсветчик на регулярных выражениях — отвергнута интервью: качество
  грамматик Shiki на десятках языков своим кодом не повторить.

## Inter в песочнице (2026-11-08)

Токен `--nui-font` начинается с `Inter`, но кит шрифтов не поставляет: шрифт загружает
приложение, как у shadcn. Песочница его не загружала, поэтому вид зависел от машины, а в
Docker-образе Playwright `sans-serif` подставлял китайский WenQuanYi Zen Hei (многоточие по
середине строки, кириллица ниже центра). По решению пользователя Inter подключён только в
песочнице: `@fontsource-variable/inter` 5.3.0 (OFL-1.1, вариативный файл с кириллицей и
`unicode-range`, грузятся только нужные наборы) — зависимость `apps/playground`, импорт в
`main.ts`, а `style.css` песочницы ставит `--nui-font: 'Inter Variable', Inter, …` на тех же
селекторах, что и тема (`:root`, `[data-nui-theme]`). Пакеты кита и доки не меняются.

## ws для эталонного сервера совместной правки (2026-11-09)

`ws` 8.22.2 (MIT, точная версия) и `@types/ws` 8.18.2 — dev-зависимости `@numior/collaboration`.
Сервер в `packages/collaboration/server/` нужен тестам и песочнице, не экспортируется и в сборку
пакета не попадает (`check-artifacts.mjs` проверяет отсутствие импорта `ws`). В клиенте используется
встроенный `WebSocket`. Заменим любой реализацией сокетов: вся логика — в `room.ts`, `ws` знает
только `server.ts`.

## yjs как необязательный peer `@numior/collaboration` (2026-11-09)

`yjs` 13.6.33 (MIT, транзитивно `lib0`) — необязательный peer и dev-зависимость `@numior/collaboration`.
Импортируется только в точке входа `./yjs`; `.` и `./vue` его не содержат, это проверяет
`check-artifacts.mjs`. Основной протокол шагов остаётся без него, Yjs нужен только потребителям с уже
существующей инфраструктурой на нём.
