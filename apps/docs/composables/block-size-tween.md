# useBlockSizeTween

`useBlockSizeTween(target)` плавно ведёт высоту элемента к новой высоте содержимого через
`--nui-duration-normal` и `--nui-easing`: при смене содержимого элемент не прыгает, а
анимируется. При `prefers-reduced-motion` переход мгновенный.

## Сигнатура

<SignatureReference name="useBlockSizeTween" />

## Использование

```ts
import { useTemplateRef } from 'vue';
import { useBlockSizeTween } from '@numior/vue';

const panel = useTemplateRef<HTMLElement>('panel');

useBlockSizeTween(panel);
```

Композабл измеряет элемент до и после изменения и пишет `block-size` прямо в его стили, без
реактивного состояния. Так анимируются панели раскрытия и переключение шагов.
