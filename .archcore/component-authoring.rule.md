---
title: "Правила написания компонентов и тестов"
status: accepted
---

## Rule

Компоненты `@numior/vue` и примитивы `@numior/primitives`:

- В каждом SFC порядок блоков: сначала `<template>`, затем `<script setup lang="ts">`,
  затем `<style>` (если он вообще нужен); линтер проверяет это правилом `vue/block-order`.
  Props объявляются `defineProps<Props>()` с reactive
  destructure для дефолтов: `const { size = 'md', disabled = undefined } = defineProps<Props>()`.
  Интерфейс props лежит в `<name>.types.ts`, необязательные поля объявлены с `| undefined`.
  Boolean, который должен наследоваться из контекста поля, получает дефолт `= undefined`
  (тристейт). `withDefaults`, runtime-объекты props и `PropType` запрещены. v-model только
  через `defineModel`. Композаблы получают destructured props через getter:
  `useFieldControl(() => ({ id, disabled, required, invalid }))`.
- Функции — только стрелочные константы (`const sync = (): void => {...}`, `export const
  useX = () => {...}`); объявление `function` допустимо лишь там, где нужен собственный
  `this` (method shorthand в объектах, стабы прототипов). Хелперы без замыкания живут на
  уровне модуля, вложенные объявления функций внутри функций не пишутся; замыкания над
  состоянием композабла — минимальные стрелочные константы. Любой блок `if`/`else`/`for`/
  `while` заключён в `{}`. Линтер держит это правилами `func-style: expression`,
  `curly: all`, `prefer-arrow-callback`.
- Приведения типов `as` и постфиксный `!` запрещены во всём репозитории, включая тесты и
  конфиги; единственное исключение — `as const`. Нужен тип — generic, type guard,
  `useTemplateRef<HTMLInputElement>()`, `wrapper.find<HTMLInputElement>()`, дискриминированное
  объединение вместо «пустого» значения.
- CSS по BEM: блок `nui-<name>`, элементы `nui-<name>__<part>`, модификаторы
  `nui-<name>--<key>-<value>` для перечислений (`--variant-soft`, `--tone-error`, `--size-sm`)
  и `nui-<name>--<state>` для состояний (`--checked`, `--invalid`, `--disabled`, `--loading`).
  Изменяемые значения вынесены в приватные custom properties (`--_tone`, `--_height`), которые
  задают модификаторы, а остальные правила только читают. `data-*` для вариантов и состояний
  не используются; состояние нативного контрола в CSS берётся из псевдоклассов
  (`:checked`, `:indeterminate`, `:disabled`, `:focus-visible`).
- Движение обязательно: каждое изменение состояния имеет `transition` или `animation`
  через `--nui-duration-*` и `--nui-easing`. При `prefers-reduced-motion: reduce` токены
  обнуляют длительности; бесконечные анимации (спиннер) замедляются, но не исчезают.
- Иконки только через реестр алиасов. Наборы по умолчанию загружаются по требованию
  (`lazyIcon(() => import('lucide-vue-next/dist/esm/icons/<name>.js'))`) и кэшируются
  Vue; синхронный импорт набора иконок в базовый UI запрещён.
- Кнопка в `loading` сохраняет ширину: содержимое остаётся в потоке с `opacity: 0`,
  спиннер абсолютно позиционирован по центру.
- Комментарии в коде (TS, Vue, CSS, конфиги) не пишутся; объяснения живут в `apps/docs`
  и Archcore. Имена несут смысл.
- Раскладка: `packages/vue/src/<name>/{Nui<Name>.vue,<name>.types.ts,<name>.css}`;
  `src/styles.css` — манифест `@import`, сборка эмитит `dist/styles.css` и
  `dist/styles/<name>.css`. Каждый CSS-файл компонента самодостаточен.

Тесты:

- Unit-тесты лежат в `packages/<pkg>/test/`. Компоненты тестируются через драйверы
  (`test/drivers/<name>.ts`), композаблы — через харнессы (`test/harness`). Спека читается как
  сценарий: только вызовы драйвера и `expect`, без разбора DOM, `as` и одноразовых хелперов.
- Фабрики драйверов синхронные; ожидание асинхронных частей — `await driver.ready()`.
- E2E: page objects в `tests/e2e/pages`; спеки не обращаются к `page.getByTestId` напрямую.
- Каждый компонент проходит четыре уровня: unit-контракт, SSR-рендер (`renderMarkup`,
  детерминированная разметка, id на сервере), e2e-сценарий в playground и axe в light/dark
  под `reducedMotion: 'reduce'`.

## Rationale

Правила зафиксированы после ревью первой волны компонентов 2026-09-22: runtime-объекты
props и `withDefaults` дублировали типы, `data-*` дублировали классы, `as` прятал ошибки
типов, а спеки с ручным разбором DOM не читались. Единый стиль ускоряет ревью и делает
поведение предсказуемым для CLI-копирования визуальных компонентов.

## Examples

Good: `const { size = 'md', disabled = undefined } = defineProps<NuiInputProps>()`;
`:class="[`nui-input--size-${size}`, { 'nui-input--invalid': isInvalid }]"`;
`const input = InputDriver.mount({ modifiers: { lazy: true } }); await input.type('a')`;
`useTemplateRef<HTMLInputElement>('input')` вместо `event.target as HTMLInputElement`.

Bad: `function sync(next) {...}` внутри композабла и `if (!el) return;` без скобок;
`withDefaults(defineProps<Props>(), {...})`; `defineProps({ size: { type: String as PropType<Size> } })`;
`:data-variant="variant"`; `(wrapper.element as HTMLInputElement).value`;
`import { Check } from 'lucide-vue-next'` в компоненте; комментарий с объяснением «почему» в SFC.

## Enforcement

Самопроверка по этому документу перед передачей изменений; `pnpm check` (Fallow ловит
неиспользуемые члены драйверов и дубли); ревью пользователя. Практические шаблоны — в
скиллах `.claude/skills/nui-component` и `.claude/skills/nui-testing`, краткая версия —
в `AGENTS.md`.
