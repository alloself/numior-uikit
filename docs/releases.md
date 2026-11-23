# Релизы Numior UI

`semantic-release` выпускает общую версию библиотек `packages/*` с тегами `v1.2.3`. Root, docs и
playground всегда приватные. Независимость подключений пакетов сохраняется; номер версии у них
единый. Решение записано в [ADR релизов](../.archcore/semantic-release.adr.md).

## До 1.0: alpha по кнопке

Каждый релиз до 1.0 — `1.0.0-alpha.N`. master — prerelease-ветка `alpha`: номер растёт на единицу
и после `fix`, и после `feat`, и после `feat!`. Ветка `stable` нужна semantic-release как
обязательная stable-ветка и до 1.0 не меняется. Plugin отклоняет любую другую версию, поэтому
стабильный `1.0.0` случайно не выйдет.

Пакеты публикуются под npm-тегом `latest`: `pnpm add @numior/kit` ставит свежую alpha. На 1.0
`latest` перейдёт на `1.0.0`.

Релиз запускает кнопка **Actions → CI → Run workflow** на master. В том же запуске идут quality и
browsers, затем job `release` (если `NUMIOR_RELEASE_ENABLED=true`) и job `docs`, который выкладывает
сайт. Если с прошлой alpha были только `docs`, `test`, `chore`, `ci` или `refactor`, npm-шаг
ничего не выпускает, а сайт обновляется. Push в master релиз не запускает.

- `pnpm release:check` проверяет правила SemVer, блокировки, номера alpha, синхронные версии и
  реальные tarball с заменой `workspace:*`, не обращаясь к npm/GitHub для публикации.
- `pnpm release:dry-run` считает будущий релиз на реальной Git-истории. Нужны remote GitHub с веткой
  `stable` и `GITHUB_TOKEN` с доступом к репозиторию (`GITHUB_TOKEN=$(gh auth token)`).

Plugin не выпускает библиотеку, у которой в `dependencies` или `peerDependencies` стоит внешняя
prerelease-версия вроде `5.0.0-beta.1`. Dry-run и `pnpm release:check` такую зависимость
пропускают.

## Conventional Commits

| Коммит                                                             | До 1.0          | После 1.0  |
| ------------------------------------------------------------------ | --------------- | ---------- |
| `fix(vue): prevent duplicate submit`                               | следующая alpha | patch      |
| `feat(tokens): add semantic roles`                                 | следующая alpha | minor      |
| `feat(vue)!: replace button props` или footer `BREAKING CHANGE:`   | следующая alpha | major      |
| `docs:`, `test:`, `chore:`, `ci:`, `refactor:` без breaking change | без релиза      | без релиза |

`pnpm commitlint` принимает сообщение через stdin; PR workflow проверяет заголовок. Для GitHub
следует включить squash merge с заголовком PR в качестве сообщения squash-коммита. Прямых
коммитов в master нет: каждое изменение приходит веткой через MR
(`.archcore/development-flow.rule.md`). Remote — публичный репозиторий GitHub
`alloself/numior-uikit`.

## Первый запуск: что делает владелец

### npm

1. Завести аккаунт npm с 2FA (лучше ключ безопасности) и бесплатную организацию `numior`.
2. Создать granular access token: Packages and scopes → Read and write → организация `numior`,
   срок 7 дней, Bypass two-factor authentication. Положить его в секрет репозитория `NPM_TOKEN`
   (Settings → Secrets and variables → Actions).
3. Задать repository variable `NUMIOR_RELEASE_ENABLED=true`.
4. Ветка `stable` создаётся от master один раз и защищается от push.
5. Нажать Run workflow: выходят пятнадцать пакетов `1.0.0-alpha.1` с provenance и GitHub prerelease.
6. Удалить секрет `NPM_TOKEN` и отозвать токен на npmjs.com.
7. Перед следующей alpha запустить `pnpm release:trust --dry-run`, затем `pnpm release:trust`
   (npm 11.15 или новее, `npm login`). Первый запрос спросит 2FA; на странице 2FA можно разрешить
   пропуск на 5 минут, чтобы не подтверждать каждый из пятнадцати пакетов.
