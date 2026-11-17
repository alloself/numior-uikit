# Link

Ссылка в тексте.

<Example name="link/Basic" />

Передайте адрес в `href`, а маршрут приложения — в `to`.

## Установка

```ts install
import { NuiLink } from '@numior/kit';
```

## Использование

Поменяйте подчёркивание и состояния ссылки.

<Configurator name="NuiLink" />

## Примеры

### Открыть в новой вкладке

Добавьте `external`.

<Example name="link/External" />

Ссылка получает `rel="noopener noreferrer"`: открытая страница не управляет вашей вкладкой и не
узнаёт, откуда пришёл переход.

### Отличить ссылку от кнопки

В абзаце берите Link, для действия в ряду кнопок — [Button](/components/button) с `variant="link"`.

<Example name="link/VersusButton" />

## Доступность

Ссылка остаётся обычным элементом `<a>`: её открывают в новой вкладке, копируют и переходят по
ней с клавиатуры как по любой ссылке. Отключённую ссылку Tab пропускает, а экранный диктор
читает и сообщает, что она недоступна.

<KeyboardReference name="NuiLink" />

## API

<ApiReference name="NuiLink" />
