# useControls

`useControls()` возвращает набор контролов, из которого формы по JSON-описанию и редакторы
ячеек таблицы берут контрол по имени, например `text` или `date`. Готовый набор контролов
Numior UI — `kitControls` из `@numior/vue/controls`.

Свой набор соберите через `defineControls`. Запись `text: control(NuiInput, isString)` означает:
по имени `text` выводится `NuiInput`, а его значение — строка. Передайте набор в
`createNuiConfig({ controls })` или в `provideControls`.

<Example name="composables/Controls" />

## Сигнатура

<SignatureReference :names="['useControls', 'provideControls', 'defineControls', 'control', 'controlProps', 'NuiControlEntry', 'NuiControlRegistry', 'ControlProps', 'ControlValue']" />

## Поведение

`control(component, accepts, { model, props })` проверяет на уровне типов, что значение
компонента подходит под проверку `accepts`. `model` — имя модели компонента, по умолчанию
`modelValue`.

`props` проверяет свойства, которые форма или таблица передаёт контролу. `controlProps(shape)`
строит строгую проверку: свойство с неизвестным именем или значением не того типа не пройдёт.
Без `props` контрол принимает любые свойства.

Если набор не передан ни в настройки, ни через `provideControls`, `useControls()` возвращает
`null`.
