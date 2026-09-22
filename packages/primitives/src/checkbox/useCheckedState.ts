import { computed, toValue, type ComputedRef, type MaybeRefOrGetter, type Ref } from 'vue';

export interface CheckedState {
  readonly checked: ComputedRef<boolean>;
  setChecked(next: boolean): void;
}

/**
 * Checked state over a v-model that is either a boolean or an array of selected values.
 * With an array model the control's own `value` is added or removed; other entries and
 * their order are preserved.
 */
export function useCheckedState<T>(
  model: Ref<boolean | T[] | undefined>,
  value?: MaybeRefOrGetter<T | undefined>,
): CheckedState {
  const checked = computed(() => {
    const current = model.value;
    if (Array.isArray(current)) {
      const own = toValue(value);
      return own !== undefined && current.includes(own);
    }
    return current === true;
  });
  function setChecked(next: boolean): void {
    const current = model.value;
    if (!Array.isArray(current)) {
      model.value = next;
      return;
    }
    const own = toValue(value);
    if (own === undefined) return;
    const others = current.filter((item) => item !== own);
    model.value = next ? [...others, own] : others;
  }
  return { checked, setChecked };
}
