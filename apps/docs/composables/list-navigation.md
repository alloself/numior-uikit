# useListNavigation

`useListNavigation(container, options)` даёт составному виджету клавиатуру списка: стрелки,
Home, End, PageUp, PageDown, зацикливание, набор по первым буквам и RTL. В режиме `roving`
фокус переходит между элементами, в `virtual` — двигается `activeId` для
`aria-activedescendant`.

<Example name="composables/ListNavigation" />

## Сигнатура

<SignatureReference :names="['useListNavigation', 'ListNavigationOptions', 'ListNavigation']" />

## Поведение

`selector` выбирает элементы внутри контейнера, `scope` ограничивает их поддеревом,
`resting` задаёт элемент с `tabindex="0"` в покое. Обработчики `onKeydown` и `onFocusin`
вешаются на контейнер; `setActive`, `focusNext` и остальные методы двигают активный элемент
из кода. Список, дерево, меню, вкладки и группа переключателей kit построены на этом
композабле.
