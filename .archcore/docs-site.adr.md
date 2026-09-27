---
title: "Сайт документации из компонентов kit: движок, шаблон страницы, генерация API, LLM-доступ"
status: accepted
date: 2026-09-27
---

## Context

Документация `apps/docs` стояла на теме VitePress по умолчанию: демо жёстко в светлой теме,
74 из 84 блоков кода расходились с демо над ними, таблицы API писались руками, а слоты, события
и CSS описывались абзацами; проза пересказывала внутренности (BEM-элементы, приватные
переменные) и оговорки. Проверял доку только `vitepress build`, поэтому пустые демо проходили
CI. Пользователь назвал такую доку «нейрослопом» и задал планку: уровень ui.shadcn.com и
vuetifyjs.com, весь интерфейс доки — из компонентов и утилит самого kit. Решения согласованы
в интервью 2026-09-26 (план `frolicking-twirling-simon`, 23 решения).

## Decision

- Граница kit: всё, чего доке не хватает, становится полноценной частью kit (unit/SSR/e2e/axe,
  секция playground, страница); `apps/docs` держит только тонкие композиции компонентов и
  утилит — ни одного `<style>` в приложении доки, её примерах и блоках.
- Движок: VitePress 1.6 со своей темой с нуля (без DefaultTheme и его CSS, без `vp-raw` и
  `postcssIsolateStyles`); остаются markdown→Vue, SSG с гидратацией, i18n-маршруты,
  `@localSearchIndex`, проверка битых ссылок.
- Локали: RU в корне (эталонный текст), EN под `/en`, обе в одном изменении.
- Примеры — настоящие SFC, по файлу на локаль (`apps/docs/examples/{ru,en}/<comp>/<Name>.vue`):
  один файл рендерится в превью и показывается в коде; скрипт паритета сравнивает AST RU/EN с
  точностью до строк. Встроенные тексты берутся из словаря kit.
- Шаблон страницы компонента: заголовок и одна фраза → превью/код → установка → использование
  (конфигуратор на страницах с визуальными пропами) → анатомия (составные) → примеры →
  доступность (таблицы клавиш и ARIA) → API внизу (Props, Events, Slots, Exposed, CSS; раздел
  на каждую часть). Справа оглавление.
- API генерируется на сборке (`vue-component-meta`, TypeScript API по `.d.ts`, каталоги
  словаря, разбор CSS); RU/EN-описания живут в `apps/docs/api/<name>.ts`; проверка падает на
  отсутствующем или устаревшем описании. Каждый компонент типизирует слоты через `defineSlots`.
- Каркас: верхняя панель на всю ширину над липкими сайдбаром и оглавлением; на телефоне
  сайдбар в ящике. Playground остаётся e2e-фикстурой; у доки свой e2e и axe по всем страницам.
- Текст: правило `docs-writing.rule.md` и линтер прозы в `pnpm check`; четыре эталонные
  страницы (Кнопка, Выбор, Карточка, Начало) проходят ревью пользователя до массового выката.
- Подсветка кода: блок кода kit принимает токены строк от любого подсветчика и рендерит
  простой код без них; цвета — `--nui-syntax-*`. Подсветчик (Shiki) — только в доке.
- Утилиты становятся модульными (`layout`, `spacing`, `sizing`, `typography`, `color`,
  `shape`, `prose`) с явными exports и манифестом `utilities.css`; проза (`.nui-prose`)
  стилизует только «голые» элементы контента и никогда не перебивает классы компонентов.
- Композаблы и хелперы получают свой раздел и справочники; сигнатуры — из `.d.ts`.
- LLM-доступ: `/llms.txt`, `/llms-full.txt` (EN) и RU-копии, markdown-двойник каждой
  страницы, локальный stdio-пакет `@numior/mcp` (только чтение, `check_usage` проверяет шаблон
  против API); всё читает один справочный бандл `docs:reference`.
- Порядок: сначала вся волна kit для доки, затем инфраструктура доки, эталоны и ревью,
  выкат, главная/«Темы»/справочники, блоки, в конце llms и MCP.

