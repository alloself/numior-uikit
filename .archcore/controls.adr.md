---
title: "Реестр контролов: один словарь для форм из JSON и редакторов ячеек"
status: accepted
date: 2026-09-28
---

## Context

План 1.0 обещает формы из конфигурации с подключаемыми контролами, а волна 7 добавляет DataGrid
с редакторами ячеек. Обоим нужно одно и то же: по строковому ключу (`'select'`) найти компонент,
знать имя его модели, проверить, что значение поля подходит контролу, и отсечь props, которые
пришли из JSON без типов. Умная форма уже типизирует `field(Component, …)` через
`ControlProps`/`ControlValue`/`EmitsInto`, но эта типизация жила внутри `@numior/forms`, а
грид от форм зависит, но не наоборот.

## Decision

- Типы `ComponentProps`, `ControlProps`, `ControlValue`, `ControlEmit`, `EmitsInto` и запись
  реестра `NuiControlEntry { component, model, accepts, props }` живут в `@numior/primitives`
  (`src/controls/`); `@numior/forms` реэкспортирует `ControlProps`/`ControlValue`, его API не
  меняется.
- `control(component, accepts, { model?, props? })` собирает запись и проверяет типом, что
  `onUpdate:<model>` компонента совместим с гардом `accepts` (тот же `EmitsInto`, что у
  `field`). `accepts` обязателен: generic-компоненты (`NuiSelect<T>`) выводят `unknown`, и
  без runtime-проверки значение из JSON нечем сверить.
- `controlProps(shape)` — строгий гард: известные ключи проверяются гардами, неизвестные
  отклоняются; без `props` запись принимает любой объект (граница доверия — тот, кто
  регистрирует свой контрол).
- Runtime-гарды (`shapeOf`, `listOf`, `optional`, `oneOf`, `anyOf`, `nullable`, `recordOf`,
  `parseAs`, `isUnknown`, …) переехали из тестовой поддержки в `packages/primitives/src/guards`
  и экспортируются: одна реализация для тестов, реестра и JSON-форм.
- Реестр раздаётся через `createNuiConfig({ controls })`/`provideNuiConfig` или
  `provideControls`; `useControls()` возвращает `null`, если реестра нет. Значения по умолчанию
  нет намеренно: `kitControls` из `@numior/vue` импортирует все контролы кита, и подстановка по
  умолчанию тянула бы их в каждое приложение с формой.
- `kitControls`: `text`, `textarea`, `number`, `select`, `combobox`, `checkbox`, `switch`,
  `radio`, `date`, `dateRange`, `time` с гардами JSON-допустимых props. `NuiRadioGroup` получил
  проп `options` (как у `NuiCheckboxGroup`), иначе радиокнопки нельзя описать без слота.
  `NuiUpload` в реестр не входит: ему нужен адаптер-функция, которую JSON не передаст;
  приложение регистрирует свою обёртку.

## Alternatives Considered

- Реестр внутри `@numior/forms`: гриду пришлось бы зависеть от форм ради словаря контролов, а
  формам — знать о редакторах ячеек.
- Гард props, типизированный как `Guard<Partial<ControlProps<C, M>>>`: под
  `exactOptionalPropertyTypes` шаблоны `optional(isString)` не сходятся с `placeholder?: string`
  из `InputHTMLAttributes`; проверка ключей остаётся за тестами `kit-controls.test.ts`.
- Подстановка `kitControls` по умолчанию в `useControls` — отвергнута из-за размера бандла.

## Consequences

`@numior/primitives` экспортирует гарды и реестр, `@numior/vue` — `kitControls`, `NuiRadioGroup`
принимает `options`. Формы получают `formConfig({ controls }).control('select', selector, config)`
(отдельный строитель вместо перегрузки `field`: перегрузки стрелочных функций через интерфейс с
двумя сигнатурами не сходятся с обобщёнными правилами без приведения типов) и
`parseFormConfig(json, { controls })`: JSON проверяется гардами (`kind`, `type`, `name`, `props`,
`when: { path, equals | in }`, `rules: required | min | max | email | pattern`), поля строятся с
`byPath`-селекторами и значениями `unknown`, а неизвестный тип, отклонённые props и непонятные
записи собираются в `issues` с кодом (`unknown-type`, `rejected-props`, `not-a-list`,
`invalid-entry`) и путём `fields.2.props` — без текстов: диагностику показывает приложение. Грид получит `editor: 'select'` из того же
реестра.
