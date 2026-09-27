# useLocale

`useLocale(explicit)` возвращает локаль для форматов и текстов: проп компонента, если он
передан, иначе `locale` из ближайшей конфигурации, иначе `en-US`. Так работают все
компоненты с пропом `locale`.

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

Результат — `ComputedRef<string>`: смена локали в конфигурации переформатирует значение.
Локаль приложения задаётся в [Конфигурации](/guide/configuration).