### Волна kit для доки (этап 1)

Токены: шкала заголовков `--nui-font-size-xl…4xl`, начертания `--nui-font-weight-*`,
`--nui-line-height-relaxed`, `--nui-tracking-tight`, `--nui-measure`; радиусы выводятся из
`--nui-radius-base` (`sm` = ½, `md` = 1, `lg` = 1½, `xl` = 2); `--nui-surface-code` и
`--nui-syntax-*` (keyword, string, number, function, type, tag, attribute, property, comment,
punctuation, highlight) с контрастом ≥ 4.5 к поверхности кода в обеих схемах; пресеты акцента
в отдельном `@numior/tokens/accents.css` через `data-nui-accent` (indigo, blue, violet,
emerald, teal, rose, orange, amber, slate) — пресет переопределяет пару `--nui-primary`, а
`[data-nui-accent]` пересчитывает `-soft`, `-soft-foreground` и `--nui-focus` на том же
элементе, поэтому работает и на вложенной области. Сборка CSS-пакетов (`scripts/build-css.ts`)
инлайнит относительные `@import`, как сборка `@numior/vue`.

Утилиты: `utilities.css` — манифест `@import`, модули `layout` (display, flex, grid,
`nui-grid-auto` с `--nui-grid-min`), `spacing` (только логические свойства), `sizing`,
`typography`, `color`, `shape`, `prose` — каждый самодостаточен и экспортируется отдельно.
`.nui-prose` стилизует элементы без класса вне `.nui-not-prose` через `:where()`, поэтому
его правила сильнее сбросов страницы (`h2 { … }`) и никогда не сильнее класса компонента;
модификаторы `--size-sm|lg`, ритм в `em`.

Примитивы: `useClipboard` (`supported` false-first, `copied` на `copiedDuration`),
`useHotkey('mod+k', handler, { enabled, target, inEditable })` — `mod` принимает Ctrl или Meta,
остальные модификаторы совпадают точно, редактируемые цели пропускаются, каркас переводит
на него Ctrl/Cmd+B; `useScrollSpy(ids, { root, rootMargin })` на IntersectionObserver —
активен первый видимый заголовок в полосе (по умолчанию верхние 40 % области), а когда
видимых нет, последний ушедший вверх; на сервере `undefined`. Цветовая схема:
`createNuiConfig({ colorScheme })` создаёт один общий контрол на приложение
(`useColorScheme()` без опций возвращает его, с опциями — локальный на область), `cycle()`
идёт light → dark → system, `colorSchemeScript(storageKey)` — строка инлайн-скрипта для
`<head>`, ставящая `data-nui-theme` из хранилища до первой отрисовки. Контрол безопасен для
гидратации: до монтирования `scheme` равен серверному значению (`initial` или `system`),
хранилище, атрибут области и `prefers-color-scheme` читаются в `start()` — его вызывает
`useColorScheme()` в `onMounted` и любая запись (`set`, `toggle`, `cycle`); поэтому разметка,
зависящая от схемы (точка радио-пункта меню, иконка), совпадает с SSR, а тема до гидратации
держится на инлайн-скрипте.

Иконки: алиасы sun, moon, monitor, copy, hash, link, languages, command, arrow-left,
arrow-right, code, eye, terminal, chevrons-up-down, chevron-up, smartphone, tablet, maximize,
grip-horizontal — для переключателя темы, языка, копирования, якорей заголовков, поиска,
вкладок превью/кода и рамки блоков. Кнопка: `href`/`to`/`as` переводят `NuiButton` на ссылку
(`<a>` или компонент роутера) с тем же оформлением; `disabled` ссылки — `aria-disabled`,
`tabindex="-1"` и без `href`, `loading` отменяет переход; `destinationAttrs` общий с NuiLink.

NuiSeparator: `role="separator"` (или `none` при `decorative`), `orientation`, подпись между
линиями через `label` или слот; вертикальный растягивается на высоту строки. NuiKbd: `keys` —
комбо `'mod+k'` или список, платформа определяется после монтирования (SSR и первый кадр —
`Ctrl`, на Apple после гидратации `⌘`), `platform` переопределяет; `variant="plain"` без
рамок для шорткатов меню — `NuiMenuRow` рендерит `shortcut` через него, поэтому строки
`'mod+r'` и готовые глифы работают одинаково.

