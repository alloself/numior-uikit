# Numior UI

Собственный модульный UI kit для Vue 3.5+. Сейчас реализовано основание разработки;
пакеты приватные, полноценный 1.0 ещё предстоит. Клиентский код — MIT.

Принятый [план](.archcore/numior-ui.plan.md),
[архитектура](.archcore/modular-foundation.adr.md) и
[правила](.archcore/engineering-quality.rule.md) хранятся в Archcore.
Данные локальные, без cloud sync. `archcore status` проверяет документы и связи.

## Запуск

Версия Node закреплена в `.nvmrc`; pnpm — в `packageManager`.

```sh
nvm install
nvm use
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

Playground: `http://localhost:5173`, раскладка страницы на Tailwind 4 с пресетом `@numior/tailwind`. Документация RU/EN: `pnpm build && pnpm docs:dev` — руководство, страницы всех компонентов и
композаблов с примерами и API из справочного бандла (`pnpm docs:reference`, `pnpm docs:check`).

## Структура

| Каталог           | Содержимое                                                                            |
| ----------------- | ------------------------------------------------------------------------------------- |
| `.archcore`       | Согласованный roadmap, архитектурные решения и стандарты                              |
| `packages`        | Tokens, примитивы, Vue-компоненты, формы, Tailwind, Nuxt; [карта](packages/README.md) |
| `apps/playground` | Исполняемые примеры и browser fixtures                                                |
| `apps/docs`       | VitePress, RU/EN, локальный поиск, живой Vue-пример                                   |
| `tests/e2e`       | Chromium/Firefox/WebKit и мобильные профили                                           |
| `scripts`         | Сборка CSS и проверка выходных artifacts                                              |

Импорт `@numior/vue` не включает CSS автоматически. Подключайте
`@numior/tokens/theme.css` и `@numior/vue/styles.css`. Tailwind и `nui-*` утилиты
опциональны. В dev используется условие exports `@numior/source`; production
playground проверяет реальный `dist`, типы и внешнюю Vue-зависимость.

## Команды качества

| Команда                             | Проверка                                                                                  |
| ----------------------------------- | ----------------------------------------------------------------------------------------- |
| `pnpm check`                        | Формат, lint, типы, анализ, unit, build, artifacts, docs                                  |
| `pnpm lint`                         | Oxlint для JS/TS и eslint-plugin-vue для шаблонов                                         |
| `pnpm format` / `pnpm format:check` | Oxfmt: запись / проверка                                                                  |
| `pnpm typecheck`                    | Vue SFC и TypeScript strict                                                               |
| `pnpm analyze`                      | Fallow: dead code/deps/cycles/boundaries, дубли, сложность и CRAP по покрытию unit-тестов |
| `pnpm test` / `pnpm test:coverage`  | Vitest; coverage V8 в формате Istanbul для Fallow                                         |
| `pnpm test:e2e`                     | Playwright по production build, темы, RTL, Tailwind, axe                                  |
| `pnpm arch:check`                   | Archcore CLI: структура и связи                                                           |
| `pnpm bench:engine`                 | Бенчмарк движка грида в Node на миллионе строк, запись в `packages/grid/bench/results`    |
| `pnpm bench:browser`                | Бенчмарк `NuiDataGrid` в Chromium: ввод до отрисовки, кадры прокрутки, монтаж, куча       |
| `pnpm bench:check`                  | Сверка последних результатов с `packages/grid/bench/thresholds.json`                      |

Перед браузерными тестами: `pnpm exec playwright install`.
В Linux при отсутствии системных библиотек: `pnpm exec playwright install --with-deps`.
Playwright 1.63 требует поддерживаемую ОС; Ubuntu 20.04 для него уже не подходит.
Локальная матрица проверена в официальном `mcr.microsoft.com/playwright:v1.63.0-noble`
с Node 24.21.0. CI использует актуальный Ubuntu runner.
CI запускает `pnpm check`, coverage и всю браузерную матрицу; публикация отключена по умолчанию.

