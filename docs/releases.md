# Релизы Numior UI

`semantic-release` настроен для общей версии библиотек `packages/*`, тегов
`v1.2.3` и стабильной ветки `master`. Root, docs и playground всегда приватные.
Независимость подключений пакетов сохраняется; номер версии у них единый.

## До готовности 1.0

Пакеты остаются `private: true`, repository variable `NUMIOR_RELEASE_ENABLED`
не задана. CI выполняет проверки, но release job пропускается. Сам release plugin
дополнительно блокирует prepare/publish без переменной `true` и требует
`private: false` у **всех** библиотек. Тесты и dry-run ничего не публикуют. Кроме того,
plugin не выпускает библиотеку, у которой в `dependencies` или `peerDependencies` стоит
prerelease-версия вроде `5.0.0-beta.1`: пакет на бете внешней библиотеки ждёт её стабильного
релиза. Единственное исключение — необязательный peer с диапазоном вида
`>=5.0.0-beta.1 <6.0.0`: адаптер проверен на этой бете, а диапазон принимает и стабильные
версии, поэтому такой peer релиз не блокирует. Dry-run и `pnpm release:check` prerelease
пропускают.

- `pnpm release:check` проверяет правила SemVer, блокировки, синхронные версии и
  реальные tarball с заменой `workspace:*`, не обращаясь к npm/GitHub для публикации.
- `pnpm release:dry-run` проверяет будущий релиз на реальной Git-истории. Нужны
  remote GitHub и `GITHUB_TOKEN` с доступом к репозиторию: semantic-release даже
  в dry-run проверяет возможность релиза. Пока у репозитория нет remote и первого
  коммита, эта команда не может посчитать полный релиз.

## Conventional Commits

| Коммит                                                             | Следующая версия после первого релиза |
| ------------------------------------------------------------------ | ------------------------------------- |
| `fix(vue): prevent duplicate submit`                               | patch                                 |
| `feat(tokens): add semantic roles`                                 | minor                                 |
| `feat(vue)!: replace button props` или footer `BREAKING CHANGE:`   | major                                 |
| `docs:`, `test:`, `chore:`, `ci:`, `refactor:` без breaking change | без релиза                            |

Первый релиз при наличии release-worthy изменений — `1.0.0`. Публичные alpha/beta
не настроены. `pnpm commitlint` принимает сообщение через stdin; PR workflow
проверяет заголовок. Для GitHub следует включить squash merge с заголовком PR в
качестве сообщения squash-коммита. Прямые коммиты в master также должны соблюдать
Conventional Commits. Branch protection и merge settings на сервере пока не
настраивались: remote отсутствует.

## Включение публикации после выполнения полного плана

1. Проверить доступность scope `@numior`, ownership пакетов и готовность всего 1.0.
   Добавить GitHub remote и защищённую ветку `master`; изменить обе конфигурации
   релиза при переименовании основной ветки.
2. Настроить npm Trusted Publishing для **каждого** пакета на workflow `ci.yml`
   этого репозитория. Для впервые создаваемых npm-пакетов предварительно выполнить
   bootstrap доступа к registry: trusted publisher привязывается к существующему
   пакету. Не включать workflow, пока этот шаг не решён. При разовой первичной
   публикации допустим защищённый `NPM_TOKEN`, переданный как `NODE_AUTH_TOKEN` через
   настроенный setup-node registry; секрет не сохранять в репозитории. После
   bootstrap перейти на OIDC. См. [npm trusted publishers](https://docs.npmjs.com/trusted-publishers/).
3. В отдельном изменении установить `private: false` у библиотек `packages/*`.
   Оставить root и приложения приватными. Проверить лицензии, exports и tarballs.
4. Установить repository variable `NUMIOR_RELEASE_ENABLED=true`. После успешных
   quality/browser jobs push в master запускает semantic-release. У job есть
   `contents: write` для тегов/GitHub release и `id-token: write` для npm OIDC.

## Выполнение и восстановление

Commit analyzer определяет версию, release-notes-generator — описание. Наш plugin
выставляет версию всех библиотек **до** упаковки. `pnpm pack` заменяет workspace
ссылки на версии; npm публикует tarballs с `--provenance --access public`.
GitHub release содержит notes и те же tarballs. Подготовленные изменения manifest
не коммитятся обратно: источником версии остаются Git-теги. Changelog доступен
через GitHub Releases; автокоммитов в защищённую ветку нет.

`repository.url` и каталог пакета записываются из реального remote при prepare,
чтобы metadata соответствовали provenance. Conventional Commits preset закреплён
на совместимой с changelog writer версии. Fallow имеет одно узкое исключение для
`conventional-changelog-conventionalcommits`: semantic-release загружает preset
динамически по короткому имени; интеграционный dry-run проверяет его загрузку.

Публикация нескольких npm-пакетов не атомарна. При сбое часть пакетов и тег уже
могут существовать. Workflow сохраняет tarballs даже при ошибке. Не удалять теги
и не пытаться перезаписать опубликованную версию: сначала сверить registry,
допубликовать только отсутствующие пакеты из artifact того же SHA и восстановить
GitHub release. Обычный rerun semantic-release не гарантирует такое восстановление.

Релизные workflows не отменяются новым push; PR-проверки можно отменять.
Поддержка предыдущего major в течение шести месяцев остаётся обязательством из
Archcore; maintenance-ветки добавляются при появлении второго major.