NuiCode: `code` плюс необязательные `tokens` — строки из `{ text, scope }` от любого
подсветчика (scope из фиксированного списка keyword, string, number, function, type, tag,
attribute, property, comment, punctuation, variable), без токенов — простой текст; цвета
только из `--nui-syntax-*`. Заголовок с `title` или `language`, кнопка копирования
(`useClipboard`, глифы copy → check растворяются друг в друга, `role="status"` объявляет
«Скопировано»), номера строк CSS-счётчиком (не копируются), подсветка строк `highlight`,
перенос `wrap`, `maxLines` сворачивает длинный код за кнопкой «Показать всё» с плавной
высотой через `useBlockSizeTween`. Прокручиваемая область фокусируемая. Тексты — каталог
`code`.

NuiToggleGroup: `items` с иконкой и подписью, одиночный (`role="radio"` + `aria-checked`,
`required` запрещает снять выбор) или `multiple` (`aria-pressed`, модель `values`), варианты
`outline` (сросшиеся кнопки) и `segmented` (подложка с приподнятым выбранным элементом),
`iconOnly` с `aria-label`, `orientation`; стрелки только переносят фокус
(`useListNavigation`, покой на выбранном), выбор — Space/Enter/клик. Модель и ключи — общий
`useOptionSelection`.

NuiCollapsible: кнопка с `aria-expanded`/`aria-controls`, необязательная обёртка-заголовок
`headingLevel`, панель на `grid-template-rows: 0fr → 1fr`; содержимое получает
`hidden="until-found"` только после завершения схлопывания (по `transitionend`), поэтому
поиск по странице находит закрытые разделы (`beforematch` открывает), а анимация закрытия
видит контент до конца; варианты `plain` и `card`. NuiAccordion: контекст открытых значений
(`modelValue` или `values` при `multiple`, `collapsible` запрещает закрыть последний),
`NuiAccordionItem` рендерит NuiCollapsible, стрелки и Home/End ходят по заголовкам.

NuiCommand: поле `role="combobox"` с виртуальным фокусом (`aria-activedescendant`) над
NuiList (`selectable="single"`, `keyboard=false`), группы, иконки, описания, шорткаты через
`NuiKbd` (поле `shortcut` у записей списка), фильтр по подписи, описанию и `keywords` либо
`filter=false` для серверного поиска с `search`, первый результат активируется до рендера,
Enter выбирает активный, `select` не хранит выбор. NuiCommandDialog оборачивает его в
NuiDialog с `placement="top"` и `bare` (заголовок скрыт визуально, тело без отступов, кнопки
закрытия нет — Esc в поле), горячая клавиша `mod+k` через `useHotkey`, выбор закрывает.

NuiToc: `nav` с подписью из словаря, вложенные `ol` ссылок `#id`, текущий раздел от
`useScrollSpy` помечен `aria-current="location"` и полосой у начала; собственная разметка, а не
NuiList, потому что оглавление — ссылки-якоря без выбора и roving-фокуса. NuiSkipLink:
фиксированная ссылка, видимая только в фокусе; по активации переносит фокус на цель
(`tabindex="-1"` при необходимости) и обновляет hash без прокрутки истории.

NuiSplitter: две панели со слотами `start`/`end`, разделитель `role="separator"` с
`aria-valuenow` в процентах и `aria-controls` первой панели; доля первой панели — модель
`ratio` в границах `min`/`max`, пишется в `--_ratio` и раскладывается через `flex-basis`;
перетаскивание с захватом указателя (учитывает RTL), стрелки шагают на `step`, Home/End —
к границам; ориентация `horizontal`/`vertical`. Нужен рамке блоков в доке.

