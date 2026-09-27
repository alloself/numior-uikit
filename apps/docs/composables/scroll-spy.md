# useScrollSpy

`useScrollSpy(ids, options)` следит, какой из заголовков сейчас на экране. Текущим считается
последний, чей верх выше линии `line` — доли высоты окна или контейнера `root`, по умолчанию
0.2. Результат — `activeId`, `activate(id)` и `measure()`.

<Example name="composables/ScrollSpy" />

## Сигнатура

<SignatureReference :names="['useScrollSpy', 'ScrollSpyOptions']" />

## Поведение

`activate(id)` помечает элемент сразу и держит пометку, пока прокрутка не остановится: клик по
ссылке не перескакивает на соседний заголовок. `measure()` пересчитывает положение после
изменения содержимого. [Toc](/components/toc) построен на этом композабле.
