# useControls

`defineControls({ text: control(NuiInput, isString, { props }) })` собирает реестр контролов:
компонент, имя модели, гард значения и гард props. Формы из JSON и редакторы ячеек находят
контрол по строковому ключу. `createNuiConfig({ controls })` или `provideControls` отдают реестр
потомкам, `kitControls` из `@numior/vue/controls` описывает контролы кита.

<Example name="composables/Controls" />

## Сигнатура

<SignatureReference :names="['useControls', 'provideControls', 'defineControls', 'control', 'controlProps', 'NuiControlEntry', 'NuiControlRegistry', 'ControlProps', 'ControlValue']" />

## Поведение

`control(component, accepts, { model, props })` сверяет типом модель компонента с гардом
`accepts`. `controlProps(shape)` строит строгий гард: неизвестный ключ или значение не того
типа отклоняются. Без `props` запись принимает любой объект, а `useControls()` возвращает
`null`, пока реестр не предоставлен.
