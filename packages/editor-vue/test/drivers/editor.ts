import { mount, type VueWrapper } from '@vue/test-utils';
import { textSelection, type Command, type DocJSON } from '@numior/editor-core';
import { createSSRApp, h, nextTick } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { NuiEditor, type NuiEditorApi, type NuiEditorProps } from '../../src';
import { layOut } from '../support/layout';
import { isShown } from '../support/popovers';

const withoutComments = (html: string): string => html.replaceAll(/<!--[\s\S]*?-->/g, '');

const isDocument = (value: unknown): value is DocJSON =>
  typeof value === 'object' && value !== null && 'format' in value && 'root' in value;

const isApi = (value: unknown): value is NuiEditorApi =>
  typeof value === 'object' && value !== null && 'run' in value && 'state' in value;

const labelOf = (item: Element): string =>
  (item.textContent ?? '')
    .replace(item.querySelector('.nui-editor-colours__swatch')?.textContent ?? '', '')
    .trim();

export interface KeyOptions {
  readonly ctrl?: boolean;
  readonly shift?: boolean;
  readonly alt?: boolean;
}

const textWithoutWidgets = (block: Element): string => {
  const copy = block.cloneNode(true);

  if (!(copy instanceof Element)) {
    return '';
  }
  for (const widget of copy.querySelectorAll('.nui-editor__widget')) {
    widget.remove();
  }
  return copy.textContent ?? '';
};

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
        altKey: options.alt ?? false,
        bubbles: true,
        cancelable: true,
      }),
    );

    await nextTick();
  }

  get hasToolbar(): boolean {
    return this.root.querySelector('[role="toolbar"]') !== null;
  }

  private tool(label: string): HTMLButtonElement {
    const found = [...this.root.querySelectorAll('.nui-editor-toolbar__control')].find(
      (button) => button.getAttribute('aria-label') === label,
    );

    if (!(found instanceof HTMLButtonElement)) {
      throw new Error(`No toolbar button reads ${label}`);
    }
    return found;
  }

  get tools(): readonly string[] {
    return [...this.root.querySelectorAll('.nui-editor-toolbar__control')].map(
      (button) => button.getAttribute('aria-label') ?? '',
    );
  }

  pressed(label: string): boolean {
    return this.tool(label).getAttribute('aria-pressed') === 'true';
  }

  available(label: string): boolean {
    return !this.tool(label).disabled;
  }

  get blockType(): string {
    const label = this.root
      .querySelector('.nui-editor-toolbar__blocks')
      ?.getAttribute('aria-label');

    return label?.slice(label.indexOf(':') + 1).trim() ?? '';
  }

  get toolbarFocus(): string | null {
    const active = this.wrapper.element.ownerDocument.activeElement;

    return active instanceof HTMLElement && this.root.contains(active) && active !== this.content
      ? active.getAttribute('aria-label')
      : null;
  }

  async useTool(label: string): Promise<void> {
    const button = this.tool(label);
    const pressDown = new MouseEvent('mousedown', { bubbles: true, cancelable: true });

    button.dispatchEvent(pressDown);
    button.click();
    await nextTick();
  }

  async chooseBlock(label: string): Promise<void> {
    const trigger = this.root.querySelector('.nui-editor-toolbar__blocks');

    const option = [
      ...this.root.querySelectorAll('.nui-editor-blocks [role="menuitemradio"]'),
    ].find((item) => item.getAttribute('aria-label') === label);

    if (!(trigger instanceof HTMLElement) || !(option instanceof HTMLElement)) {
      throw new Error(`No block type option reads ${label}`);
    }
    trigger.click();
    option.click();
    await nextTick();
  }

  async toolbarKey(key: string): Promise<void> {
    const active = this.wrapper.element.ownerDocument.activeElement;

    active?.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    await nextTick();
  }

  private find(selector: string): HTMLElement {
    const element = this.root.querySelector(selector);

    if (!(element instanceof HTMLElement)) {
      throw new Error(`Nothing matches ${selector}`);
    }
    return element;
  }

  get linkShown(): boolean {
    return isShown(this.root.querySelector('.nui-editor-link'));
  }

  async hoverBlock(index: number): Promise<void> {
    const block = this.content.querySelectorAll('.nui-editor__chunk > *')[index];

    block?.dispatchEvent(new PointerEvent('pointermove', { bubbles: true }));
    await nextTick();
  }

  async dragHandle(from: number, clientY: number): Promise<void> {
    await this.hoverBlock(from);

    const grip = this.root.querySelector('.nui-editor-handle__grip');
    const pointer = { bubbles: true, pointerId: 1, button: 0, clientX: 0 };

    grip?.dispatchEvent(new PointerEvent('pointerdown', { ...pointer, clientY: 0 }));
    for (const step of [clientY / 2, clientY]) {
      globalThis.dispatchEvent(new PointerEvent('pointermove', { ...pointer, clientY: step }));
    }
    await nextTick();
    this.dropShown = this.root.querySelector('.nui-editor__drop--shown') !== null;

    this.ghostCopy = [
      ...(this.root.querySelector('.nui-editor__ghost--shown')?.children ?? []),
    ].map((block) => `${block.tagName.toLowerCase()}:${block.textContent ?? ''}`);

    globalThis.dispatchEvent(new PointerEvent('pointerup', { ...pointer, clientY }));
    await nextTick();
  }

  dropShown = false;

  async dragBlockTo(text: string, x: number, y: number): Promise<void> {
    const block = [...this.content.querySelectorAll('p')].find(
      (candidate) => candidate.textContent === text,
    );

    layOut(this.content);
    block?.dispatchEvent(new PointerEvent('pointermove', { bubbles: true }));
    await nextTick();

    const grip = this.root.querySelector('.nui-editor-handle__grip');
    const pointer = { bubbles: true, pointerId: 1, button: 0 };

    grip?.dispatchEvent(new PointerEvent('pointerdown', { ...pointer, clientX: x, clientY: 0 }));

    globalThis.dispatchEvent(
      new PointerEvent('pointermove', { ...pointer, clientX: x, clientY: y }),
    );

    globalThis.dispatchEvent(new PointerEvent('pointerup', { ...pointer, clientX: x, clientY: y }));
    await nextTick();
  }

  ghostCopy: readonly string[] = [];

  async showBlocks(): Promise<void> {
    await nextTick();
  }

  get widgetTexts(): readonly string[] {
    return [...this.content.querySelectorAll('.nui-editor__widget')].map(
      (widget) => widget.textContent ?? '',
    );
  }

  async clickWidget(index: number): Promise<void> {
    const button = this.content.querySelectorAll('.nui-editor__widget button')[index];

    if (!(button instanceof HTMLElement)) {
      throw new Error(`No widget button at ${String(index)}`);
    }
    button.click();
    await nextTick();
  }

  async hoverWidget(nth = 0): Promise<void> {
    const widget = this.content.querySelectorAll('.nui-editor__widget')[nth];

    widget?.dispatchEvent(new PointerEvent('pointermove', { bubbles: true }));
    await nextTick();
  }

  async clickControl(selector: string, nth = 0): Promise<void> {
    const control = this.content.querySelectorAll(selector)[nth];

    if (!(control instanceof HTMLElement)) {
      throw new Error(`Nothing matches ${selector} at ${String(nth)}`);
    }
    control.click();
    await nextTick();
  }

  async chooseInWidget(label: string): Promise<void> {
    const option = [
      ...this.content.querySelectorAll('.nui-editor__widget [role^="menuitem"]'),
    ].find((candidate) => candidate.textContent?.trim() === label);

    if (!(option instanceof HTMLElement)) {
      throw new Error(`No widget menu item reads ${label}`);
    }
    option.click();
    await nextTick();
  }

  classesOf(selector: string, nth = 0): readonly string[] {
    return [...(this.content.querySelectorAll(selector)[nth]?.classList ?? [])];
  }

  attributeOf(selector: string, name: string, nth = 0): string | null {
    return this.content.querySelectorAll(selector)[nth]?.getAttribute(name) ?? null;
  }

  async dragSeparator(toX: number): Promise<void> {
    layOut(this.content);

    const separator = this.content.querySelector('[role="separator"]');
    const pointer = { bubbles: true, pointerId: 1, button: 0, clientY: 10 };

    separator?.dispatchEvent(new PointerEvent('pointerdown', { ...pointer, clientX: 200 }));
    separator?.dispatchEvent(new PointerEvent('pointermove', { ...pointer, clientX: toX }));
    separator?.dispatchEvent(new PointerEvent('pointerup', { ...pointer, clientX: toX }));
    await nextTick();
  }

  async pressOn(selector: string, key: string, nth = 0): Promise<void> {
    const target = this.content.querySelectorAll(selector)[nth];

    target?.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    await nextTick();
  }

  labelOf(selector: string, nth = 0): string | null {
    return this.content.querySelectorAll(selector)[nth]?.getAttribute('aria-label') ?? null;
  }

  blockElement(index: number): Element | undefined {
    return this.content.querySelectorAll('.nui-editor__chunk > *')[index];
  }

  async hoverToolbar(): Promise<void> {
    this.find('.nui-editor__toolbar button').dispatchEvent(
      new PointerEvent('pointermove', { bubbles: true }),
    );

    await nextTick();
  }

  async leave(): Promise<void> {
    this.root.dispatchEvent(new PointerEvent('pointerleave'));
    await nextTick();
  }

  async hoverList(): Promise<void> {
    this.content
      .querySelector('ul')
      ?.dispatchEvent(new PointerEvent('pointermove', { bubbles: true }));

    await nextTick();
  }

  async hoverItem(text: string): Promise<void> {
    const item = [...this.content.querySelectorAll('li')].find(
      (candidate) => candidate.textContent === text,
    );

    item?.dispatchEvent(new PointerEvent('pointermove', { bubbles: true }));
    await nextTick();
  }

  get itemTexts(): readonly string[] {
    return [...this.content.querySelectorAll('li')].map((item) => item.textContent ?? '');
  }

  async hoverGap(): Promise<void> {
    this.content
      .querySelector('.nui-editor__chunk')
      ?.dispatchEvent(new PointerEvent('pointermove', { bubbles: true }));

    await nextTick();
  }

  get pushedTexts(): readonly string[] {
    return [...this.content.querySelectorAll('.nui-editor__pushed')].map(
      (block) => `${block.tagName.toLowerCase()}:${block.textContent ?? ''}`,
    );
  }

  get handleShown(): boolean {
    return this.root.querySelector('.nui-editor-handle--shown') !== null;
  }

  async blockAction(...path: readonly string[]): Promise<void> {
    for (const label of path) {
      const item = [...this.root.querySelectorAll('.nui-editor-handle [role^="menuitem"]')].find(
        (candidate) => candidate.textContent?.trim() === label,
      );

      if (!(item instanceof HTMLElement)) {
        throw new Error(`No block action reads ${label}`);
      }
      item.click();
      await nextTick();
    }
  }

  get blockTexts(): readonly string[] {
    return [...this.content.querySelectorAll('.nui-editor__chunk > *')].map(
      (block) => `${block.tagName.toLowerCase()}:${textWithoutWidgets(block)}`,
    );
  }

  get slashShown(): boolean {
    return isShown(this.root.querySelector('.nui-editor-slash'));
  }

  get slashOptions(): readonly string[] {
    return [...this.root.querySelectorAll('.nui-editor-slash [role="option"]')].map(
      (option) => option.textContent?.trim() ?? '',
    );
  }

  async clickSlash(label: string): Promise<void> {
    const option = [...this.root.querySelectorAll('.nui-editor-slash [role="option"]')].find(
      (item) => item.textContent?.trim() === label,
    );

    if (!(option instanceof HTMLElement)) {
      throw new Error(`No slash option reads ${label}`);
    }
    option.click();
    await nextTick();
  }

  get bubbleShown(): boolean {
    return isShown(this.root.querySelector('.nui-editor-bubble'));
  }

  get bubbleTools(): readonly string[] {
    return [...this.root.querySelectorAll('.nui-editor-bubble .nui-editor-toolbar__control')].map(
      (button) => button.getAttribute('aria-label') ?? '',
    );
  }

  private get linkInput(): HTMLInputElement {
    const input = this.find('.nui-editor-link').querySelector('input');

    if (!(input instanceof HTMLInputElement)) {
      throw new Error('The link panel has no field');
    }
    return input;
  }

  get linkDraft(): string {
    return this.linkInput.value;
  }

  get linkError(): string {
    return (
      this.find('.nui-editor-link').querySelector('.nui-field__error')?.textContent?.trim() ?? ''
    );
  }

  get linkFocused(): boolean {
    return this.wrapper.element.ownerDocument.activeElement === this.linkInput;
  }

  async submitLink(href: string): Promise<void> {
    this.linkInput.value = href;
    this.linkInput.dispatchEvent(new Event('input', { bubbles: true }));
    await nextTick();

    this.find('.nui-editor-link__form').dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );

    await nextTick();
  }

  async removeLink(): Promise<void> {
    const remove = [...this.find('.nui-editor-link').querySelectorAll('button')].find(
      (button) => button.getAttribute('type') !== 'submit',
    );

    remove?.click();
    await nextTick();
  }

  get colourOptions(): readonly string[] {
    return [...this.find('.nui-editor-colours').querySelectorAll('[role="menuitemradio"]')].map(
      labelOf,
    );
  }

  async chooseColour(group: number, label: string): Promise<void> {
    const radios = this.find('.nui-editor-colours').querySelectorAll('[role="group"]')[group];

    const option = [...(radios?.querySelectorAll('[role="menuitemradio"]') ?? [])].find(
      (item) => labelOf(item) === label,
    );

    if (!(option instanceof HTMLElement)) {
      throw new Error(`No colour reads ${label}`);
    }
    option.click();
    await nextTick();
  }

  async pasteHTML(html: string, text = ''): Promise<void> {
    const data: Readonly<Record<string, string>> = { 'text/html': html, 'text/plain': text };
    const event = new Event('paste', { bubbles: true, cancelable: true });

    Object.defineProperty(event, 'clipboardData', {
      value: { getData: (format: string) => data[format] ?? '' },
    });

    this.content.dispatchEvent(event);
    await nextTick();
  }

  async select(anchor: number, head = anchor): Promise<void> {
    this.api.run((state, dispatch) => {
      dispatch?.(state.tr.setSelection(textSelection(anchor, head)));
      return true;
    });

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
