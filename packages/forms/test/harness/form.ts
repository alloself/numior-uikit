import { createNuiConfig, type NuiConfigOptions } from '@numior/primitives';
import { mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils';
import { vi } from 'vite-plus/test';
import { markRaw, nextTick, reactive } from 'vue';
import type {
  FormContext,
  FormField,
  FormMessage,
  FormMeta,
  ResetOptions,
  SubmitResult,
  UseFormOptions,
  ValidateOptions,
  ValidationSummary,
  SubmittedValues,
} from '../../src';
import FieldProbesForm from '../fixtures/FieldProbesForm.vue';
import type { FieldProbes, FieldSpec, FieldView } from '../fixtures/scenes.types';

export type { FieldSpec } from '../fixtures/scenes.types';

export interface FormHarnessOptions<V extends object, O> extends Omit<
  UseFormOptions<V, O>,
  'onSubmit'
> {
  readonly fields: readonly (string | FieldSpec)[];
  readonly hidden?: readonly string[];
  readonly config?: NuiConfigOptions;
  readonly onSubmit?: UseFormOptions<V, O>['onSubmit'];
}

const specOf = (input: string | FieldSpec): FieldSpec =>
  typeof input === 'string' ? { path: input } : input;

export class FormHarness<V extends object> {
  static mount<V extends object, O = V>(options: FormHarnessOptions<V, O>): FormHarness<V> {
    const { fields, hidden = [], config, onSubmit, ...rest } = options;
    const submissions: SubmittedValues<V>[] = [];

    const view: FieldView = reactive({
      hidden: new Set(hidden),
      inactive: new Set<string>(),
      disabled: new Set<string>(),
    });

    const formOptions: UseFormOptions<V, O> = {
      ...rest,
      onSubmit: (values, helpers) => {
        submissions.push(values);
        return onSubmit?.(values, helpers);
      },
    };

    const wrapper = mount(FieldProbesForm<V, O>, {
      props: {
        options: markRaw(formOptions),
        specs: fields.map(specOf),
        view,
      },
      attachTo: document.body,
      global: { plugins: config === undefined ? [] : [createNuiConfig(config)] },
    });

    return new FormHarness(wrapper.vm.form, wrapper, wrapper.vm.probes, view, submissions);
  }

  private constructor(
    readonly form: FormContext<V>,
    private readonly wrapper: VueWrapper,
    private readonly probes: FieldProbes,
    private readonly view: FieldView,
    readonly submissions: readonly SubmittedValues<V>[],
  ) {}

  field(path: string): FormField<unknown> {
    const field = this.probes.fields.get(path);

    if (!field) {
      throw new Error(`the field ${path} is not mounted`);
    }
    return field;
  }

  private input(path: string): DOMWrapper<HTMLInputElement> {
    return this.wrapper.find<HTMLInputElement>(`[id="${path}"]`);
  }

  get values(): FormContext<V>['values'] {
    return this.form.values;
  }

  get meta(): FormMeta {
    return this.form.meta.value;
  }

  get formErrors(): readonly FormMessage[] {
    return this.form.formErrors.value;
  }

  get focusedPath(): string | undefined {
    return document.activeElement instanceof HTMLInputElement
      ? document.activeElement.id
      : undefined;
  }

  shownValue(path: string): string {
    return this.input(path).element.value;
  }

  error(path: string): string | undefined {
    const error = this.wrapper.find(`[id="${path}-error"]`);
    return error.exists() ? error.text() : undefined;
  }

  errors(path: string): readonly string[] {
    return this.field(path).errors.value;
  }

  touched(path: string): boolean {
    return this.field(path).meta.touched;
  }

  pending(path: string): boolean {
    return this.field(path).meta.pending;
  }

  dirty(path: string): boolean {
    return this.form.isFieldDirty(path);
  }

  async type(path: string, text: string): Promise<void> {
    const input = this.input(path);

    input.element.value = text;
    await input.trigger('input');
    await this.probes.work.get(path);
    await nextTick();
  }

  async change(path: string, value: unknown): Promise<void> {
    await this.field(path).setValue(value);
    await nextTick();
  }

  async setValues(values: Parameters<FormContext<V>['setValues']>[0]): Promise<void> {
    await this.form.setValues(values);
    await nextTick();
  }

  async blur(path: string): Promise<void> {
    await this.input(path).trigger('blur');
    await this.probes.work.get(path);
    await nextTick();
  }

  async submit(): Promise<SubmitResult> {
    const result = await this.form.submit();

    await nextTick();
    return result;
  }

  startSubmit(): Promise<SubmitResult> {
    return this.form.submit();
  }

  async validate(options?: ValidateOptions): Promise<ValidationSummary> {
    const summary = await this.form.validate(options);

    await nextTick();
    return summary;
  }

  async reset(options?: ResetOptions<V>): Promise<void> {
    this.form.resetForm(options);
    await nextTick();
  }

  async hide(path: string): Promise<void> {
    this.view.hidden.add(path);
    await nextTick();
  }

  async show(path: string): Promise<void> {
    this.view.hidden.delete(path);
    await nextTick();
  }

  async deactivate(path: string): Promise<void> {
    this.view.inactive.add(path);
    await nextTick();
  }

  async activate(path: string): Promise<void> {
    this.view.inactive.delete(path);
    await nextTick();
  }

  async disable(path: string): Promise<void> {
    this.view.disabled.add(path);
    await nextTick();
  }

  async wait(milliseconds: number): Promise<void> {
    await vi.advanceTimersByTimeAsync(milliseconds);
    await nextTick();
  }

  async settle(): Promise<void> {
    await this.form.settled();
    await nextTick();
  }

  unmount(): void {
    this.wrapper.unmount();
  }
}
