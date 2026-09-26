import { mount } from '@vue/test-utils';
import { defineComponent, h, shallowRef, type Component } from 'vue';
import {
  provideForm,
  useField,
  useForm,
  useFormContext,
  type FormContext,
  type FormField,
  type FormHandle,
} from '../../src';

export type Lookup = 'injected' | 'provided';

interface Names {
  readonly name: string;
}

interface Found {
  readonly contexts: Map<Lookup, FormHandle | null>;
  field: FormField<string> | null;
}

const noop = (): void => undefined;

const lookup = (kind: Lookup, found: Found) =>
  defineComponent({
    setup: () => {
      found.contexts.set(kind, useFormContext());
      return () => h('i');
    },
  });

const fieldOf = (form: FormContext<Names>, found: Found) =>
  defineComponent({
    setup: () => {
      found.field = useField((values: Names) => values.name, { form });
      return () => h('i');
    },
  });

const providing = (form: FormHandle, child: Component): Component =>
  defineComponent({
    setup: () => {
      provideForm(form);
      return () => h(child);
    },
  });

export class TwoFormsHarness {
  static mount(first: Names, second: Names): TwoFormsHarness {
    const found: Found = { contexts: new Map(), field: null };
    const forms = shallowRef<readonly [FormContext<Names>, FormContext<Names>] | null>(null);

    const Host = defineComponent({
      setup: () => {
        const pair = [
          useForm({ initialValues: first, onSubmit: noop }),
          useForm({ initialValues: second, onSubmit: noop }),
        ] as const;

        forms.value = pair;
        return () => [
          h(fieldOf(pair[0], found)),
          h(lookup('injected', found)),
          h(providing(pair[0], lookup('provided', found))),
        ];
      },
    });

    mount(Host);

    if (!forms.value || !found.field) {
      throw new Error('useForm did not run');
    }
    return new TwoFormsHarness(forms.value, found.field, found.contexts);
  }

  private constructor(
    readonly forms: readonly [FormContext<Names>, FormContext<Names>],
    readonly field: FormField<string>,
    private readonly contexts: Map<Lookup, FormHandle | null>,
  ) {}

  context(kind: Lookup): FormHandle | null {
    return this.contexts.get(kind) ?? null;
  }
}

export const contextOutsideForm = (): FormHandle | null => {
  const captured = shallowRef<FormHandle | null>(null);

  mount(
    defineComponent({
      setup: () => {
        captured.value = useFormContext();
        return () => h('i');
      },
    }),
  );

  return captured.value;
};
