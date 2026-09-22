---
title: "Единый стабильный релиз библиотек через semantic-release"
status: accepted
---

## Context

В bootstrap отсутствовала автоматизация SemVer. Пользователь попросил её добавить. Все клиентские пакеты kit выпускаются совместно; до полного 1.0 разработка закрытая, публичных alpha/beta нет. В текущем Git нет remote и первого коммита; внешняя публикация не выполнялась.

## Decision

Единая версия packages/* и тег v${version}; основная ветка master, совпадающая с текущим репозиторием. Conventional Commits: fix/perf → patch, feat → minor, !/BREAKING CHANGE → major. Первый release-worthy набор изменений выпускается как 1.0.0. Остальные изменения без breaking change не требуют релиза.

@release.config.mjs задаёт semantic-release, commit analyzer, release notes generator, собственный monorepo plugin и GitHub release с tarballs. Root и приложения остаются private. Версии библиотек меняются в release workspace без обратного коммита; Git-теги — источник опубликованной версии. Preset Conventional Commits 8.0.0 совместим с writer 8 в release-notes-generator; совместимость проверяется реальным dry-run.

@.github/workflows/ci.yml запускает release только после quality и browser jobs, только при push master и repository variable NUMIOR_RELEASE_ENABLED=true. Сам plugin повторно проверяет gate и private:false всех библиотек. До готовности 1.0 эта переменная не включается, private не снимается. PR workflow проверяет conventional title; на сервере потребуется squash merge с заголовком PR и branch protection.

@scripts/release/workspace.mjs сначала выставляет общую версию всем пакетам, затем pnpm pack конвертирует workspace-протоколы. Repository metadata берётся из реального remote с удалением любых credentials. npm публикует tarballs публично с provenance. GitHub Release содержит release notes и те же tarballs; при ошибке tarballs сохраняются workflow artifact.

Для npm предпочтителен Trusted Publishing OIDC (id-token:write, workflow ci.yml). Для первичного создания пакетов предусмотрен optional secret NPM_TOKEN через NODE_AUTH_TOKEN и setup-node registry configuration. Реальные scope/remote/доступы настраиваются перед публикацией; bootstrap их не выдумывает. Подробная инструкция: @docs/releases.md.

## Alternatives Considered

Независимые версии усложняют совместимость тесно связанных packages на старте; можно пересмотреть отдельным ADR. Только GitHub release не решает версионирование и публикацию npm workspace. Автокоммит package versions не нужен: создаёт лишние изменения и требует обхода защищённой ветки. Автопубликация текущего private bootstrap нарушила бы принятый план.

## Consequences

pnpm release:check входит в pnpm check: проверяет SemVer, gate/private, запрет prerelease, упаковку и замену workspace ссылок, отсутствие credentials в metadata, первый 1.0.0 dry-run без тегов/мутаций. Тесты используют временный Git repo и пакеты, не публикуют и не меняют Git проекта. Fallow имеет точечное исключение для динамически загружаемого conventional-changelog-conventionalcommits; интеграционный тест проверяет preset.

Публикация нескольких npm-пакетов не атомарна. После частичного сбоя сверять registry и допубликовывать только отсутствующие версии из artifact того же SHA; semantic-release rerun не гарантирует восстановление. Не удалять уже опубликованные версии/теги. Release workflow не отменяется новым push. Поддержка предыдущего major шесть месяцев остаётся обязательством; maintenance branches появятся при втором major.