Каркас: `header="full"` кладёт панель над строкой «сайдбар + контент + колонка `end`»
(`--_sticky-top` = высота панели), `sticky` прилипает сайдбар и колонку `end` к области
просмотра, когда прокручивается сама страница; колонка `end` (`endWidth`) скрыта на узких
экранах; модификатор `--pending` до монтирования прячет десктопный сайдбар под 48rem, чтобы
телефон не мигал сайдбаром до гидратации; `useLayout` экспортирован. NuiSidebarGroup
`collapsible` сворачивает группу за подписью-кнопкой (`aria-expanded`, `inert`), NuiSidebarSub
раскрывается сам, когда вложенный пункт становится текущим (контекст `reveal`).

Далее в волне: `defineSlots` во всех компонентах;
кнопка-ссылка; NuiSeparator, NuiKbd, NuiCode, NuiToggleGroup, NuiCollapsible/NuiAccordion,
NuiCommand, NuiToc, NuiSkipLink, NuiSplitter; режимы NuiLayout.

### Каркас доки (этап 2, шаг 1)

Тема VitePress написана с нуля: `theme/index.ts` отдаёт `Layout` и регистрирует kit,
`config.ts` типизирован через `defineConfigWithTheme<DocsThemeConfig>` (`nav`, `sidebar`,
`texts` на локаль, `search.provider = 'local'`), `appearance: false` и инлайн
`colorSchemeScript('nui-theme')` в `head` вместо скрипта VitePress. `Layout.vue` — NuiSkipLink и
NuiLayout (`header="full"`, `sticky`, `end-width`, мобильный порог 64rem) с частями `parts/*`:
DocsHeader (NuiAppBar: триггер сайдбара на телефоне, словомарка, разделы, кнопка поиска с
NuiKbd, меню темы на NuiMenuRadioGroup поверх общего контрола, меню языка со ссылками на ту
же страницу другой локали), DocsSidebar (NuiSidebar и сворачиваемые группы из конфига),
DocsPage (`<article class="nui-prose">` с `Content` и пейджер на NuiCard), DocsToc (NuiToc по
`page.headers` 2–3 уровней), DocsHome, DocsNotFound (NuiEmpty), DocsSearch (NuiCommandDialog
без собственного фильтра над MiniSearch-индексом `@localSearchIndex` локали; пустой запрос
показывает страницы сайдбара). `useDocs()` даёт тексты локали, ссылки локалей, плоский список
страниц, пейджер и проверки текущего пути. Стили — только классы утилит: ни одного `<style>`.

Markdown-правила (`.vitepress/markdown`): fence → `<NuiCode>` с токенами Shiki
(`github-light` только как источник скоупов, цвета — `--nui-syntax-*`; `title=`, `{2,4-6}`,
`:line-numbers`), JSON пропов экранируется в атрибуте целиком (`&`, `'`, `<`, `>`), иначе
индекс поиска и парсер шаблона видят обрывки; ссылки → `<NuiLink>` (внешние с `external`);
`::: tip|info|warning|danger` → NuiAlert, `::: details` → NuiCollapsible; якорь заголовка
рендерится собственным пермалинком `<a class="nui-prose__anchor">` с подписью на языке
страницы — простым `<a>`, а не компонентом, потому что индексатор поиска VitePress режет
страницу на разделы по `<hN>…<a href="#…">`. Часть `nui-prose__anchor` живёт в модуле prose
(символ `#` появляется при наведении и фокусе). Старые страницы с `vp-raw`/`demo.css`
собираются в новом каркасе до выката (этап 4).

### Примеры доки (этап 2, шаг 2)

