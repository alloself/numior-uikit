import { shallowRef } from 'vue';
import type { EntryState } from '../engine/engine';

export const createOwnerState = (): EntryState => {
  const touched = shallowRef(false);
  const attempted = shallowRef(false);
  const errors = shallowRef<readonly string[]>([]);
  const pending = shallowRef(false);

  return {
    touched,
    attempted,
    errors,
    pending,
    setTouched: (value) => {
      touched.value = value;
    },
    setAttempted: (value) => {
      attempted.value = value;
    },
    setErrors: (messages) => {
      errors.value = messages;
    },
    setPending: (value) => {
      pending.value = value;
    },
  };
};
