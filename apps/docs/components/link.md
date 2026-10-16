# Link

`NuiLink` — ссылка на токенах ролей: по умолчанию `<a>`, с `to` — `RouterLink` или `NuxtLink`
приложения, `as` переопределяет компонент. `tone` задаёт цвет, `underline` — когда подчёркивать,
`external` открывает адрес в новой вкладке с `rel="noopener noreferrer"` и иконкой.

<Example name="link/Basic" />

## Link или Button

`NuiLink` — ссылка внутри текста: переносится по строкам вместе с абзацем, берёт его размер
шрифта и не добавляет отступов. `NuiButton variant="link"` — действие в ряду кнопок: высота
контрола, выравнивание по соседним кнопкам и состояния загрузки.

<Example name="link/VersusButton" />

## Установка

```ts
import { NuiLink } from '@numior/vue';
import '@numior/vue/styles/link.css';
```

## Использование

<Configurator name="NuiLink" />

## Примеры

### Внешние ссылки

`external` добавляет иконку и открывает адрес в новой вкладке.

<Example name="link/External" />

### Подчёркивание и недоступность

`underline="hover"` подчёркивает только при наведении, `disabled` убирает адрес и помечает
ссылку `aria-disabled`.

<Example name="link/States" />

## Доступность

Ссылка остаётся нативным `<a>`. Если задан `to`, `href` не рендерится, чтобы адресом управлял
роутер; тот же контракт используют пункты меню, крошки и боковая панель. `disabled` не прячет
ссылку от чтения, только убирает переход и фокус.

<KeyboardReference name="NuiLink" />

## API

<ApiReference name="NuiLink" />
