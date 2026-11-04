# useLocale

`useLocale(explicit)` returns the locale for the formats and labels of your component. It is
the `locale` prop when passed, otherwise `locale` from the nearest settings, otherwise `en-US`.

## Signature

<SignatureReference name="useLocale" />

## Usage

```ts
import { computed } from 'vue';
import { useLocale } from '@numior/vue';

const { locale } = defineProps<{ locale?: string | undefined }>();
const current = useLocale(() => locale);
const price = computed(
  () => new Intl.NumberFormat(current.value, { style: 'currency', currency: 'USD' }),
);
```

The result is a `ComputedRef<string>`: when the locale in the settings changes, the price is
formatted again. Numior UI components with a `locale` prop pick the locale the same way. The app
locale is set in [Configuration](/en/guide/configuration).
