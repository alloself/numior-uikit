import { computed, provide, reactive, shallowRef, toRaw, toRef } from 'vue';
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
import type { EngineArray, EntryState, FormEngineFactory } from './engine/engine.types';
import { toVeePath } from './paths/paths';
import { deleteAt } from './values/access';
import { cloneValue } from './values/clone';
import { reactiveView } from './values/view';

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

const engineField = (field: FieldContext<unknown>): EntryState => {
  const { meta } = field;

  if (!holdsErrors(meta)) {
    throw new Error('vee-validate no longer keeps field errors on the path state');
  }
  return {
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

const engineArray = (form: VeeForm, path: () => string, changed: () => void): EngineArray => {
  provide(FormContextKey, form);

  const array = useFieldArray<unknown>(() => toVeePath(path()));

  return {
    keys: computed(() => array.fields.value.map((row) => row.key)),
    push: (value) => {
      array.push(cloneValue(value));
      changed();
    },
    prepend: (value) => {
      array.prepend(cloneValue(value));
      changed();
    },
    insert: (index, value) => {
      array.insert(index, cloneValue(value));
      changed();
    },
    remove: (index) => {
      array.remove(index);
      changed();
    },
    move: (from, to) => {
      array.move(from, to);
      changed();
    },
    swap: (first, second) => {
      array.swap(first, second);
      changed();
    },
    replace: (values) => {
      array.replace(values.map(cloneValue));
      changed();
    },
  };
};

export const veeValidateEngine: FormEngineFactory = <V extends object>(initialValues: V) => {
  const form = useForm<V>({ keepValuesOnUnmount: true });
  const untyped: FormContext<GenericObject> = form;
  const internal = writable(untyped);
  const version = shallowRef(0);

  const changed = (): void => {
    version.value += 1;
  };

  untyped.setValues(cloneValue(initialValues), false);

  const raw = toRaw(form.values);

  return {
    raw,
    values: reactiveView(raw),
    version,
    snapshot: () => cloneValue(raw),
    submitCount: form.submitCount,
    setValue: (path, value) => {
      untyped.setFieldValue(toVeePath(path), cloneValue(value), false);
      changed();
    },
    unsetValue: (path) => {
      deleteAt(internal.values, path);
      changed();
    },
    mergeValues: (values) => {
      untyped.setValues(cloneValue(values), false);
      changed();
    },
    reset: (values) => {
      untyped.resetForm(
        { values: cloneValue(values), touched: {}, errors: {}, submitCount: 0 },
        { force: true },
      );

      changed();
    },
    countSubmit: () => {
      form.submitCount.value += 1;
    },
    field: (path, label) =>
      engineField(
        useField<unknown>(() => toVeePath(path()), undefined, {
          form: internal,
          label,
          validateOnValueUpdate: false,
          keepValueOnUnmount: true,
        }),
      ),
    array: (path) => engineArray(internal, path, changed),
  };
};
