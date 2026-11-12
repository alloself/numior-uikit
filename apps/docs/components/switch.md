# Switch

Переключатель настройки, которая применяется сразу.

<Example name="switch/Basic" />

Выбор, который вступает в силу после отправки формы, оформите через
[Checkbox](/components/checkbox).

## Установка

```ts
import { NuiSwitch } from '@numior/vue';
import '@numior/vue/styles/field.css';
import '@numior/vue/styles/switch.css';
```

## Использование

Поменяйте размер и состояния переключателя.

<Configurator name="NuiSwitch" />

## Примеры

### Собрать список настроек

Опишите в `description`, что изменится после переключения.

<Example name="switch/Settings" />

## Доступность

Под оформлением стоит нативный флажок с ролью `switch`: экранный диктор объявляет «включено» или
«выключено» и читает подпись. При направлении текста справа налево бегунок движется в обратную
сторону.

<KeyboardReference name="NuiSwitch" />

## API

<ApiReference name="NuiSwitch" />
