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
  readonly model: Ref<T | null>;
  readonly values: Ref<T[]>;
  readonly multiple: MaybeRefOrGetter<boolean>;
  readonly getKey?: MaybeRefOrGetter<NuiOptionKey<T> | undefined>;
}

export interface OptionSelection<T> {
  keyOf(value: T): string;
  readonly flat: ComputedRef<NuiOption<T>[]>;
  readonly selectedValues: ComputedRef<readonly T[]>;
  readonly selectedKeys: ComputedRef<Set<string>>;
  readonly selectedOptions: ComputedRef<NuiOption<T>[]>;
  optionOf(value: T): NuiOption<T> | undefined;
  choose(value: T): void;
  add(value: T): void;
  clear(): void;
}

export const useOptionSelection = <T>(options: OptionSelectionOptions<T>): OptionSelection<T> => {
  const keyOf = (value: T): string => (toValue(options.getKey) ?? defaultOptionKey)(value);
  const multiple = (): boolean => toValue(options.multiple);
  const flat = computed(() => flattenEntries(toValue(options.options)));

  const selectedValues = computed((): readonly T[] => {
    if (multiple()) {
      return options.values.value;
    }

    const current = options.model.value;

    return current === null ? [] : [current];
  });

  const selectedKeys = computed(() => new Set(selectedValues.value.map(keyOf)));
  const byKey = computed(() => new Map(flat.value.map((option) => [keyOf(option.value), option])));

  const selectedOptions = computed(() =>
    selectedValues.value.flatMap((value) => {
      const option = byKey.value.get(keyOf(value));
      return option ? [option] : [];
    }),
  );

  const toggled = (value: T): T[] => {
    const key = keyOf(value);

    return selectedKeys.value.has(key)
      ? selectedValues.value.filter((item) => keyOf(item) !== key)
      : [...selectedValues.value, value];
  };

  return {
    keyOf,
    flat,
    selectedValues,
    selectedKeys,
    selectedOptions,
    optionOf: (value) => byKey.value.get(keyOf(value)),
    choose: (value) => {
      if (multiple()) {
        options.values.value = toggled(value);
      } else {
        options.model.value = value;
      }
    },
    add: (value) => {
      if (!multiple()) {
        options.model.value = value;
      } else if (!selectedKeys.value.has(keyOf(value))) {
        options.values.value = [...selectedValues.value, value];
      }
    },
    clear: () => {
      if (multiple()) {
        options.values.value = [];
      } else {
        options.model.value = null;
      }
    },
  };
};
