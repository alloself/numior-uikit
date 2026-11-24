---
title: "Единый релиз библиотек через semantic-release: alpha до 1.0"
status: accepted
---

## Context

В bootstrap отсутствовала автоматизация SemVer. Пользователь попросил её добавить. Все клиентские
пакеты kit выпускаются совместно. До 2026-11-23 публикация была закрыта до полного 1.0. Интервью
2026-11-23 открыло npm раньше: владелец хочет ставить пакеты из npm, пока API ещё меняется. Без
prerelease-канала semantic-release выпустил бы `1.0.0`, а каждый `feat!` после него — новый major.

## Decision

Единая версия packages/* и тег `v${version}`. Conventional Commits: fix/perf → patch, feat →
minor, !/BREAKING CHANGE → major. До 1.0 все релизы — `1.0.0-alpha.N`: master — prerelease-ветка
`alpha`, номер растёт на единицу при любом типе изменения, major не прыгает. semantic-release
требует хотя бы одну stable-ветку, существующую на remote, поэтому рядом лежит ветка `stable`,
созданная от master и не используемая до 1.0. На 1.0 одно изменение делает master stable-веткой,
`stable` удаляется.

Релиз запускается кнопкой: `workflow_dispatch` workflow `ci.yml` на master. В том же запуске идёт
quality (`pnpm check:ci`), после него job `release`, если repository variable
`NUMIOR_RELEASE_ENABLED=true`. Бюджеты времени (`test:budget`) и e2e в CI не идут: стандартный
раннер GitHub не держит бюджеты в 100 мс и проходит e2e за 2,5–3 часа. Владелец решил 2026-11-23,
что перед кнопкой они проходят локально: `pnpm check` и `pnpm test:e2e`. Push в master релиз не
запускает. Та же кнопка выкладывает документацию (`docs-site.adr.md`); без release-worthy коммитов
npm-шаг ничего не выпускает.

@release.config.mjs задаёт semantic-release, commit analyzer, release notes generator, собственный
monorepo plugin и GitHub release с tarballs (prerelease). Root и приложения остаются private,
библиотеки — `private: false`. Версии меняются в release workspace без обратного коммита; Git-теги
и их git notes (`{"channels":["master"]}`) — источник опубликованной версии.

Страница пакета в npm собирается из его `package.json` и `README.md`: у каждой библиотеки есть
`description` и `keywords` для поиска npm, `homepage` на её страницу ui.numior.ru, `bugs` на Issues и
README на английском (назначение, установка, ссылки на доку RU и EN; у `@numior/kit` — быстрый
старт, у `@numior/mcp` — команда подключения). `pnpm pack` кладёт README в tarball сам,
`check-artifacts` не пропускает публикуемый пакет без этих полей и README.

@scripts/release/workspace.mjs проверяет gate, `private: false` всех библиотек, отсутствие внешних
prerelease-зависимостей и npm не старше 11.5.1 (Trusted Publishing). `prepare` пропускает только
`1.0.0-alpha.N`, выставляет общую версию, `pnpm pack` заменяет `workspace:*` точными версиями.
`publish` публикует tarballs с `--provenance --access public --tag latest`: npm 11 требует явный
тег для prerelease, а `latest` до 1.0 указывает на свежую alpha, потому что npm ставит `latest` на
первую версию пакета, а OIDC не даёт переводить dist-tag. На 1.0 `latest` переходит на 1.0.0 сам.

Публикация — npm Trusted Publishing (OIDC, `id-token: write`, workflow `ci.yml`). Trusted
publisher привязывается только к существующему пакету и только владельцем с 2FA, поэтому alpha.1
выходит временным granular token `NPM_TOKEN` (7 дней), потом владелец запускает
`pnpm release:trust` (@scripts/release/trust.mjs, `npm trust github … --allow-publish`, npm ≥
11.15) и в течение двух суток выпускает следующую alpha уже через OIDC. Подробности и чек-лист
владельца: @docs/releases.md.

## Alternatives Considered

Публиковать сразу `1.x` по каждому merge — версии ушли бы в десятки major до готовности API.
Версии `0.x` semantic-release сам не ведёт: первый релиз у него всегда `1.0.0`. Канал beta обещает
замороженный API, которого нет. dist-tag `alpha` оставил бы `latest` навсегда на alpha.1.
Независимые версии усложняют совместимость тесно связанных packages на старте. Автокоммит версий
не нужен: Git-теги — источник версии. Релиз на каждый merge отклонён владельцем: кнопка.

## Consequences

`pnpm release:check` входит в `pnpm check`: проверяет SemVer-правила, gate/private, запрет
внешних prerelease-зависимостей, отказ стабильных и чужих prerelease-версий, проверку npm,
упаковку и замену workspace-ссылок, отсутствие credentials в metadata, dry-run первой
`1.0.0-alpha.1` и `alpha.2` после fix, feat и `feat!` на временном Git repo, а также скрипт
привязки trust с поддельным npm. Тесты ничего не публикуют. Fallow имеет точечное исключение для
динамически загружаемого conventional-changelog-conventionalcommits.

Тег без git note канала считается выпуском другого канала: следующая alpha после `feat!` стала бы
`2.0.0-alpha.1`, и plugin её отклонит. Тег, поставленный вручную при восстановлении, получает note
`git notes --ref semantic-release-<tag> add -m '{"channels":["master"]}' <tag>`.

Публикация нескольких npm-пакетов не атомарна. После частичного сбоя сверять registry и
допубликовывать только отсутствующие версии из artifact того же SHA; rerun semantic-release не
гарантирует восстановление. Не удалять опубликованные версии и теги. Release workflow не
отменяется новым запуском. Поддержка предыдущего major шесть месяцев остаётся обязательством после
1.0; maintenance-ветки появятся при втором major.
