import { mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, nextTick, onBeforeUnmount, shallowRef } from 'vue';
import {
  useField,
  useFieldArray,
  useForm,
  type AnyFieldRule,
  type FieldArray,
  type FieldArrayRow,
  type FormContext,
  type FormField,
  type SubmitResult,
} from '../../src';

type Values = Readonly<Record<string, unknown>>;

export interface ArrayHarnessOptions {
  readonly initialValues: Values;
  readonly path: string;
  readonly field: string;
  readonly listRules?: readonly AnyFieldRule<readonly unknown[]>[];
  readonly rowRules?: readonly AnyFieldRule[];
}

interface Parts {
  readonly rows: Map<string, FormField<unknown>>;
  readonly work: Map<string, Promise<void>>;
  readonly active: { value: boolean };
  readonly submissions: Values[];
}

const text = (value: unknown): string => (typeof value === 'string' ? value : '');

const rowComponent = (options: ArrayHarnessOptions, parts: Parts) =>
  defineComponent(
    (props: { readonly row: FieldArrayRow<unknown> }) => {
      const field = useField<unknown>(() => `${props.row.path}.${options.field}`, {
        rules: options.rowRules ?? [],
      });

      const { key } = props.row;

      parts.rows.set(key, field);
      onBeforeUnmount(() => parts.rows.delete(key));

      const onInput = (event: Event): void => {
        if (event.target instanceof HTMLInputElement) {
          parts.work.set(key, field.setValue(event.target.value));
        }
      };

      const onBlur = (): void => {
        parts.work.set(key, field.handleBlur());
      };

      return () =>
        h('li', [
          h('input', { id: `row-${key}`, value: text(field.value.value), onInput, onBlur }),
          field.errorMessage.value === undefined
            ? null
            : h('span', { id: `row-${key}-error` }, field.errorMessage.value),
        ]);
    },
    { props: ['row'] },
  );

export class ArrayHarness {
  static mount(options: ArrayHarnessOptions): ArrayHarness {
    const active = shallowRef(true);

    const parts: Parts = {
      rows: new Map(),
      work: new Map(),
      active,
      submissions: [],
    };

    const form = shallowRef<FormContext<Values> | null>(null);
    const list = shallowRef<FieldArray<unknown> | null>(null);
    const Row = rowComponent(options, parts);

    const List = defineComponent(() => {
      const array = useFieldArray<unknown>(options.path, {
        rules: options.listRules ?? [],
        active: () => active.value,
      });

      list.value = array;
      return () =>
        h('section', [
          h(
            'ol',
            array.fields.value.map((row) => h(Row, { key: row.key, row })),
          ),
          array.errorMessage.value === undefined
            ? null
            : h('p', { id: 'list-error' }, array.errorMessage.value),
        ]);
    });

    const Host = defineComponent(() => {
      form.value = useForm<Values>({
        initialValues: options.initialValues,
        onSubmit: (values) => {
          parts.submissions.push(values);
        },
      });

      return () => h(List);
    });

    const wrapper = mount(Host, { attachTo: document.body });

    if (!form.value || !list.value) {
      throw new Error('useFieldArray did not run');
    }
    return new ArrayHarness(wrapper, form.value, list.value, parts);
  }

  private constructor(
    private readonly wrapper: VueWrapper,
    readonly form: FormContext<Values>,
    readonly list: FieldArray<unknown>,
    private readonly parts: Parts,
  ) {}

  get keys(): readonly string[] {
    return this.list.fields.value.map((row) => row.key);
  }

  get values(): Values {
    return this.form.values;
  }

  get submissions(): readonly Values[] {
    return this.parts.submissions;
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

  row(index: number): FormField<unknown> {
    const field = this.parts.rows.get(this.keyAt(index));

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
    await this.parts.work.get(this.keyAt(index));
    await nextTick();
  }

  async blur(index: number): Promise<void> {
    await this.input(index).trigger('blur');
    await this.parts.work.get(this.keyAt(index));
    await nextTick();
  }

  async push(value: unknown): Promise<void> {
    await this.list.push(value);
    await nextTick();
  }

  async prepend(value: unknown): Promise<void> {
    await this.list.prepend(value);
    await nextTick();
  }

  async insert(index: number, value: unknown): Promise<void> {
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

  async replace(values: readonly unknown[]): Promise<void> {
    await this.list.replace(values);
    await nextTick();
  }

  async update(index: number, value: unknown): Promise<void> {
    await this.list.update(index, value);
    await nextTick();
  }

  async deactivate(): Promise<void> {
    this.parts.active.value = false;
    await nextTick();
  }

  async submit(): Promise<SubmitResult> {
    const result = await this.form.submit();

    await nextTick();
    return result;
  }
}
