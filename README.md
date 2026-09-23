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

Playground: `http://localhost:5173`. Автономный CSS — `/`, Tailwind fixture —
`/tailwind.html`. Документация RU/EN: `pnpm build && pnpm docs:dev`.

## Структура

| Каталог           | Содержимое                                                                        |
| ----------------- | --------------------------------------------------------------------------------- |
| `.archcore`       | Согласованный roadmap, архитектурные решения и стандарты                          |
| `packages`        | Tokens, примитивы, Vue-компоненты, утилиты, Tailwind; [карта](packages/README.md) |
| `apps/playground` | Исполняемые примеры и browser fixtures                                            |
| `apps/docs`       | VitePress, RU/EN, локальный поиск, живой Vue-пример                               |
| `tests/e2e`       | Chromium/Firefox/WebKit и мобильные профили                                       |
| `scripts`         | Сборка CSS и проверка выходных artifacts                                          |

Импорт `@numior/vue` не включает CSS автоматически. Подключайте
`@numior/tokens/theme.css` и `@numior/vue/styles.css`. Tailwind и `nui-*` утилиты
опциональны. В dev используется условие exports `@numior/source`; production
playground проверяет реальный `dist`, типы и внешнюю Vue-зависимость.

## Команды качества

| Команда                             | Проверка                                                   |
| ----------------------------------- | ---------------------------------------------------------- |
| `pnpm check`                        | Формат, lint, типы, анализ, unit, build, artifacts, docs   |
| `pnpm lint`                         | Oxlint для JS/TS и eslint-plugin-vue для шаблонов          |
| `pnpm format` / `pnpm format:check` | Oxfmt: запись / проверка                                   |
| `pnpm typecheck`                    | Vue SFC и TypeScript strict                                |
| `pnpm analyze`                      | Fallow: dead code/deps/cycles/boundaries, дубли, сложность |
| `pnpm test` / `pnpm test:coverage`  | Vitest и V8 coverage                                       |
| `pnpm test:e2e`                     | Playwright по production build, темы, RTL, Tailwind, axe   |
| `pnpm arch:check`                   | Archcore CLI: структура и связи                            |

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
диалог, выдвижная панель, поповер и подсказка с позиционированием через `useFloating`.
Всё это проходит unit, SSR, e2e и axe, но остаётся закрытой разработкой без публикации:
toast/alert/progress, навигация, данные, select/date/upload, формы как пакет и тяжёлые
модули плана ещё не начаты.
