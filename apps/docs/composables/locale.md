# useLocale

`useLocale(explicit)` возвращает локаль для форматов и подписей вашего компонента. Это
свойство `locale`, если оно передано, иначе `locale` из ближайших настроек, иначе `en-US`.

## Сигнатура

<SignatureReference name="useLocale" />

## Использование

```ts
import { computed } from 'vue';
import { useLocale } from '@numior/vue';

const { locale } = defineProps<{ locale?: string | undefined }>();
const current = useLocale(() => locale);
const price = computed(
  () => new Intl.NumberFormat(current.value, { style: 'currency', currency: 'RUB' }),
);
```

Результат — `ComputedRef<string>`: если локаль в настройках сменится, цена переформатируется.
Так же выбирают локаль компоненты Numior UI со свойством `locale`. Локаль приложения задаётся в
[Конфигурации](/guide/configuration).
