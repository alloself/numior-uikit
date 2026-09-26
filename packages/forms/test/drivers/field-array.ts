import { createNuiConfig, type NuiConfigOptions } from '@numior/primitives';
import { NuiInput } from '@numior/vue';
import { mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, nextTick, shallowRef } from 'vue';
import {
  NuiFieldArray,
  NuiForm,
  NuiFormField,
  useForm,
  type AnyFieldRule,
  type FieldArrayRow,
  type FormContext,
  type StandardSchema,
} from '../../src';

interface Contact {
  name: string;
}

interface Contacts {
  contacts: Contact[];
}

export interface FieldArrayDriverOptions {
  readonly names: readonly string[];
  readonly min?: number;
  readonly max?: number;
  readonly reorderable?: boolean;
  readonly addable?: boolean;
  readonly rowRules?: readonly AnyFieldRule[];
  readonly listRules?: readonly AnyFieldRule<readonly Contact[]>[];
  readonly schema?: StandardSchema<unknown, unknown>;
  readonly config?: NuiConfigOptions;
}

interface FieldScope {
  readonly field: {
    readonly name: string;
    readonly modelValue: never;
    readonly 'onUpdate:modelValue': (value: unknown) => void;
  };
}

const ROW_HEIGHT = 60;

const ROWS = '.nui-field-array__row:not(.nui-field-array__row--leaving)';

const newContact = (): Contact => ({ name: '' });

const rectOf = (top: number, height: number): DOMRect => ({
  x: 0,
  y: top,
  top,
  left: 0,
  width: 400,
  height,
  right: 400,
  bottom: top + height,
  toJSON: () => ({}),
});

const defineRect = (element: Element, top: number, height: number): void => {
  const rect = rectOf(top, height);

  Object.defineProperty(element, 'getBoundingClientRect', {
    value: () => rect,
    configurable: true,
  });
};

const pointerAt = (type: string, clientY: number): PointerEvent =>
  new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 3, button: 0, clientY });

export class FieldArrayDriver {
  static mount(options: FieldArrayDriverOptions): FieldArrayDriver {
    const captured = shallowRef<FormContext<Contacts> | null>(null);

    const renderRow = ({ row }: { readonly row: FieldArrayRow<Contact> }) =>
      h(
        NuiFormField,
        { name: `${row.path}.name`, label: 'Name', rules: options.rowRules },
        { default: (scope: FieldScope) => h(NuiInput, scope.field) },
      );

    const Host = defineComponent({
      setup: () => {
        const form = useForm<Contacts, unknown>({
          initialValues: { contacts: options.names.map((name) => ({ name })) },
          schema: options.schema,
          onSubmit: () => undefined,
        });

        captured.value = form;
        return () =>
          h(NuiForm, { form }, () =>
            h(
              NuiFieldArray<Contact>,
              {
                name: 'contacts',
                label: 'Contacts',
                min: options.min,
                max: options.max,
                reorderable: options.reorderable,
                newRow: options.addable === false ? undefined : newContact,
                rules: options.listRules,
              },
              { default: renderRow },
            ),
          );
      },
    });

    const wrapper = mount(Host, {
      attachTo: document.body,
      global: { plugins: options.config === undefined ? [] : [createNuiConfig(options.config)] },
    });

    if (!captured.value) {
      throw new Error('useForm did not run');
    }
    return new FieldArrayDriver(wrapper, captured.value);
  }

  private constructor(
    private readonly wrapper: VueWrapper,
    private readonly form: FormContext<Contacts>,
  ) {}

  private get rows(): DOMWrapper<HTMLElement>[] {
    return this.wrapper.findAll<HTMLElement>(ROWS);
  }

  private row(index: number): DOMWrapper<HTMLElement> {
    const row = this.rows[index];

    if (!row) {
      throw new Error(`no row ${index}`);
    }
    return row;
  }

  private grip(index: number): DOMWrapper<HTMLButtonElement> {
    return this.row(index).find<HTMLButtonElement>('.nui-field-array__grip');
  }

  private get addButton(): DOMWrapper<HTMLButtonElement> {
    return this.wrapper.find<HTMLButtonElement>('.nui-field-array__add');
  }

