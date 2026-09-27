# Switch

`NuiSwitch` — нативный чекбокс с `role="switch"` под анимированным треком и моделью `boolean`.
Бегунок описан логическими свойствами, поэтому в RTL он движется в правильную сторону.

<Example name="switch/Basic" />

## Установка

```ts
import { NuiSwitch } from '@numior/vue';
import '@numior/vue/styles/field.css';
import '@numior/vue/styles/switch.css';
```

## Использование

<Configurator name="NuiSwitch" />

## Примеры

### Список настроек

Описание под подписью объясняет, что меняет переключатель; `disabled` оставляет состояние
видимым.

<Example name="switch/Settings" />

### Размеры

`size` меняет высоту трека и подпись вместе с ним.

<Example name="switch/Sizes" />

## Доступность

Экранный диктор объявляет «включено» и «выключено», подпись читается из слота, кольцо фокуса
рисуется на треке.

<KeyboardReference name="NuiSwitch" />

## API

<ApiReference name="NuiSwitch" />
