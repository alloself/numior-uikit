import { computed, toValue, type ComputedRef, type MaybeRefOrGetter, type Ref } from 'vue';
import {
  defaultOptionKey,
  flattenEntries,
  type NuiOption,
  type NuiOptionKey,
  type NuiOptionSource,
} from './options';

export interface OptionSelectionOptions<T> {
  readonly options: MaybeRefOrGetter<NuiOptionSource<T>>;
  readonly model: Ref<T | T[] | undefined>;
  readonly multiple: MaybeRefOrGetter<boolean>;
  readonly getKey?: MaybeRefOrGetter<NuiOptionKey<T> | undefined>;
}

export interface OptionSelection<T> {
  keyOf(value: T): string;
  readonly flat: ComputedRef<NuiOption<T>[]>;
  readonly selectedValues: ComputedRef<T[]>;
  readonly selectedKeys: ComputedRef<Set<string>>;
  readonly selectedOptions: ComputedRef<NuiOption<T>[]>;
  optionOf(value: T): NuiOption<T> | undefined;
  toggle(option: NuiOption<T>): void;
  clear(): void;
}

export const useOptionSelection = <T>(options: OptionSelectionOptions<T>): OptionSelection<T> => {
  const keyOf = (value: T): string => (toValue(options.getKey) ?? defaultOptionKey)(value);
  const flat = computed(() => flattenEntries(toValue(options.options)));

  const selectedValues = computed<T[]>(() => {
    const current = options.model.value;
    if (Array.isArray(current)) {
      return toValue(options.multiple) ? current : current.slice(0, 1);
    }
    return current === undefined ? [] : [current];
  });

  const selectedKeys = computed(() => new Set(selectedValues.value.map(keyOf)));
  const byKey = computed(() => new Map(flat.value.map((option) => [keyOf(option.value), option])));

  const selectedOptions = computed(() =>
    selectedValues.value.flatMap((value) => {
      const option = byKey.value.get(keyOf(value));
      return option ? [option] : [];
    }),
  );

  return {
    keyOf,
    flat,
    selectedValues,
    selectedKeys,
    selectedOptions,
    optionOf: (value) => byKey.value.get(keyOf(value)),
    toggle: (option) => {
      const key = keyOf(option.value);

      options.model.value = selectedKeys.value.has(key)
        ? selectedValues.value.filter((value) => keyOf(value) !== key)
        : [...selectedValues.value, option.value];
    },
    clear: () => {
      options.model.value = toValue(options.multiple) ? [] : undefined;
    },
  };
};
