import { ref } from 'vue';
import { isString, listOf } from '../../../primitives/test/support/guards';

export type SelectionValue = string | null | string[];

export interface Selection {
  props(): Record<string, unknown>;
  value(): SelectionValue;
  setValues(values: readonly string[]): void;
}

const isStrings = listOf(isString);

export const createSelection = (
  initial: SelectionValue | undefined,
  multiple: boolean,
): Selection => {
  const single = ref<string | null>(typeof initial === 'string' ? initial : null);
  const many = ref<string[]>(isStrings(initial) ? initial : []);

  return {
    props: () => ({
      modelValue: single.value,
      values: many.value,
      'onUpdate:modelValue': (value: unknown) => {
        if (typeof value !== 'string' && value !== null) {
          return;
        }

        single.value = value;
      },
      'onUpdate:values': (value: unknown) => {
        if (!isStrings(value)) {
          return;
        }

        many.value = value;
      },
    }),
    value: () => (multiple ? many.value : single.value),
    setValues: (values) => {
      many.value = [...values];
    },
  };
};
