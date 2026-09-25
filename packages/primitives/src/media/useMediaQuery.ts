import {
  onMounted,
  onScopeDispose,
  ref,
  toValue,
  watch,
  type MaybeRefOrGetter,
  type Ref,
} from 'vue';

const noop = (): void => {};

export const useMediaQuery = (query: MaybeRefOrGetter<string>): Readonly<Ref<boolean>> => {
  const matches = ref(false);
  const subscription = { stop: noop };

  const subscribe = (value: string): void => {
    subscription.stop();

    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const list = window.matchMedia(value);

    const update = (): void => {
      matches.value = list.matches;
    };

    update();
    list.addEventListener('change', update);

    subscription.stop = () => {
      list.removeEventListener('change', update);
      subscription.stop = noop;
    };
  };

  onMounted(() => {
    subscribe(toValue(query));
    watch(() => toValue(query), subscribe);
  });

  onScopeDispose(() => subscription.stop());

  return matches;
};
