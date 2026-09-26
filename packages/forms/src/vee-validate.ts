import { provide, reactive, toRaw, toRef } from 'vue';
import {
  FormContextKey,
  useField,
  useFieldArray,
  useForm,
  type FieldContext,
  type FieldMeta,
  type FormContext,
  type GenericObject,
  type PrivateFormContext,
} from 'vee-validate';
import type { EngineArray, EngineField, FormEngineFactory } from './engine/engine';
import { toVeePath } from './paths/paths';
import { deleteAt } from './values/access';
import { cloneValue } from './values/clone';

type VeeForm = FormContext<GenericObject> & PrivateFormContext<GenericObject>;

type PathStateMeta<T> = FieldMeta<T> & { errors: string[] };

const isPrivate = (form: FormContext<GenericObject>): form is VeeForm =>
  'createPathState' in form && 'fieldArrays' in form;

const holdsErrors = <T>(meta: FieldMeta<T>): meta is PathStateMeta<T> => 'errors' in meta;

const writable = (form: FormContext<GenericObject>): VeeForm => {
  if (!isPrivate(form)) {
    throw new Error('vee-validate no longer exposes the form internals the adapter needs');
  }
  return { ...form, values: reactive(toRaw(form.values)) };
};

const engineField = <T>(field: FieldContext<T>): EngineField<T> => {
  const { meta } = field;

  if (!holdsErrors(meta)) {
    throw new Error('vee-validate no longer keeps field errors on the path state');
  }
  return {
    value: field.value,
    touched: toRef(meta, 'touched'),
    attempted: toRef(meta, 'validated'),
    errors: toRef(meta, 'errors'),
    pending: toRef(meta, 'pending'),
    setTouched: (touched) => {
      meta.touched = touched;
    },
    setAttempted: (attempted) => {
      meta.validated = attempted;
    },
    setErrors: (messages) => {
      meta.errors = [...messages];
      meta.valid = messages.length === 0;
    },
    setPending: (pending) => {
      meta.pending = pending;
    },
  };
};

const engineArray = <T>(form: VeeForm, path: () => string): EngineArray<T> => {
  provide(FormContextKey, form);

  const array = useFieldArray<T>(() => toVeePath(path()));

  return {
    rows: array.fields,
    push: (value) => {
      array.push(value);
    },
    prepend: (value) => {
      array.prepend(value);
    },
    insert: (index, value) => {
      array.insert(index, value);
    },
    remove: (index) => {
      array.remove(index);
    },
    move: (from, to) => {
      array.move(from, to);
    },
    swap: (first, second) => {
      array.swap(first, second);
    },
    replace: (values) => {
      array.replace([...values]);
    },
  };
};

export const veeValidateEngine: FormEngineFactory = <V extends object>(initialValues: V) => {
  const form = useForm<V>({ keepValuesOnUnmount: true });
  const untyped: FormContext<GenericObject> = form;
  const internal = writable(untyped);

  untyped.setValues(cloneValue(initialValues), false);

  return {
    values: reactive(toRaw(form.values)),
    snapshot: () => cloneValue(toRaw(form.values)),
    submitCount: form.submitCount,
    setValue: (path, value) => {
      untyped.setFieldValue(toVeePath(path), value, false);
    },
    unsetValue: (path) => {
      deleteAt(internal.values, path);
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
          form: internal,
          label,
          validateOnValueUpdate: false,
          keepValueOnUnmount: true,
        }),
      ),
    array: <T>(path: () => string) => engineArray<T>(internal, path),
  };
};
