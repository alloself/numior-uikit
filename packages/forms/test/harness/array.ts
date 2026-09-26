import { mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, nextTick, onBeforeUnmount, shallowRef, toRef } from 'vue';
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

export interface Contact {
  name: string;
}

export interface Team {
  title: string;
  contacts: Contact[];
}

export interface ArrayHarnessOptions {
  readonly initialValues: Team;
  readonly listRules?: readonly AnyFieldRule<readonly Contact[], Team>[];
  readonly rowRules?: readonly AnyFieldRule<string | undefined, Team>[];
}

interface Parts {
  readonly rows: Map<string, FormField<string | undefined>>;
  readonly work: Map<string, Promise<void>>;
  readonly active: { value: boolean };
  readonly submissions: Team[];
  readonly form: () => FormContext<Team>;
}

const text = (value: unknown): string => (typeof value === 'string' ? value : '');

const rowComponent = (options: ArrayHarnessOptions, parts: Parts) =>
  defineComponent(
    (props: { readonly row: FieldArrayRow<Contact> }) => {
      const field = useField(
        toRef(() => (values: Team) => values.contacts[props.row.index]?.name),
        { form: parts.form(), rules: options.rowRules ?? [] },
      );

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
    const form = shallowRef<FormContext<Team> | null>(null);
    const list = shallowRef<FieldArray<Contact> | null>(null);

    const current = (): FormContext<Team> => {
      if (!form.value) {
        throw new Error('useForm did not run');
      }
      return form.value;
    };

    const parts: Parts = {
      rows: new Map(),
      work: new Map(),
      active,
      submissions: [],
      form: current,
    };

    const Row = rowComponent(options, parts);

    const List = defineComponent(() => {
      const array = useFieldArray((values: Team) => values.contacts, {
        form: current(),
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
      form.value = useForm<Team>({
        initialValues: options.initialValues,
        onSubmit: (values) => {
          parts.submissions.push(values);
        },
      });

      return () => h(List);
    });

    const wrapper = mount(Host, { attachTo: document.body });

    if (!list.value) {
      throw new Error('useFieldArray did not run');
    }
    return new ArrayHarness(wrapper, current(), list.value, parts);
  }

  private constructor(
    private readonly wrapper: VueWrapper,
    readonly form: FormContext<Team>,
    readonly list: FieldArray<Contact>,
    private readonly parts: Parts,
  ) {}

  get keys(): readonly string[] {
    return this.list.fields.value.map((row) => row.key);
  }

  get values(): FormContext<Team>['values'] {
    return this.form.values;
  }

  get submissions(): readonly Team[] {
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

  row(index: number): FormField<string | undefined> {
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
    this.parts.active.value = false;
    await nextTick();
  }

  async submit(): Promise<SubmitResult> {
    const result = await this.form.submit();

    await nextTick();
    return result;
  }
}
