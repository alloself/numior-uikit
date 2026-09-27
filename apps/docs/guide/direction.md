# Направление письма

Компоненты свёрстаны логическими свойствами, поэтому для RTL достаточно атрибута `dir` на
документе или на области. Поля выравниваются вправо, шевроны и стрелки пагинации
разворачиваются, а клавиши ArrowLeft и ArrowRight меняются местами.

<Example name="guide/Direction" />

## Откуда берётся направление

`useDirection(anchor)` читает `dir` из конфигурации, иначе ближайший атрибут `dir` над
элементом, иначе `dir` документа, иначе `ltr`. Опция `dir` в `createNuiConfig` или
`provideNuiConfig` нужна, когда направление меняется на лету или на сервере нет DOM.

```ts
createNuiConfig({ dir: () => (settings.rtl ? 'rtl' : 'ltr') });
```

## Что разворачивается

- Логические отступы и границы: `margin-inline-start`, `inset-inline-end`, `border-inline-start`.
- Плавающие слои: сторона открытия поповеров и меню считается от направления.
- Клавиатура: в списках, вкладках, дереве и разделителе ArrowLeft и ArrowRight зеркальны.
- Сегменты времени и числа остаются слева направо, как принято для цифр в RTL-текстах.

## Свой код

Читайте направление из `useDirection`, а не из `getComputedStyle`: в Vue-компоненте это
обычный композабл с методами `dir()` и `isRtl()`; на сервере он возвращает значение
конфигурации.

```ts
import { useDirection } from '@numior/vue';

const direction = useDirection(root);
const shift = computed(() => (direction.isRtl() ? -offset.value : offset.value));
```
