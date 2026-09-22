import { computed, toValue, useId, type ComputedRef, type MaybeRefOrGetter } from 'vue';

export function useControlId(explicit?: MaybeRefOrGetter<string | undefined>): ComputedRef<string> {
  const generated = useId();
  return computed(() => toValue(explicit) || generated);
}
