# useLocale

`useLocale(explicit)` returns the locale for formats and texts: the component prop when
passed, else `locale` from the nearest configuration, else `en-US`. Every component with a
`locale` prop works this way.

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

The result is a `ComputedRef<string>`: a locale change in the configuration reformats the
value. The app locale is set in [Configuration](/en/guide/configuration).