8. В течение двух суток нажать Run workflow: привязка без успешной публикации за это время
   истекает. Эта alpha выходит уже через OIDC, без секретов.
9. В настройках каждого пакета включить Publishing access → Require two-factor authentication and
   disallow tokens.

### Сайт документации

Сайт `https://ui.numior.ru/` лежит на Beget (Apache, `apps/docs/public/.htaccess`). Job `docs`
заливает `apps/docs/.vitepress/dist` той же сборки, что проверил `pnpm check`, через
`rsync --delete` по SSH; каталог `.well-known/` на сервере не трогается.

1. Выпустить в панели Beget SSL-сертификат для `ui.numior.ru` и включить редирект на HTTPS.
2. Включить SSH-доступ. Создать ключ только для выкладки:
   `ssh-keygen -t ed25519 -f numior-docs-deploy -C numior-docs-deploy -N ''`. Публичную часть
   (`numior-docs-deploy.pub`) добавить в `~/.ssh/authorized_keys` на Beget, приватную положить в
   секрет репозитория `DOCS_SSH_KEY`.
3. Repository variables: `DOCS_SSH_HOST` (SSH-хост из панели), `DOCS_SSH_USER` (логин),
   `DOCS_SSH_PATH` (каталог сайта, например `ui.numior.ru/public_html`), `DOCS_KNOWN_HOSTS`
   (вывод `ssh-keyscan -t ed25519 <host>`, сверенный с отпечатком из панели).

Счётчик Яндекс.Метрики загружается только на `ui.numior.ru` и только в верхнем окне
(`apps/docs/.vitepress/theme/metrika.ts`): dev-сервер, превью и e2e ничего не отправляют.

## Выполнение и восстановление

Commit analyzer определяет тип изменения, release-notes-generator — описание. Наш plugin
выставляет версию всех библиотек **до** упаковки. `pnpm pack` заменяет workspace ссылки на
точные версии; npm публикует tarballs с `--provenance --access public --tag latest`. GitHub
release содержит notes и те же tarballs. Подготовленные изменения manifest не коммитятся
обратно: источником версии остаются Git-теги и их git notes. Changelog доступен через GitHub
Releases.

`repository.url` и каталог пакета записываются из реального remote при prepare, чтобы metadata
соответствовали provenance. Conventional Commits preset закреплён на совместимой с changelog
writer версии. Fallow имеет одно узкое исключение для `conventional-changelog-conventionalcommits`:
semantic-release загружает preset динамически по короткому имени; интеграционный dry-run
проверяет его загрузку.

Публикация нескольких npm-пакетов не атомарна. При сбое часть пакетов и тег уже могут
существовать. Workflow сохраняет tarballs даже при ошибке. Не удалять теги и не пытаться
перезаписать опубликованную версию: сначала сверить registry, допубликовать только отсутствующие
пакеты из artifact того же SHA и восстановить GitHub release. Тег, поставленный вручную, получает
git note канала, иначе следующая alpha посчитается от другого канала:
`git notes --ref semantic-release-<tag> add -m '{"channels":["master"]}' <tag>` и push
`refs/notes/semantic-release-<tag>`.

Релизные workflows не отменяются новым запуском; PR-проверки можно отменять.

## Переход на 1.0

Когда выполнен полный план, одно изменение делает master stable-веткой в `release.config.mjs`,
снимает ограничение `1.0.0-alpha.N` в plugin и удаляет ветку `stable`. Первый stable-релиз после
этого — `1.0.0`. Поддержка предыдущего major шесть месяцев остаётся обязательством из Archcore;
maintenance-ветки добавляются при появлении второго major.
