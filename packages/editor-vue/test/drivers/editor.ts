import { mount, type VueWrapper } from '@vue/test-utils';
import type { Command, DocJSON } from '@numior/editor-core';
import { createSSRApp, h, nextTick } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { NuiEditor, type NuiEditorApi, type NuiEditorProps } from '../../src';

const withoutComments = (html: string): string => html.replaceAll(/<!--[\s\S]*?-->/g, '');

const isDocument = (value: unknown): value is DocJSON =>
  typeof value === 'object' && value !== null && 'format' in value && 'root' in value;

const isApi = (value: unknown): value is NuiEditorApi =>
  typeof value === 'object' && value !== null && 'run' in value && 'state' in value;

export interface KeyOptions {
  readonly ctrl?: boolean;
  readonly shift?: boolean;
}

export class EditorDriver {
  private constructor(private readonly wrapper: VueWrapper) {}

  static mount(
    props: NuiEditorProps & { readonly document?: DocJSON | undefined } = {},
  ): EditorDriver {
    const wrapper: VueWrapper = mount(NuiEditor, {
      props: {
        ...props,
        'onUpdate:document': (document: DocJSON | undefined) => wrapper.setProps({ document }),
      },
      attachTo: document.body,
    });

    return new EditorDriver(wrapper);
  }

  static async ssr(
    props: NuiEditorProps & { readonly document?: DocJSON | undefined },
  ): Promise<string> {
    return withoutComments(
      await renderToString(createSSRApp({ render: () => h(NuiEditor, props) })),
    );
  }

  static async hydrate(
    props: NuiEditorProps & { readonly document?: DocJSON | undefined },
  ): Promise<readonly string[]> {
    const host = document.createElement('div');
    const warnings: string[] = [];

    host.innerHTML = await renderToString(createSSRApp({ render: () => h(NuiEditor, props) }));
    document.body.append(host);

    const app = createSSRApp({ render: () => h(NuiEditor, props) });

    app.config.warnHandler = (message) => {
      warnings.push(message);
    };

    app.mount(host);
    await nextTick();

    warnings.push(
      ...(host.querySelector('.nui-editor__static') === null ? [] : ['static content stayed']),
    );

    app.unmount();
    host.remove();
    return warnings;
  }

  private get content(): HTMLElement {
    const element = this.wrapper.element.ownerDocument.querySelector(
      '.nui-editor__content:not(.nui-editor__static)',
    );

    if (!(element instanceof HTMLElement)) {
      throw new Error('The editor has no content root');
    }
    return element;
  }

  private get api(): NuiEditorApi {
    const exposed: unknown = Reflect.get(this.wrapper.vm, 'editor');

    if (!isApi(exposed)) {
      throw new Error('The editor exposes no API');
    }
    return exposed;
  }

  get root(): HTMLElement {
    const element = this.wrapper.element.ownerDocument.querySelector('.nui-editor');

    if (!(element instanceof HTMLElement)) {
      throw new Error('No editor frame');
    }
    return element;
  }

  get markup(): string {
    return this.content.innerHTML;
  }

  get text(): string {
    return this.content.textContent ?? '';
  }

  attribute(name: string): string | null {
    return this.content.getAttribute(name);
  }

  get classes(): readonly string[] {
    return [...this.root.classList];
  }

  get documents(): readonly DocJSON[] {
    return (this.wrapper.emitted('update:document') ?? []).flatMap(([value]: unknown[]) =>
      isDocument(value) ? [value] : [],
    );
  }

  get changes(): number {
    return this.wrapper.emitted('change')?.length ?? 0;
  }

  emitted(name: string): number {
    return this.wrapper.emitted(name)?.length ?? 0;
  }

  textOf(id: string): string {
    return this.wrapper.element.ownerDocument.getElementById(id)?.textContent ?? '';
  }

  get focused(): boolean {
    return this.wrapper.element.ownerDocument.activeElement === this.content;
  }

  focus(): void {
    this.api.focus();
  }

  run(command: Command): boolean {
    return this.api.run(command);
  }

  async type(text: string): Promise<void> {
    for (const data of text) {
      this.content.dispatchEvent(
        new InputEvent('beforeinput', {
          inputType: 'insertText',
          data,
          bubbles: true,
          cancelable: true,
        }),
      );
    }
    await nextTick();
  }

  async press(key: string, options: KeyOptions = {}): Promise<void> {
    this.content.dispatchEvent(
      new KeyboardEvent('keydown', {
        key,
        code: key.length === 1 ? `Key${key.toUpperCase()}` : key,
        ctrlKey: options.ctrl ?? false,
        shiftKey: options.shift ?? false,
        bubbles: true,
        cancelable: true,
      }),
    );

    await nextTick();
  }

  async blur(): Promise<void> {
    this.content.blur();
    await nextTick();
  }

  async receive(
    props: Partial<NuiEditorProps> & { readonly document?: DocJSON | undefined },
  ): Promise<void> {
    await this.wrapper.setProps(props);
  }

  destroy(): void {
    this.wrapper.unmount();
  }
}
