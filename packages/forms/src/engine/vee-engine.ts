import { reactive, toRaw, toRef } from 'vue';
import {
  useField,
  useForm,
  type FieldContext,
  type FormContext,
  type GenericObject,
} from 'vee-validate';
import { toVeePath } from '../paths/paths';
import { deleteAt } from '../values/access';
import { cloneValue } from '../values/clone';
import type { EngineField, FormEngine } from './engine';

const engineField = <T>(field: FieldContext<T>): EngineField<T> => ({
  value: field.value,
  touched: toRef(field.meta, 'touched'),
  attempted: toRef(field.meta, 'validated'),
  errors: field.errors,
  pending: toRef(field.meta, 'pending'),
  setTouched: (touched) => {
    field.setTouched(touched);
  },
  setAttempted: (attempted) => {
    field.meta.validated = attempted;
  },
  setErrors: (messages) => {
    field.setErrors([...messages]);
  },
  setPending: (pending) => {
    field.meta.pending = pending;
  },
});

export const createVeeEngine = <V extends object>(initialValues: V): FormEngine<V> => {
  const form = useForm<V>({ keepValuesOnUnmount: true });
  const untyped: FormContext<GenericObject> = form;

  const writable: FormContext<GenericObject> = {
    ...untyped,
    values: reactive(toRaw(untyped.values)),
  };

  untyped.setValues(cloneValue(initialValues), false);

  return {
    values: form.values,
    submitCount: form.submitCount,
    setValue: (path, value) => {
      untyped.setFieldValue(toVeePath(path), value, false);
    },
    unsetValue: (path) => {
      deleteAt(writable.values, path);
    },
    mergeValues: (values) => {
      untyped.setValues(values, false);
    },
    reset: (values) => {
      untyped.resetForm(
        { values: cloneValue(values), touched: {}, errors: {}, submitCount: 0 },
        { force: true },
      );
    },
    countSubmit: () => {
      form.submitCount.value += 1;
    },
    field: <T>(path: () => string, label: () => string | undefined) =>
      engineField(
        useField<T>(() => toVeePath(path()), undefined, {
          form: writable,
          label,
          validateOnValueUpdate: false,
          keepValueOnUnmount: true,
        }),
      ),
  };
};
