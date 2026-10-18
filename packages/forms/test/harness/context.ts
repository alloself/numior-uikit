import { mount } from '@vue/test-utils';
import { shallowRef } from 'vue';
import type { FormContext, FormField, FormHandle } from '../../src';
import FormContextProbe from '../fixtures/FormContextProbe.vue';
import TwoFormsScene from '../fixtures/TwoFormsScene.vue';
import type { Lookup, Names } from '../fixtures/scenes.types';

export class TwoFormsHarness {
  static mount(first: Names, second: Names): TwoFormsHarness {
    const contexts = new Map<Lookup, FormHandle | null>();

    const wrapper = mount(TwoFormsScene, {
      props: {
        first,
        second,
        found: (kind, context) => {
          contexts.set(kind, context);
        },
      },
    });

    return new TwoFormsHarness(wrapper.vm.forms, wrapper.vm.field, contexts);
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

  mount(FormContextProbe, {
    props: {
      found: (context) => {
        captured.value = context;
      },
    },
  });

  return captured.value;
};
