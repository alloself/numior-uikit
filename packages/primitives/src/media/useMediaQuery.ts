import { useMediaQuery as useMatchMedia, useMounted } from '@vueuse/core';
import { computed, type MaybeRefOrGetter, type Ref } from 'vue';

export const useMediaQuery = (query: MaybeRefOrGetter<string>): Readonly<Ref<boolean>> => {
  const mounted = useMounted();
  const matches = useMatchMedia(query);

  return computed(() => mounted.value && matches.value);
};
