import { mount } from '@vue/test-utils';
import { useField } from 'vee-validate';
import { defineComponent, h, nextTick, type Ref } from 'vue';
import { useForm, type FormContext } from '../../src';
import { veeValidateEngine } from '../../src/vee-validate';

interface Profile {
  nickname: string;
}

interface Captured {
  form?: FormContext<Profile>;
  field?: Ref<string>;
}

export class VeeInterop {
  static mount(nickname: string): VeeInterop {
    const captured: Captured = {};

    const Nickname = defineComponent({
      setup: () => {
        captured.field = useField<string>('nickname').value;
        return () => h('i');
      },
    });

    const Host = defineComponent({
      setup: () => {
        captured.form = useForm<Profile>({
          initialValues: { nickname },
          engine: veeValidateEngine,
          onSubmit: () => undefined,
        });

        return () => h(Nickname);
      },
    });

    mount(Host);

    if (!captured.form || !captured.field) {
      throw new Error('the interop host did not mount');
    }
    return new VeeInterop(captured.form, captured.field);
  }

  private constructor(
    private readonly form: FormContext<Profile>,
    private readonly field: Ref<string>,
  ) {}

  get veeValue(): string {
    return this.field.value;
  }

  get formValue(): string {
    return this.form.values.nickname;
  }

  async typeInVee(value: string): Promise<void> {
    this.field.value = value;
    await nextTick();
  }

  async setInForm(value: string): Promise<void> {
    await this.form.setFieldValue('nickname', value);
    await nextTick();
  }
}
