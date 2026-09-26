import { createNuiConfig, type NuiConfigOptions } from '@numior/primitives';
import {
  NuiCheckbox,
  NuiInput,
  NuiNumberField,
  NuiSelect,
  type NuiOptionSource,
} from '@numior/vue';
import { mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, nextTick, reactive, shallowRef, type VNode } from 'vue';
import {
  NuiForm,
  NuiFormField,
  useForm,
  type AnyFieldRule,
  type FormContext,
  type StandardSchema,
  type SubmitHandler,
  type ValidateOn,
} from '../../src';

export type ControlKind = 'input' | 'select' | 'checkbox' | 'number';

export interface FormFieldConfig {
  readonly path: string;
  readonly label: string;
  readonly control?: ControlKind;
  readonly rules?: readonly AnyFieldRule[];
  readonly validateOn?: ValidateOn;
  readonly keepValue?: boolean;
}

export interface FormDriverOptions<V extends object> {
  readonly initialValues: V;
  readonly fields: readonly FormFieldConfig[];
  readonly schema?: StandardSchema<unknown, unknown>;
  readonly onSubmit?: SubmitHandler<V, unknown>;
  readonly disabled?: boolean;
  readonly submitLabel?: string;
  readonly errorTitle?: string;
  readonly config?: NuiConfigOptions;
}

interface FieldScope {
  readonly field: {
    readonly name: string;
    readonly modelValue: never;
    readonly 'onUpdate:modelValue': (value: unknown) => void;
  };
  readonly pending: boolean;
}

const PLANS: NuiOptionSource<string> = [
  { value: 'free', label: 'Free' },
  { value: 'team', label: 'Team' },
];

const fieldId = (path: string): string => `field-${path.replaceAll('.', '-')}`;

const renderControl = (kind: ControlKind, scope: FieldScope): VNode[] => {
  const pending = scope.pending ? [h('span', { class: 'pending-mark' })] : [];

  if (kind === 'select') {
    return [h(NuiSelect, { ...scope.field, options: PLANS }), ...pending];
  }
  if (kind === 'checkbox') {
    return [h(NuiCheckbox, scope.field), ...pending];
  }
  if (kind === 'number') {
    return [h(NuiNumberField, scope.field), ...pending];
  }
  return [h(NuiInput, scope.field), ...pending];
};

const renderField = (config: FormFieldConfig): VNode =>
  h(
    NuiFormField,
    {
      key: config.path,
      id: fieldId(config.path),
      name: config.path,
      label: config.label,
      rules: config.rules,
      validateOn: config.validateOn,
      keepValue: config.keepValue,
    },
    { default: (scope: FieldScope) => renderControl(config.control ?? 'input', scope) },
  );

export class FormDriver<V extends object> {
  static mount<V extends object>(options: FormDriverOptions<V>): FormDriver<V> {
    const submissions: V[] = [];
    const view = reactive({ hidden: new Set<string>(), disabled: options.disabled ?? false });
    const captured = shallowRef<FormContext<V> | null>(null);

    const Host = defineComponent({
      setup: () => {
        const form = useForm<V, unknown>({
          initialValues: options.initialValues,
          schema: options.schema,
          onSubmit: (values, helpers) => {
            submissions.push(values);
            return options.onSubmit?.(values, helpers);
          },
        });

        captured.value = form;
        return () =>
          h('div', [
            h(
              NuiForm,
              {
                form,
                disabled: view.disabled,
                submitLabel: options.submitLabel,
                errorTitle: options.errorTitle,
              },
              () =>
                options.fields.filter((config) => !view.hidden.has(config.path)).map(renderField),
            ),
            h('button', { type: 'button', class: 'outside' }, 'Outside'),
          ]);
      },
    });

    const wrapper = mount(Host, {
      attachTo: document.body,
      global: { plugins: options.config === undefined ? [] : [createNuiConfig(options.config)] },
    });

    if (!captured.value) {
      throw new Error('useForm did not run');
    }
    return new FormDriver(wrapper, captured.value, submissions, view);
  }

  private constructor(
    private readonly wrapper: VueWrapper,
    readonly form: FormContext<V>,
    readonly submissions: readonly V[],
    private readonly view: { hidden: Set<string>; disabled: boolean },
  ) {}

  private control(path: string): DOMWrapper<HTMLElement> {
    return this.wrapper.find<HTMLElement>(`#${fieldId(path)}`);
  }

  private fieldRoot(path: string): Element {
    const root = this.control(path).element.closest('.nui-field');

    if (!root) {
      throw new Error(`no field for ${path}`);
    }
    return root;
  }

