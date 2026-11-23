# Участие в разработке

## Порядок работы

Одна задача — одна ветка от свежего `master` и pull request. `master` защищён: в него попадают
только влитые PR, вливает владелец. Следующая ветка начинается после того, как влита предыдущая.
Worktree и копии репозитория для разработки не используются. Правило целиком —
[development-flow.rule.md](.archcore/development-flow.rule.md).

Коммиты и заголовки PR пишутся по Conventional Commits: `pnpm commitlint` проверяет сообщение,
CI проверяет заголовок PR.

## Окружение

Тулчейн — [Vite+](https://viteplus.dev) (`vite-plus` в devDependencies, команда `vp`): Vite и
Rolldown для сборки, Vitest для тестов, Oxlint и Oxfmt для проверки и формата, Vite Task для
задач с кешем. Все настройки лежат в корневом `vite.config.ts`. Версия Node закреплена в
`.node-version`, pnpm — в `packageManager`.

```sh
nvm install $(cat .node-version)
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

`pnpm dev` открывает playground на `http://localhost:5173`. `pnpm docs:dev` собирает изменённые
пакеты и запускает документацию RU/EN: руководства и страницы компонентов с примерами и API из
справочного бандла (`pnpm docs:reference`, `pnpm docs:check`).

## Структура

| Каталог           | Содержимое                                                |
| ----------------- | --------------------------------------------------------- |
| `.archcore`       | План, архитектурные решения и правила                     |
| `packages`        | Пакеты кита, [карта](packages/README.md)                  |
| `apps/playground` | Исполняемые примеры и фикстуры для браузерных тестов      |
| `apps/docs`       | Документация на VitePress, RU/EN, локальный поиск         |
| `tests/e2e`       | Playwright: Chromium, Firefox, WebKit и профили телефонов |
| `scripts`         | Сборка CSS и проверки выходных артефактов                 |

Перед изменением архитектуры, публичного API или компонентов прочитайте
[план](.archcore/numior-ui.plan.md), [основание](.archcore/modular-foundation.adr.md),
[правила качества](.archcore/engineering-quality.rule.md) и
[правила компонентов](.archcore/component-authoring.rule.md). Правила для агентов — в
[AGENTS.md](AGENTS.md).

## Проверки

Перед PR запустите `pnpm check`, а для браузерного поведения — `pnpm test:e2e`.

| Команда                              | Проверка                                                                                                     |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `pnpm check`                         | `check:ci` и бюджеты времени (`test:budget`)                                                                 |
| `pnpm check:ci`                      | Формат, lint, типы, анализ, unit, build, artifacts, docs; шаги идут через `vp run --cache`                   |
| `pnpm lint`                          | `vp lint` (Oxlint) для JS/TS и eslint-plugin-vue для шаблонов                                                |
| `pnpm format` / `pnpm format:check`  | `vp fmt` (Oxfmt): запись / проверка                                                                          |
| `vp run typecheck`                   | vue-tsc: Vue SFC и TypeScript strict, декларации `.vue.d.ts` для type-aware `vp lint`                        |
| `pnpm analyze`                       | Fallow: dead code/deps/cycles/boundaries, дубли, сложность и CRAP по покрытию unit-тестов                    |
| `pnpm test` / `vp run test:coverage` | `vp test` (Vitest 5); coverage V8 в формате Istanbul для Fallow в `node_modules/.cache/coverage`             |
| `vp run test:budget`                 | Сценарии с меткой `budget` (бюджеты времени) без инструментации; coverage их не запускает                    |
| `pnpm test:e2e`                      | Playwright по production build, темы, RTL, Tailwind, axe                                                     |
| `pnpm arch:check`                    | Archcore CLI: структура документов и связи                                                                   |
| `pnpm bench:engine`                  | Бенчмарк движка таблицы в Node на миллионе строк, запись в `packages/table/bench/results`                    |
| `pnpm bench:editor`                  | Бенчмарк ядра редактора в Node на документе из 10 000 блоков, запись в `packages/editor-core/bench/results`  |
| `pnpm bench:spreadsheet`             | Бенчмарк ядра листа в Node: миллион ячеек и 100 000 формул, запись в `packages/spreadsheet/bench/results`    |
| `pnpm bench:browser`                 | Бенчмарк `NuiTable` в Chromium: ввод до отрисовки, кадры прокрутки, монтаж, куча                             |
| `pnpm bench:check`                   | Сверка последних результатов с порогами `packages/{table,vue,editor-core,spreadsheet}/bench/thresholds.json` |

Повторный `pnpm check` без изменений берёт шаги из кеша Vite Task (`node_modules/.vite/task-cache`,
очистка — `vp cache clean`): шаг перезапускается, только если изменился прочитанный им файл.
Без кеша идут `test:nuxt` и `docs:build`: под отслеживанием файлов Vite+ не может запустить
служебный процесс esbuild, который им нужен.

### Браузерные тесты

Перед первым запуском: `pnpm exec playwright install`, в Linux без системных библиотек —
`pnpm exec playwright install --with-deps`. Playwright 1.63 не поддерживает Ubuntu 20.04: там
тесты идут в официальном образе `mcr.microsoft.com/playwright:v1.63.0-noble` с Node 24.21.0.

CI ставит Node, pnpm и `vp` через `voidzero-dev/setup-vp`, хранит кеш Vite Task между запусками и
запускает `pnpm check:ci`. Бюджеты времени и браузерная матрица идут локально: стандартный раннер
GitHub не держит бюджеты, а e2e на нём занимает 2,5–3 часа.

## Релизы

Conventional Commits, commitlint и semantic-release с общей версией пакетов настроены; до 1.0
библиотеки выходят как `1.0.0-alpha.N` по кнопке релиза. `pnpm release:check` входит в
`pnpm check` и проверяет процесс без публикации. Кнопка, npm Trusted Publishing и восстановление
описаны в
[docs/releases.md](docs/releases.md).
