import { mount } from '@vue/test-utils';
import { defineComponent, h, shallowRef, type Component } from 'vue';
import {
  provideForm,
  useField,
  useForm,
  useFormContext,
  type FormContext,
  type FormField,
} from '../../src';

export type Binding = 'explicit' | 'injected' | 'provided';

interface Names {
  readonly name: string;
}

const noop = (): void => undefined;

const fieldProbe = (binding: Binding, sink: Map<Binding, FormField<unknown>>, form?: FormContext) =>
  defineComponent({
    setup: () => {
      sink.set(binding, useField('name', form === undefined ? {} : { form }));
      return () => h('i');
    },
  });

const providing = (form: FormContext, child: Component): Component =>
  defineComponent({
    setup: () => {
      provideForm(form);
      return () => h(child);
    },
  });

export class TwoFormsHarness {
  static mount(first: Names, second: Names): TwoFormsHarness {
    const fields = new Map<Binding, FormField<unknown>>();
    const forms = shallowRef<readonly [FormContext<Names>, FormContext<Names>] | null>(null);

    const Host = defineComponent({
      setup: () => {
        const pair = [
          useForm({ initialValues: first, onSubmit: noop }),
          useForm({ initialValues: second, onSubmit: noop }),
        ] as const;

        forms.value = pair;
        return () => [
          h(fieldProbe('explicit', fields, pair[0])),
          h(fieldProbe('injected', fields)),
          h(providing(pair[0], fieldProbe('provided', fields))),
        ];
      },
    });

    mount(Host);

    if (!forms.value) {
      throw new Error('useForm did not run');
    }
    return new TwoFormsHarness(forms.value, fields);
  }

  private constructor(
    readonly forms: readonly [FormContext<Names>, FormContext<Names>],
    private readonly fields: Map<Binding, FormField<unknown>>,
  ) {}

  field(binding: Binding): FormField<unknown> {
    const field = this.fields.get(binding);

    if (!field) {
      throw new Error(`no ${binding} field`);
    }
    return field;
  }
}

export const contextOutsideForm = (): FormContext | null => {
  const captured = shallowRef<FormContext | null>(null);

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

export const fieldOutsideForm = (): unknown => {
  const failure = shallowRef<unknown>(undefined);

  mount(
    defineComponent({
      setup: () => {
        try {
          useField('name');
        } catch (error) {
          failure.value = error;
        }
        return () => h('i');
      },
    }),
  );

  return failure.value;
};
