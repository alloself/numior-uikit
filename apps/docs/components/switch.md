# Switch

`NuiSwitch` — переключатель для настройки, которая включается и выключается сразу, без кнопки
«Сохранить»: уведомления, публичный доступ, тёмная тема. В модели хранится `true` или `false`.

<Example name="switch/Basic" />

Подпись передают в слот по умолчанию или в `label`, пояснение под ней — в `description`. Для
выбора, который применяется только после отправки формы, лучше подходит
[Checkbox](/components/checkbox).

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

В `description` объясните, что изменится после переключения. Выключенный `disabled`
переключатель по-прежнему показывает, включена настройка или нет.

<Example name="switch/Settings" />

### Размеры

`size` принимает `sm`, `md` и `lg` и меняет размер переключателя вместе с подписью.

<Example name="switch/Sizes" />

## Доступность

Переключатель — нативный флажок с ролью `switch`, диктор объявляет его как «включено» или
«выключено» и читает подпись. При письме справа налево бегунок движется в другую сторону.

<KeyboardReference name="NuiSwitch" />

## API

<ApiReference name="NuiSwitch" />
