# useListNavigation

`useListNavigation(container, options)` добавляет списку управление с клавиатуры: стрелки,
Home, End, PageUp, PageDown и переход к пункту по первым буквам. Используйте его для своего
списка, меню или панели вкладок.

В режиме `roving` фокус переходит от пункта к пункту. В режиме `virtual` фокус остаётся на
контейнере или поле ввода, а меняется `activeId` для `aria-activedescendant`. В RTL ArrowLeft и
ArrowRight меняются местами.

<Example name="composables/ListNavigation" />

## Сигнатура

<SignatureReference :names="['useListNavigation', 'ListNavigationOptions', 'ListNavigation']" />

## Поведение

`selector` выбирает пункты внутри контейнера, например `'[role="option"]'`. `scope` нужен для
вложенных списков: пункт учитывается, только если ближайший к нему элемент по `scope` — сам
контейнер. `resting` возвращает пункт, на который попадает Tab, пока активного пункта нет.

Повесьте `onKeydown` и `onFocusin` на контейнер. `setActive`, `focusNext` и другие методы
переводят активный пункт из кода. На этом композабле работают список, дерево, меню, вкладки и
группа переключателей Numior UI.