Примеры — настоящие SFC в `apps/docs/examples/{ru,en}/<компонент>/<Имя>.vue`; папка с
`index.vue` и соседними файлами — многофайловый пример. Vite-плагин `docsExamples`
(`.vitepress/examples/plugin.ts`) отдаёт виртуальный реестр `virtual:nui-examples`
(локаль → имя → ленивый импорт) и по модулю `virtual:nui-example/<локаль>/<имя>` на пример:
компонент плюс исходник и токены Shiki каждого файла, с `addWatchFile` для перезагрузки.
Виртуальные id вместо `?query` на `.vue`, потому что плагин Vue считает любой запрос к
`.vue` без `vue&type` главным модулем SFC и пытается его скомпилировать. В markdown
`<Example name="button/Basic" />` (`DocsExample` → `Suspense` → `ExampleView` с
`await loadExample` → `ExampleFrame`): переключатель «Превью | Код» на NuiToggleGroup,
опции «обратная тема» (`data-nui-theme` противоположная разрешённой схеме) и «справа налево»
(`dir="rtl"`) на рамке превью, копирование текущего файла через `useClipboard`, вкладки
файлов на NuiTabs, код в NuiCode (`maxLines` 30); всё на классах утилит, рамка превью —
`role="group"` с именем. Паритет RU/EN проверяет `pnpm docs:check`
(`apps/docs/scripts/check-examples.ts` → `parity.ts`): сигнатура шаблона по AST
`@vue/compiler-core` (теги, имена атрибутов, директивы с выражениями), скрипт и прочие файлы
без строковых литералов; отдельно — отсутствующая пара и блок `<style>`. Примеры входят в
Fallow как entry, `en/**` исключён из поиска дублей. Правило для новых компонентов и
скилл `nui-component` ссылаются на этот формат.

### Справочный бандл (этап 2, шаг 3)

`pnpm docs:reference` (`apps/docs/scripts/reference.ts` → `.vitepress/reference/build.ts`)
собирает `apps/docs/.reference/bundle.json` (в `.gitignore`, схема `version: 1` в
`reference.types.ts`): компоненты `@numior/vue` и `@numior/forms` по экспортам `index.ts`
через `vue-component-meta` (пропы с типом без хвоста `| undefined`, `kind`
boolean/enum/string/number/function/other и литералы enum, `required`, `default`;
`update:x` + проп `x` сворачиваются в модель `v-model[:x]`; события, слоты с типами
слот-пропов, `exposed`), стили семейства (`@numior/vue/styles/<семейство>.css`, BEM-блоки с
частями и модификаторами и читаемые `--nui-*` из CSS), пространство словаря семейства и
сами каталоги (`*.messages.ts` импортируются напрямую, функции — как исходник), объявления
трёх пакетов из `dist/index.d.ts` через TypeScript API (`kind` function/value/type и
сигнатура), токены из `theme.css` (`light-dark()` разбирается на светлое и тёмное) и
алиасы иконок из `default-icons.ts`. `vue-component-meta` выводит слоты из шаблона, поэтому
поголовный `defineSlots` из плана не нужен: он остаётся способом типизировать слот-пропы.
Описания RU/EN и таблицы клавиш живут в `apps/docs/api/<семейство>.ts` (`DocsMap`: имя
компонента → `props`/`models`/`events`/`slots`/`exposed`/`keyboard`); `pnpm docs:check`
(`reference.ts --check`) падает на неполном или устаревшем описании у компонента с файлом
описаний, а компоненты без файла считает задолженностью выката (этап 4). Vite-плагин
`docsReference` отдаёт `virtual:nui-reference` (ленивые импорты компонентов и каталогов) и
срезы `virtual:nui-reference/<component|catalog>/<имя>`, `tokens`, `icons`, `declarations`;
`<ApiReference name="NuiButton" />` (или `:names`) рендерит через `Suspense` таблицы
свойств, моделей, событий, слотов, exposed на NuiTable, клавиши на NuiKbd, импорт стилей в
NuiCode и части/модификаторы в NuiBadge; описания берутся по локали страницы. Сборка доки
и `docs:dev` запускают генерацию первыми.

### Конфигуратор и поиск по API (этап 2, шаг 4)

