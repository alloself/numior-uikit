import { ref } from 'vue';

export type SelectionValue = string | null | string[];

const isStrings = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

export interface Selection {
  props(): Record<string, unknown>;
  value(): SelectionValue;
}

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
        if (typeof value === 'string' || value === null) {
          single.value = value;
        }
      },
      'onUpdate:values': (value: unknown) => {
        if (isStrings(value)) {
          many.value = value;
        }
      },
    }),
    value: () => (multiple ? many.value : single.value),
  };
};