  private get formElement(): DOMWrapper<HTMLFormElement> {
    return this.wrapper.find<HTMLFormElement>('form');
  }

  get values(): FormContext<V>['values'] {
    return this.form.values;
  }

  get busy(): boolean {
    return this.formElement.attributes('aria-busy') === 'true';
  }

  get submitLoading(): boolean {
    return this.wrapper.find('button[type="submit"]').classes().includes('nui-button--loading');
  }

  get submitDisabled(): boolean {
    return this.wrapper.find<HTMLButtonElement>('button[type="submit"]').element.disabled;
  }

  get alert(): DOMWrapper<Element> {
    return this.wrapper.find('.nui-form__errors .nui-alert');
  }

  get submitText(): string {
    return this.wrapper.find('button[type="submit"]').text();
  }

  get alertTitle(): string {
    return this.alert.find('.nui-alert__title').text();
  }

  get alertElement(): Element | undefined {
    return this.alert.exists() ? this.alert.element : undefined;
  }

  get alertItems(): string[] {
    const list = this.alert.findAll('li');
    return list.length > 0
      ? list.map((item) => item.text())
      : [this.alert.find('.nui-alert__description').text()];
  }

  get focused(): string | undefined {
    const active = document.activeElement;

    if (active?.closest('.nui-form__errors')) {
      return 'form-errors';
    }
    return active instanceof HTMLElement && active.id.startsWith('field-')
      ? active.id.slice(6)
      : undefined;
  }

  error(path: string): string | undefined {
    return this.fieldRoot(path).querySelector('.nui-field__error')?.textContent?.trim();
  }

  invalid(path: string): boolean {
    return this.control(path).attributes('aria-invalid') === 'true';
  }

  describedBy(path: string): string[] {
    return (this.control(path).attributes('aria-describedby') ?? '').split(' ').filter(Boolean);
  }

  describes(path: string, text: string): boolean {
    return this.describedBy(path).some(
      (id) => document.getElementById(id)?.textContent?.trim() === text,
    );
  }

  disabled(path: string): boolean {
    return this.control(path).attributes('disabled') !== undefined;
  }

  pending(path: string): boolean {
    return this.fieldRoot(path).querySelector('.pending-mark') !== null;
  }

  touched(path: string): boolean {
    return this.form.isFieldTouched(path);
  }

  shownValue(path: string): string {
    const control = this.control(path).element;
    return control instanceof HTMLInputElement ? control.value : '';
  }

  async type(path: string, text: string): Promise<void> {
    const control = this.control(path).element;

    if (control instanceof HTMLInputElement) {
      control.value = text;
      control.dispatchEvent(new Event('input', { bubbles: true }));
    }
    await this.settle();
  }

  edit(path: string, text: string): Promise<void> {
    const control = this.control(path).element;

    if (control instanceof HTMLInputElement) {
      control.value = text;
      control.dispatchEvent(new Event('input', { bubbles: true }));
    }
    return nextTick();
  }

  async leave(path: string, to = 'outside'): Promise<void> {
    const target =
      to === 'outside' ? this.wrapper.find('.outside').element : this.control(to).element;

    this.control(path).element.dispatchEvent(
      new FocusEvent('focusout', { bubbles: true, relatedTarget: target }),
    );

    await this.settle();
  }

  leaveNow(path: string): Promise<void> {
    this.control(path).element.dispatchEvent(
      new FocusEvent('focusout', {
        bubbles: true,
        relatedTarget: this.wrapper.find('.outside').element,
      }),
    );

    return nextTick();
  }

  async moveWithin(path: string, selector: string): Promise<void> {
    const root = this.fieldRoot(path);

    this.control(path).element.dispatchEvent(
      new FocusEvent('focusout', { bubbles: true, relatedTarget: root.querySelector(selector) }),
    );

    await this.settle();
  }

  async submit(): Promise<void> {
    this.wrapper.find<HTMLButtonElement>('button[type="submit"]').element.click();
    await this.settle();
  }

  async requestSubmit(): Promise<void> {
    this.formElement.element.requestSubmit();
    await this.settle();
  }

  pressSubmit(): Promise<void> {
    this.wrapper.find<HTMLButtonElement>('button[type="submit"]').element.click();
    return nextTick();
  }

  async reset(): Promise<void> {
    this.formElement.element.reset();
    await this.settle();
  }

  async hide(path: string): Promise<void> {
    this.view.hidden.add(path);
    await nextTick();
  }

  async show(path: string): Promise<void> {
    this.view.hidden.delete(path);
    await nextTick();
  }

  async settle(): Promise<void> {
    await this.form.settled();
    await nextTick();
  }
}