  get names(): string[] {
    return this.rows.map((row) => row.find<HTMLInputElement>('input').element.value);
  }

  get values(): Contacts['contacts'] {
    return [...this.form.values.contacts];
  }

  get removeLabels(): string[] {
    return this.wrapper
      .findAll('.nui-field-array__remove')
      .map((button) => button.attributes('aria-label') ?? '');
  }

  get gripLabels(): string[] {
    return this.wrapper
      .findAll('.nui-field-array__grip')
      .map((button) => button.attributes('aria-label') ?? '');
  }

  get addText(): string {
    return this.addButton.text();
  }

  get canAdd(): boolean {
    return this.addButton.exists() && !this.addButton.element.disabled;
  }

  get limit(): string | undefined {
    const limit = this.wrapper.find('.nui-field-array__limit');
    return limit.exists() ? limit.text() : undefined;
  }

  get empty(): string | undefined {
    const empty = this.wrapper.find('.nui-field-array__empty');
    return empty.exists() ? empty.text() : undefined;
  }

  get live(): string {
    return this.wrapper.find('.nui-field-array__live').text();
  }

  get listError(): string | undefined {
    const error = this.wrapper.find('.nui-field-array__error');
    return error.exists() ? error.text() : undefined;
  }

  get ghost(): string | undefined {
    const ghost = this.wrapper.find('.nui-field-array__ghost');
    return ghost.exists() ? ghost.text() : undefined;
  }

  get reordering(): boolean {
    return this.wrapper.find('.nui-field-array').classes().includes('nui-field-array--reordering');
  }

  get focused(): string | undefined {
    const active = document.activeElement;

    if (!(active instanceof HTMLElement)) {
      return undefined;
    }
    if (active.classList.contains('nui-field-array__add')) {
      return 'add';
    }

    const index = this.rows.findIndex((row) => row.element.contains(active));
    const part = active.classList.contains('nui-field-array__grip') ? 'grip' : 'name';

    return index === -1 ? undefined : `${part}:${index}`;
  }

  dragging(index: number): boolean {
    return this.row(index).classes().includes('nui-field-array__row--dragging');
  }

  rowError(index: number): string | undefined {
    const error = this.row(index).find('.nui-field-array__row-error');
    return error.exists() ? error.text() : undefined;
  }

  fieldError(index: number): string | undefined {
    const error = this.row(index).find('.nui-field__error');
    return error.exists() ? error.text() : undefined;
  }

  async type(index: number, text: string): Promise<void> {
    const input = this.row(index).find<HTMLInputElement>('input').element;

    input.value = text;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await this.settle();
  }

  async add(): Promise<void> {
    this.addButton.element.click();
    await this.settle();
  }

  async remove(index: number): Promise<void> {
    this.row(index).find<HTMLButtonElement>('.nui-field-array__remove').element.click();
    await this.settle();
  }

  async press(index: number, key: string): Promise<void> {
    const grip = this.grip(index).element;

    grip.focus();
    grip.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    await this.settle();
  }

  async drag(from: number, to: number): Promise<void> {
    const list = this.wrapper.find('.nui-field-array__list').element;

    defineRect(list, 0, ROW_HEIGHT * this.rows.length);
    this.rows.forEach((row, index) => defineRect(row.element, index * ROW_HEIGHT, ROW_HEIGHT - 8));
    this.grip(from).element.dispatchEvent(pointerAt('pointerdown', from * ROW_HEIGHT + 10));
    window.dispatchEvent(pointerAt('pointermove', from * ROW_HEIGHT + 20));
    window.dispatchEvent(pointerAt('pointermove', to * ROW_HEIGHT + ROW_HEIGHT - 4));
    await nextTick();
  }

  async drop(): Promise<void> {
    window.dispatchEvent(pointerAt('pointerup', 0));
    await this.settle();
  }

  async submit(): Promise<void> {
    this.wrapper.find<HTMLButtonElement>('button[type="submit"]').element.click();
    await this.settle();
  }

  async settle(): Promise<void> {
    await this.form.settled();
    await nextTick();
  }
}