## Semantic release

Настроены Conventional Commits, commitlint и semantic-release с общей версией
пакетов, release notes, npm tarballs и GitHub Releases после CI в `master`.
Публикация выключена до полного 1.0: нужны явное включение repository variable
и снятие `private` у библиотек. `pnpm release:check` входит в `pnpm check` и
проверяет процесс без публикации. Подготовка remote, npm Trusted Publishing,
dry-run и восстановление описаны в [релизной инструкции](docs/releases.md).

## Анализ кода

Fallow — локальная закреплённая devDependency, вызывается через pnpm.
Публичные exports библиотек — поддерживаемый API даже при `private: true`:
точки входа объявлены явно, `includeEntryExports: false`. Остальной source graph
проверяется на неиспользуемый код. Исключены только outputs/caches; автоматическое
удаление findings не включено. Архитектурные зоны запрещают обратные зависимости.

Условие `@numior/source` также настроено в resolver Fallow: анализ работает до
сборки `dist`. CSS Tailwind fixture объявлен отдельной entry, поскольку его
подключает HTML. TypeScript 5.9.3 закреплён workspace override: автоматический
optional peer TypeScript 7 не предоставляет нужный Vue SFC compiler API.

Дубли и сложность — инженерные сигналы, не причина механически дробить функции.
Изолированное исключение требует объяснения. Не превращайте все исходники в entry
и не выключайте правила целиком ради зелёного отчёта.

## Границы готовности

Реализованы токены v2, headless-примитивы и первые компоненты: кнопка (variant × tone ×
size), иконки с ленивой загрузкой Lucide и реестром алиасов, поле формы с частями,
текстовые поля, чекбокс, радиогруппа, переключатель и слои на нативном top layer:
диалог, выдвижная панель, поповер и подсказка с позиционированием через `useFloating`,
обратная связь: уведомления с сервисом `useToast`, алерт, прогресс и скелетон;
навигация: ссылка, меню с подменю и check/radio-пунктами, вкладки, хлебные крошки и
пагинация; выбор: select и combobox с группами, множественным выбором и чипами на общей
модели опций и примитиве клавиатурной навигации `useListNavigation`; представление данных:
бейдж, аватар с группой, карточка с частями и интерактивным режимом, список со статическим
и выбираемым режимами, пустое состояние, дерево с каскадными чекбоксами и ленивой
подгрузкой и таблица с сортировкой, выбором строк, пагинацией, изменением ширины,
закреплением и перестановкой колонок, tree-строками, закреплёнными строками и
перестановкой строк (`useReorder`) — оба с виртуализацией на примитиве `useVirtualList`;
локаль из конфигурации (`useLocale`), числовое поле на `Intl.NumberFormat`,
поле времени с сегментами и подсказками, календарь (`single`/`multiple`/`range`, сетки
месяцев и лет, пресеты, номера недель) и пикеры даты, даты со временем и периода на строковой
модели без часового пояса; загрузка файлов с очередью и адаптером, каркас приложения с
верхней и боковой панелью на `NuiList`; словарь встроенных текстов с RU/EN, переопределением,
своими языками и хуком `translate`. Всё это проходит unit, SSR, e2e и axe. Начат пакет форм
`@numior/forms`: ядро (`useForm`, `useField`, `useFieldArray`, Standard Schema, встроенные и
асинхронные правила, скрытые поля, серверные ошибки) на собственном движке со сменным хранилищем
и компоненты `NuiForm`, `NuiFormField`, `NuiFieldArray` и `NuiSmartForm` (форма из конфигурации с
раскладкой, условиями, секциями, массивами и шагами) покрыты unit- и SSR-тестами, в playground
есть разделы регистрации, умной формы и мастера с e2e и axe, в документации — страницы «Формы» и
«Умная форма».
Всё остаётся закрытой разработкой без публикации; тяжёлые модули плана ещё не начаты.
