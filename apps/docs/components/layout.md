# Layout

`NuiLayout` собирает оболочку приложения: боковую панель, верхнюю панель `NuiAppBar` и
область содержимого. Состояние панели живёт в каркасе: `v-model:open` для широкого экрана,
`v-model:mobileOpen` для узкого, где панель превращается в ящик. Саму панель описывает
[Sidebar](/components/sidebar).

<Example name="layout/Basic" />

## Установка

```ts
import { NuiAppBar, NuiLayout } from '@numior/vue';
import '@numior/vue/styles/layout.css';
import '@numior/vue/styles/skip-link.css';
```

## Примеры

### Панель на всю ширину и колонка справа

`header="full"` ставит верхнюю панель над боковой, слот `end` добавляет колонку для
оглавления; `sticky` держит колонки на высоту окна с отдельной прокруткой.

<Example name="layout/Full" />

## Поведение

На узком экране (`mobileQuery`, по умолчанию `(max-width: 48rem)`) панель рендерится внутри
`NuiDrawer`, а `NuiSidebarTrigger` открывает его; выбор пункта закрывает ящик. До монтирования
экран считается широким, поэтому серверная разметка и первый кадр совпадают. Ctrl/Cmd+B
переключает панель, кроме полей ввода.

## Доступность

Область содержимого — `main` (или `contentAs`), верхняя панель — `header`, кнопка-триггер
держит `aria-expanded` и `aria-controls` панели или ящика.

Первым элементом каркас ставит `NuiSkipLink` «К содержимому» (WCAG 2.4.1). Ссылка видна
только с фокусом клавиатуры и переносит его в область содержимого мимо шапки и панели. `skipLabel` меняет текст, `:skip-link="false"` убирает ссылку, если у страницы уже
есть своя.

<KeyboardReference name="NuiLayout" />

## API

<ApiReference :names="['NuiLayout', 'NuiAppBar', 'NuiSkipLink']" />
