import { mount, type DOMWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import {
  NuiCommand,
  type NuiCommandItem,
  type NuiCommandProps,
  type NuiCommandSource,
  type NuiConfigOptions,
} from '../../src';
import { configPlugins } from '../support/config';
import { ComponentDriver } from './component';

export interface CommandMountOptions {
  readonly props?: Partial<NuiCommandProps<unknown>>;
  readonly config?: NuiConfigOptions;
}

const COMMANDS: NuiCommandSource<unknown> = [
  {
    label: 'Navigation',
    items: [
      { value: 'home', label: 'Home', icon: 'search', shortcut: 'mod+h' },
      { value: 'docs', label: 'Documentation', description: 'Guides and API' },
    ],
  },
  { value: 'theme', label: 'Toggle theme', keywords: ['dark', 'light'] },
  { value: 'locked', label: 'Locked action', disabled: true },
];

const isCommandItem = (value: unknown): value is NuiCommandItem<unknown> =>
  typeof value === 'object' && value !== null && 'label' in value && 'value' in value;

export class CommandDriver extends ComponentDriver {
  protected readonly block = 'nui-command';

  static mount({ props = {}, config }: CommandMountOptions = {}) {
    return new CommandDriver(
      mount(NuiCommand, {
        props: { items: COMMANDS, ...props },
        attachTo: document.body,
        global: { plugins: configPlugins(config) },
      }),
    );
  }

  get root(): DOMWrapper<HTMLElement> {
    return this.wrapper.find<HTMLElement>('.nui-command');
  }

  override hasModifier(modifier: string): boolean {
    return this.root.classes().includes(`nui-command--${modifier}`);
  }

  get input(): DOMWrapper<HTMLInputElement> {
    return this.wrapper.find<HTMLInputElement>('.nui-command__input');
  }

  get placeholder(): string | undefined {
    return this.input.attributes('placeholder');
  }

  get listLabel(): string | undefined {
    return this.wrapper.find('.nui-command__list').attributes('aria-label');
  }

  get options(): DOMWrapper<HTMLElement>[] {
    return this.wrapper.findAll<HTMLElement>('[role="option"]');
  }

  get labels(): string[] {
    return this.options.map((option) => option.find('.nui-row__title').text());
  }

  get activeLabel(): string | undefined {
    const activeId = this.input.attributes('aria-activedescendant');
    const active = this.options.find((option) => option.attributes('id') === activeId);

    return active?.find('.nui-row__title').text();
  }

  get selectedLabels(): string[] {
    return this.options.reduce<string[]>((found, option) => {
      if (option.attributes('aria-selected') === 'true') {
        found.push(option.find('.nui-row__title').text());
      }
      return found;
    }, []);
  }

  get groupLabels(): string[] {
    return this.wrapper.findAll('.nui-list__group-label').map((group) => group.text());
  }

  get emptyText(): string {
    return this.wrapper.find('.nui-list__empty').text();
  }

  get shortcutKeys(): string[] {
    return this.wrapper.findAll('.nui-kbd__key').map((key) => key.text());
  }

  get selections(): NuiCommandItem<unknown>[] {
    return (this.wrapper.findComponent(NuiCommand).emitted('select') ?? []).flatMap(([item]) =>
      isCommandItem(item) ? [item] : [],
    );
  }

  get searches(): string[] {
    return (this.wrapper.findComponent(NuiCommand).emitted('search') ?? []).flatMap(([query]) =>
      typeof query === 'string' ? [query] : [],
    );
  }

  get focused(): boolean {
    return document.activeElement === this.input.element;
  }

  async ready(): Promise<void> {
    await nextTick();
  }

  async type(text: string): Promise<void> {
    this.input.element.value = text;
    await this.input.trigger('input');
  }

  async press(key: string): Promise<void> {
    await this.input.trigger('keydown', { key });
  }

  async clickOption(label: string): Promise<void> {
    const option = this.options.find(
      (candidate) => candidate.find('.nui-row__title').text() === label,
    );

    if (!option) {
      throw new Error(`No option labelled ${label}`);
    }
    await option.trigger('click');
  }

  async hoverOption(label: string): Promise<void> {
    const option = this.options.find(
      (candidate) => candidate.find('.nui-row__title').text() === label,
    );

    if (!option) {
      throw new Error(`No option labelled ${label}`);
    }
    option.element.dispatchEvent(new PointerEvent('pointermove', { bubbles: true }));
    await nextTick();
  }
}
