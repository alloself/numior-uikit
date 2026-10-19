import { computed, toValue, type Component, type ComputedRef, type MaybeRefOrGetter } from 'vue';
import { useIcons, type IconSource } from '@numior/primitives';
import { kitIcon } from './kit-icons';

export const useIcon = (
  icon: MaybeRefOrGetter<IconSource | undefined>,
): ComputedRef<Component | undefined> => {
  const icons = useIcons();

  return computed(() => {
    const source = toValue(icon);

    return typeof source === 'string' ? (icons[source] ?? kitIcon(source)) : source;
  });
};
