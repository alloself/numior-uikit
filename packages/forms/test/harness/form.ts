import { createNuiConfig, type NuiConfigOptions } from '@numior/primitives';
import { mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils';
import { vi } from 'vite-plus/test';
import {
  defineComponent,
  h,
  nextTick,
  onBeforeUnmount,
  reactive,
  shallowRef,
  type Component,
} from 'vue';
import {
  byPath,
  useField,
  useForm,
  type AnyFieldRule,
  type FieldFlush,
  type FormContext,
  type FormField,
  type FormMessage,
  type FormMeta,
  type ResetOptions,
  type SubmitResult,
  type UseFormOptions,
  type ValidateOn,
  type ValidateOptions,
  type ValidationSummary,
  type SubmittedValues,
} from '../../src';

export interface FieldSpec {
  readonly path: string;
  readonly validateOn?: ValidateOn;
  readonly keepValue?: boolean;
  readonly debounce?: number;
  readonly rules?: readonly AnyFieldRule[];
  readonly label?: string;
  readonly flush?: FieldFlush;
}

export interface FormHarnessOptions<V extends object, O> extends Omit<
  UseFormOptions<V, O>,
  'onSubmit'
> {
  readonly fields: readonly (string | FieldSpec)[];
  readonly hidden?: readonly string[];
  readonly config?: NuiConfigOptions;
  readonly onSubmit?: UseFormOptions<V, O>['onSubmit'];
}

interface View {
  readonly hidden: Set<string>;
  readonly inactive: Set<string>;
  readonly disabled: Set<string>;
}

const specOf = (input: string | FieldSpec): FieldSpec =>
  typeof input === 'string' ? { path: input } : input;

const display = (value: unknown): string => (typeof value === 'string' ? value : '');

interface Probes {
  readonly fields: Map<string, FormField<unknown>>;
  readonly work: Map<string, Promise<void>>;
}

const probeFor = <V extends object>(
  spec: FieldSpec,
  view: View,
  { fields, work }: Probes,
  form: () => FormContext<V>,
) =>
  defineComponent({
    setup: () => {
      const element = shallowRef<HTMLInputElement | null>(null);
      const { path, ...options } = spec;

      const field = useField(byPath(path), {
        ...options,
        form: form(),
        element,
        active: () => !view.inactive.has(path),
        disabled: () => view.disabled.has(path),
      });

      fields.set(path, field);
      onBeforeUnmount(() => fields.delete(path));

      const onInput = (event: Event): void => {
        if (event.target instanceof HTMLInputElement) {
          work.set(path, field.setValue(event.target.value));
        }
      };

      const onBlur = (): void => {
        work.set(path, field.handleBlur());
      };

      return () =>
        h('label', { class: 'probe' }, [
          h('input', {
            ref: element,
            id: path,
            value: display(field.value.value),
            onInput,
            onBlur,
          }),
          field.errorMessage.value === undefined
            ? null
            : h('span', { id: `${path}-error` }, field.errorMessage.value),
        ]);
    },
  });

export class FormHarness<V extends object> {
  static mount<V extends object, O = V>(options: FormHarnessOptions<V, O>): FormHarness<V> {
    const { fields: inputs, hidden = [], config, onSubmit, ...formOptions } = options;
    const probes: Probes = { fields: new Map(), work: new Map() };
    const submissions: SubmittedValues<V>[] = [];

    const view: View = reactive({
      hidden: new Set(hidden),
      inactive: new Set<string>(),
      disabled: new Set<string>(),
    });

    const captured = shallowRef<FormContext<V> | null>(null);

    const current = (): FormContext<V> => {
      if (!captured.value) {
        throw new Error('useForm did not run');
      }
      return captured.value;
    };

    const components = inputs
      .map(specOf)
      .map((spec) => [spec, probeFor(spec, view, probes, current)] as const);

    const Host: Component = defineComponent({
      setup: () => {
        captured.value = useForm<V, O>({
          ...formOptions,
          onSubmit: (values, helpers) => {
            submissions.push(values);
            return onSubmit?.(values, helpers);
          },
        });

        return () =>
          h(
            'form',
            { novalidate: true },
            components
              .filter(([spec]) => !view.hidden.has(spec.path))
              .map(([spec, Probe]) => h(Probe, { key: spec.path })),
          );
      },
    });

    const wrapper = mount(Host, {
      attachTo: document.body,
      global: { plugins: config === undefined ? [] : [createNuiConfig(config)] },
    });

    return new FormHarness(current(), wrapper, probes, view, submissions);
  }

  private constructor(
    readonly form: FormContext<V>,
    private readonly wrapper: VueWrapper,
    private readonly probes: Probes,
    private readonly view: View,
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
