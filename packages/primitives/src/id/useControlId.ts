import { computed, toValue, useId, type ComputedRef, type MaybeRefOrGetter } from 'vue';

export const useControlId = (
  explicit?: MaybeRefOrGetter<string | undefined>,
): ComputedRef<string> => {
  const generated = useId();
  return computed(() => toValue(explicit) || generated);
};
