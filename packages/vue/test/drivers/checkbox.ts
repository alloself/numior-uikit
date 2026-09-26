import { mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, nextTick, ref, type Ref } from 'vue';
import {
  NuiCheckbox,
  NuiCheckboxGroup,
  NuiField,
  type NuiCheckboxGroupProps,
  type NuiCheckboxProps,
  type NuiFieldProps,
} from '../../src';
import { ComponentDriver } from './component';
import { waitForGlyph } from './icon';

export interface CheckboxMountOptions {
  readonly props?: NuiCheckboxProps;
  readonly modelValue?: boolean;
  readonly attrs?: Record<string, unknown>;
  readonly label?: string;
}

export interface CheckboxGroupMountOptions {
  readonly props?: Omit<NuiCheckboxGroupProps<string>, 'options'>;
  readonly modelValue?: string[];
  readonly values?: readonly string[];
  readonly disabledValues?: readonly string[];
  readonly field?: NuiFieldProps;
}

const MARK_GLYPH = '.nui-checkbox__mark .nui-icon__glyph';

const isStrings = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

export class CheckboxDriver extends ComponentDriver {
  protected readonly block = 'nui-checkbox';

  static mount({ props = {}, modelValue, attrs = {}, label }: CheckboxMountOptions = {}) {
    return new CheckboxDriver(
      mount(NuiCheckbox, {
        props: { ...props, ...(modelValue === undefined ? {} : { modelValue }) },
        attrs,
        slots: label ? { default: label } : {},
      }),
    );
  }

  ready(): Promise<void> {
    return waitForGlyph(this.wrapper, MARK_GLYPH);
  }

  get control(): DOMWrapper<HTMLInputElement> {
    return this.wrapper.find<HTMLInputElement>('input');
  }

  get checked(): boolean {
    return this.control.element.checked;
  }

  get indeterminate(): boolean {
    return this.control.element.indeterminate;
  }

  get emittedModels(): boolean[] {
    return (this.wrapper.emitted('update:modelValue') ?? []).flatMap(([value]) =>
      typeof value === 'boolean' ? [value] : [],
    );
  }

  get markGlyphClasses(): string[] {
    return this.wrapper.find(MARK_GLYPH).classes();
  }

  get labelText(): string {
    return this.wrapper.find('.nui-checkbox__label').text();
  }

  async toggle(): Promise<void> {
    this.control.element.checked = !this.control.element.checked;
    await this.control.trigger('change');
  }

  async receive(props: NuiCheckboxProps & { modelValue?: boolean }) {
    await this.wrapper.setProps(props);
    await this.ready();
  }
}

export class CheckboxGroupDriver extends ComponentDriver {
  protected readonly block = 'nui-checkbox-group';

  static mount({
    props = {},
    modelValue = [],
    values = ['a', 'b', 'c'],
    disabledValues = [],
    field,
  }: CheckboxGroupMountOptions = {}) {
    const options = values.map((value) => ({
      value,
      label: value.toUpperCase(),
      disabled: disabledValues.includes(value),
    }));

    const model = ref<string[]>(modelValue);
    const emitted: string[][] = [];

    const group = () =>
      h(NuiCheckboxGroup<string>, {
        ...props,
        options,
        modelValue: model.value,
        'onUpdate:modelValue': (value: unknown) => {
          if (isStrings(value)) {
            emitted.push(value);
            model.value = value;
          }
        },
      });

    const Host = defineComponent({
      setup: () => () => (field ? h(NuiField, field, group) : group()),
    });

    return new CheckboxGroupDriver(mount(Host), model, emitted);
  }

  private constructor(
    wrapper: VueWrapper,
    private readonly model: Ref<string[]>,
    readonly emittedModels: readonly string[][],
  ) {
    super(wrapper);
  }

  get group(): DOMWrapper<Element> {
    return this.wrapper.find('[role="group"]');
  }

  get checkboxes(): DOMWrapper<HTMLInputElement>[] {
    return this.wrapper.findAll<HTMLInputElement>('input[type="checkbox"]');
  }

  get checked(): string[] {
    return this.checkboxes.filter((box) => box.element.checked).map((box) => box.element.value);
  }

  get names(): Array<string | undefined> {
    return this.checkboxes.map((box) => box.attributes('name'));
  }

  async toggle(index: number): Promise<void> {
    const box = this.checkboxes[index];

    if (!box) {
      throw new Error(`no checkbox at ${index}`);
    }
    box.element.checked = !box.element.checked;
    await box.trigger('change');
  }

  async receive(modelValue: string[]): Promise<void> {
    this.model.value = modelValue;
    await nextTick();
  }
}
