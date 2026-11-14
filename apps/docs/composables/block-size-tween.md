# useBlockSizeTween

`useBlockSizeTween(target)` плавно меняет высоту элемента, когда меняется его содержимое.
Используйте его, например, для панели, которая раскрывается, или для формы по шагам.

## Сигнатура

<SignatureReference name="useBlockSizeTween" />

## Использование

```ts
import { useTemplateRef } from 'vue';
import { useBlockSizeTween } from '@numior/vue';

const panel = useTemplateRef<HTMLElement>('panel');

useBlockSizeTween(panel);
```

Вызывайте композабл в компоненте, который выводит содержимое: высота измеряется до и после
каждого его обновления. Длительность и плавность анимации берутся из токенов
`--transition-duration-normal` и `--ease-nui`.

Если в системе включено уменьшение движения, высота меняется сразу, без анимации.
