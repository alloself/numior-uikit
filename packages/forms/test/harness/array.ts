import { flushPromises, mount, type DOMWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import type {
  AnyFieldRule,
  FieldArray,
  FormContext,
  FormField,
  StandardSchema,
  SubmitResult,
  SubmittedValues,
} from '../../src';
import ArrayScene from '../fixtures/ArrayScene.vue';
import type { Contact, RowProbes, Team } from '../fixtures/scenes.types';
import type { HeldSchema } from './schema';

export interface ArrayHarnessOptions {
  readonly initialValues: Team;
  readonly listRules?: readonly AnyFieldRule<readonly Contact[], Team>[];
  readonly rowRules?: readonly AnyFieldRule<string | undefined, Team>[];
  readonly rowKeepValue?: boolean;
  readonly schema?: StandardSchema<unknown, unknown>;
  readonly onSubmit?: (values: SubmittedValues<Team>) => unknown;
}

type ArraySceneWrapper = ReturnType<typeof mountScene>;

const mountScene = (options: ArrayHarnessOptions) =>
  mount(ArrayScene, {
    props: {
      initialValues: options.initialValues,
      listRules: options.listRules,
      rowRules: options.rowRules,
      rowKeepValue: options.rowKeepValue,
      schema: options.schema,
      onSubmit: options.onSubmit,
    },
    attachTo: document.body,
  });

export class ArrayHarness {
  static mount(options: ArrayHarnessOptions): ArrayHarness {
    const wrapper = mountScene(options);

    return new ArrayHarness(wrapper, wrapper.vm.form, wrapper.vm.list, wrapper.vm.probes);
  }

  private constructor(
    private readonly wrapper: ArraySceneWrapper,
    readonly form: FormContext<Team>,
    readonly list: FieldArray<Contact>,
    private readonly probes: RowProbes,
  ) {}

  get keys(): readonly string[] {
    return this.list.fields.value.map((row) => row.key);
  }

  get values(): FormContext<Team>['values'] {
    return this.form.values;
  }

  get submissions(): readonly SubmittedValues<Team>[] {
    return this.wrapper.vm.submissions;
  }

  get listError(): string | undefined {
    const error = this.wrapper.find('#list-error');
    return error.exists() ? error.text() : undefined;
  }

  private keyAt(index: number): string {
    const key = this.keys[index];

    if (key === undefined) {
      throw new Error(`no row at ${index}`);
    }
    return key;
  }

  private input(index: number): DOMWrapper<HTMLInputElement> {
    return this.wrapper.find<HTMLInputElement>(`#row-${this.keyAt(index)}`);
  }

  row(index: number): FormField<string | undefined> {
    const field = this.probes.rows.get(this.keyAt(index));

    if (!field) {
      throw new Error(`the row ${index} has no mounted field`);
    }
    return field;
  }

  rowError(index: number): string | undefined {
    const error = this.wrapper.find(`#row-${this.keyAt(index)}-error`);
    return error.exists() ? error.text() : undefined;
  }

  async type(index: number, value: string): Promise<void> {
    const input = this.input(index);

    input.element.value = value;
    await input.trigger('input');
    await this.probes.work.get(this.keyAt(index));
    await nextTick();
  }

  startType(index: number, value: string): void {
    const input = this.input(index);

    input.element.value = value;
    input.element.dispatchEvent(new Event('input'));
  }

  startMove(from: number, to: number): void {
    void this.list.move(from, to);
  }

  startSubmit(): Promise<SubmitResult> {
    return this.form.submit();
  }

  async answer(schema: HeldSchema): Promise<void> {
    await flushPromises();
    schema.release();
    await flushPromises();
  }

  async blur(index: number): Promise<void> {
    await this.input(index).trigger('blur');
    await this.probes.work.get(this.keyAt(index));
    await nextTick();
  }

  async push(value: Contact): Promise<void> {
    await this.list.push(value);
    await nextTick();
  }

  async prepend(value: Contact): Promise<void> {
    await this.list.prepend(value);
    await nextTick();
  }

  async insert(index: number, value: Contact): Promise<void> {
    await this.list.insert(index, value);
    await nextTick();
  }

  async remove(index: number): Promise<void> {
    await this.list.remove(index);
    await nextTick();
  }

  async move(from: number, to: number): Promise<void> {
    await this.list.move(from, to);
    await nextTick();
  }

  async swap(first: number, second: number): Promise<void> {
    await this.list.swap(first, second);
    await nextTick();
  }

  async replace(values: readonly Contact[]): Promise<void> {
    await this.list.replace(values);
    await nextTick();
  }

  async update(index: number, value: Contact): Promise<void> {
    await this.list.update(index, value);
    await nextTick();
  }

  async deactivate(): Promise<void> {
    await this.wrapper.setProps({ active: false });
  }

  async submit(): Promise<SubmitResult> {
    const result = await this.form.submit();

    await nextTick();
    return result;
  }
}
