import { mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, nextTick, shallowRef, type VNode } from 'vue';
import { NuiSmartForm, useForm, type FormContext, type NuiSmartFormEntry } from '../../src';

type SlotRender = (props: Record<string, unknown>) => VNode | VNode[];

export interface SmartFormDriverOptions<V extends object> {
  readonly initialValues: V;
  readonly fields: readonly NuiSmartFormEntry<V>[];
  readonly layout?: string;
  readonly inline?: boolean | 'grow';
  readonly slots?: Readonly<Record<string, SlotRender>>;
}

export class SmartFormDriver<V extends object> {
  static mount<V extends object>(options: SmartFormDriverOptions<V>): SmartFormDriver<V> {
    const submissions: V[] = [];
    const captured = shallowRef<FormContext<V> | null>(null);

    const Host = defineComponent({
      setup: () => {
        const form = useForm<V, unknown>({
          initialValues: options.initialValues,
          onSubmit: (values) => {
            submissions.push(values);
          },
        });

        captured.value = form;
        return () =>
          h(
            NuiSmartForm<V>,
            { form, fields: options.fields, layout: options.layout, inline: options.inline },
            options.slots ?? {},
          );
      },
    });

    const wrapper = mount(Host, { attachTo: document.body });

    if (!captured.value) {
      throw new Error('useForm did not run');
    }
    return new SmartFormDriver(wrapper, captured.value, submissions);
  }

  private constructor(
    private readonly wrapper: VueWrapper,
    readonly form: FormContext<V>,
    readonly submissions: readonly V[],
  ) {}

  private get grid(): DOMWrapper<HTMLElement> {
    return this.wrapper.find<HTMLElement>('.nui-smart-form > .nui-smart-form__grid');
  }

  private control(path: string): DOMWrapper<HTMLInputElement> {
    return this.wrapper.find<HTMLInputElement>(`[name="${path}"]`);
  }

  private cellOf(path: string): Element {
    const cell = this.control(path).element.closest('.nui-smart-form__cell');

    if (!cell) {
      throw new Error(`no cell for ${path}`);
    }
    return cell;
  }

  get fields(): string[] {
    return this.wrapper
      .findAll<HTMLInputElement>('.nui-smart-form__cell input')
      .map((input) => input.element.name);
  }

  get topCells(): string[] {
    return this.grid.findAll(':scope > .nui-smart-form__cell').map((cell) => {
      const legend = cell.find('legend');
      return legend.exists()
        ? `section:${legend.text()}`
        : (cell.find('input').attributes('name') ?? '');
    });
  }

  get areas(): string | undefined {
    return this.grid.element.style.getPropertyValue('--_areas') || undefined;
  }

  get columns(): string | undefined {
    return this.grid.element.style.getPropertyValue('--_layout-columns') || undefined;
  }

  get legends(): string[] {
    return this.wrapper.findAll('.nui-smart-form__legend').map((legend) => legend.text());
  }

  get sectionDescriptions(): string[] {
    return this.wrapper.findAll('.nui-smart-form__section-description').map((text) => text.text());
  }

  hasModifier(modifier: string): boolean {
    return this.wrapper.find('form').classes().includes(`nui-smart-form--${modifier}`);
  }

  has(selector: string): boolean {
    return this.wrapper.find(selector).exists();
  }

  area(path: string): string {
    const cell = this.cellOf(path);
    return cell instanceof HTMLElement ? cell.style.getPropertyValue('--_area') : '';
  }

  attribute(path: string, name: string): string | undefined {
    return this.control(path).attributes(name);
  }

  cellText(path: string): string {
    return this.cellOf(path).textContent ?? '';
  }

  text(selector: string): string {
    return this.wrapper.find(selector).text();
  }

  async type(path: string, text: string): Promise<void> {
    const input = this.control(path).element;

    input.value = text;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await this.settle();
  }

  async click(selector: string): Promise<void> {
    this.wrapper.find<HTMLElement>(selector).element.click();
    await this.settle();
  }

  async submit(): Promise<void> {
    await this.click('button[type="submit"]');
  }

  async settle(): Promise<void> {
    await this.form.settled();
    await nextTick();
  }
}