`<Configurator name="NuiButton" />` (`DocsConfigurator` → `Suspense` → `ConfiguratorView` →
`ConfiguratorFrame`) берёт из справочного бандла перечень пропов и содержимое, заданные в
`apps/docs/api/<семейство>.ts` (`configurator: { props, content }`; `docs:check` падает на
несуществующем пропе). Панель — NuiField на каждый проп: enum → NuiSelect по литералам,
boolean → NuiSwitch, number → NuiNumberField, string → NuiInput, плюс поле содержимого;
состояние держится в типизированных картах по роду пропа (`configuratorState`), живой
компонент рендерится по имени (все `Nui*` из `@numior/vue` и `@numior/forms`
регистрируются в теме циклом по экспортам), код печатает только отличия от дефолтов
(`configuratorCode`) и подсвечивается Shiki, который грузится лениво на клиенте после
монтирования (`useVueTokens`); на сервере код отдаётся без токенов. Локальный поиск получает
текст API через `themeConfig.search.options._render`: к исходнику страницы дописываются
разделы `### <компонент>` с пропами, моделями, событиями и слотами и описаниями на языке
страницы (`apiSearchText`), так что описания пропов находятся по Ctrl+K.

### Проверки текста и сборки (этап 2, шаг 5)

Правило `docs-writing.rule.md` закреплено линтером прозы
(`.vitepress/content/prose-lint.ts`): абзацы до трёх предложений, предложения до 25 слов,
запрещённые обороты по локали, имена BEM и приватные переменные вне раздела `## API`;
код, таблицы, заголовки, теги и контейнеры пропускаются. `check-content.ts` гонит его по
страницам вне `content/pending.ts` (список старых страниц, который сокращается по мере
переписывания) и запрещает `<style>` в любом `.vue` и `.md` приложения доки;
`check-dist.ts` после сборки ищет в HTML неразрешённые теги `Nui*`, `Example`,
`ApiReference`, `Configurator`. Оба входят в `pnpm check` (`docs:check` до сборки,
`check:dist` после). Проверка покрытия экспортов страницами откладывается до выката
(этап 4), когда появятся страницы для всех компонентов.

### Временное исключение по документации

Пока новая дока не построена, страницы компонентов и токенов этой волны не пишутся в старом
формате: они появляются сразу в новом на этапе выката. Перечень задолженности ведётся здесь и
закрывается выкатом:

- токены: типографика, `--nui-surface-code`/`--nui-syntax-*`, `--nui-radius-base`,
  `accents.css` (страница «Темы» и справочник токенов);
- утилиты: модули и проза (гайд «Утилиты и проза»);
- примитивы `useClipboard`, `useHotkey`, `useScrollSpy`, общая цветовая схема и
  `colorSchemeScript` (раздел «Композаблы», гайд «Темы»);
- новые алиасы иконок (справочник иконок) и кнопка-ссылка (страница «Кнопка»);
- NuiSeparator и NuiKbd (страницы «Разделитель» и «Клавиша»);
- NuiCode (страница «Код»);
- NuiToggleGroup (страница «Группа переключателей»);
- NuiCollapsible и NuiAccordion (страницы «Сворачиваемый блок» и «Аккордеон»);
- NuiCommand и NuiCommandDialog (страница «Палитра команд»), `placement`/`bare` у диалога,
  `shortcut` у записей списка;
- NuiToc и NuiSkipLink (страницы «Оглавление» и «Ссылка к содержимому»);
- NuiSplitter (страница «Разделитель панелей»);
- каркас: `header`, `end`, `sticky`, сворачиваемые группы и автораскрытие подсписка (страница
  «Каркас и боковая панель»).

## Alternatives Considered

- Оставить DefaultTheme и переопределять его стили: дока не доказывает самодостаточность
  kit, а конфликт стилей (`vp-raw`) остаётся.
- Своё приложение на Vite + SSG или Nuxt Content: больше собственной инфраструктуры
  (роутинг, поиск, SSG), пока Nuxt-модуля нет.
- Пресеты акцентов в hex внутри `theme.css`: нет тёмных вариантов и растёт обязательный файл.
- Один набор примеров на английском: RU-страницы показывали бы английские демо.

## Consequences

Волна kit добавляет части, нужные любому приложению, а не только доке. Правило
`engineering-quality.rule.md` («изменение поведения отражать в RU/EN docs») на время волны
выполняется через список задолженности выше. `component-authoring.rule.md` требует от нового
компонента доку (примеры RU/EN, описания API, страница), как только новая инфраструктура
доки существует.
