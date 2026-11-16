import { vi } from 'vite-plus/test';
import {
  createDoc,
  createState,
  inlineText,
  selectionRange,
  textSelection,
  type Command,
  type EditorState,
  type ElementNode,
  type NodeId,
  type Plugin,
  type Schema,
  type Selection,
  type Transaction,
} from '../../src';
import { fixtureSchema } from '../../src/fixtures';
import { createEditorView, type EditorView, type NodeViewFactory } from '../../src/view';

export interface ChunkStyle {
  readonly visibility: string;
  readonly intrinsicSize: string;
}

export interface DomSpan {
  readonly anchor: number;
  readonly head: number;
}

export interface KeyOptions {
  readonly shift?: boolean;
  readonly ctrl?: boolean;
  readonly alt?: boolean;
  readonly meta?: boolean;
}

export interface MouseOptions {
  readonly button?: number;
  readonly shift?: boolean;
}

export type CaretApi = 'position' | 'range' | 'none';

export interface DragOptions {
  readonly copy?: boolean;
  readonly from?: Element | undefined;
}

export interface Dragged {
  readonly started: boolean;
  readonly offered: boolean;
  readonly effect: string;
}

export interface LayoutOptions {
  readonly collapsedHeight: number;
}

type SightCallback = (entries: readonly { target: Element; isIntersecting: boolean }[]) => void;

const GRAPHEMES = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

const CHUNK = '.nui-editor__chunk';

const SLOTS = 'nui-editor__slots';

const CHAR = 10;
const LINE = 20;

const textRects = (range: Range, options: LayoutOptions): DOMRect[] => {
  const height = range.collapsed ? options.collapsedHeight : LINE;
  const width = (range.endOffset - range.startOffset) * CHAR;

  return range.startContainer instanceof Text
    ? [new DOMRect(range.startOffset * CHAR, 0, width, height)]
    : [];
};

const replaceMember = (target: object, name: string, value: unknown): (() => void) => {
  const original = Object.getOwnPropertyDescriptor(target, name);

  Object.defineProperty(target, name, { configurable: true, writable: true, value });
  return () => {
    if (original === undefined) {
      Reflect.deleteProperty(target, name);
    } else {
      Object.defineProperty(target, name, original);
    }
  };
};

const settle = (): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, 0);
  });

const beforeinput = (inputType: string, data: string | null = null): InputEvent =>
  new InputEvent('beforeinput', { inputType, data, bubbles: true, cancelable: true });

const writeAtCaret = (text: string): void => {
  const selection = document.getSelection();
  const anchor = selection?.anchorNode;
  const offset = selection?.anchorOffset ?? 0;

  if (!(anchor instanceof Text)) {
    return;
  }

  anchor.insertData(offset, text);
  selection?.collapse(anchor, offset + text.length);
};

const textNodesOf = (root: Node): Text[] => {
  const found: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);

  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    if (!(node instanceof Text)) {
      continue;
    }

    found.push(node);
  }
  return found;
};

const withoutStyles = (root: HTMLElement): string => {
  const copy = root.cloneNode(true);

  if (!(copy instanceof HTMLElement)) {
    return '';
  }
  for (const element of copy.querySelectorAll('[style]')) {
    element.removeAttribute('style');
  }
  for (const chunk of copy.querySelectorAll(CHUNK)) {
    chunk.replaceWith(...chunk.childNodes);
  }
  for (const holder of copy.querySelectorAll(`.${SLOTS}`)) {
    holder.classList.remove(SLOTS);

    if (holder.classList.length > 0) {
      continue;
    }

    holder.removeAttribute('class');
  }
  return copy.innerHTML;
};

const sights: SightCallback[] = [];

class FakeIntersectionObserver {
  constructor(callback: SightCallback) {
    sights.push(callback);
  }

  observe(): void {
    return undefined;
  }

  unobserve(): void {
    return undefined;
  }

  disconnect(): void {
    return undefined;
  }
}

export class EditorViewDriver {
  private blocksBefore: readonly Element[] = [];
  private textsBefore: readonly Text[] = [];
  private mutations: MutationObserver | undefined;
  private readonly restores: (() => void)[] = [];

  private constructor(
    readonly view: EditorView,
    readonly host: HTMLElement,
  ) {}

  static mount(
    root: ElementNode,
    schema: Schema = fixtureSchema,
    plugins: readonly Plugin[] = [],
    nodeViews: Readonly<Record<string, NodeViewFactory>> = {},
    widget?: (key: string) => HTMLElement | undefined,
    sight = false,
  ): EditorViewDriver {
    sights.length = 0;

    const restore = sight
      ? replaceMember(globalThis, 'IntersectionObserver', FakeIntersectionObserver)
      : undefined;

    const host = document.createElement('div');

    host.tabIndex = 0;
    document.body.append(host);

    const state = createState({ doc: createDoc(schema, root), plugins });

    const driver = new EditorViewDriver(createEditorView(host, { state, nodeViews, widget }), host);

    if (restore !== undefined) {
      driver.restores.push(restore);
    }
    return driver;
  }

  widgetOf(id: NodeId): HTMLElement {
    const widget = this.view.nodeDOM(id)?.querySelector('.box__widget');

    if (!(widget instanceof HTMLElement)) {
      throw new Error(`Node ${id} has no widget`);
    }
    return widget;
  }

  async writeInWidget(id: NodeId, text: string): Promise<void> {
    this.widgetOf(id).append(text);
    await settle();
  }

  pressInWidget(id: NodeId, selector: string): boolean {
    const target = this.widgetOf(id).querySelector(selector);

    return !(
      target?.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0 }),
      ) ?? true
    );
  }

  pressBlock(index: number, options: MouseOptions = {}): void {
    this.blocks[index]?.dispatchEvent(
      new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
        button: options.button ?? 0,
        shiftKey: options.shift ?? false,
      }),
    );
  }

  clickBelow(): boolean {
    return !this.host.dispatchEvent(
      new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0, clientY: 900 }),
    );
  }

  releaseMouse(): void {
    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, button: 0 }));
  }

  typeInWidget(id: NodeId, text: string): boolean {
    return !this.widgetOf(id).dispatchEvent(beforeinput('insertText', text));
  }

  private get state(): EditorState {
    return this.view.state;
  }

  get selection(): Selection {
    return this.state.selection;
  }

  get modelTexts(): readonly string[] {
    return this.state.doc.root.content.map((block) =>
      block.kind === 'element' ? inlineText(block) : block.text,
    );
  }

  get domSpan(): DomSpan | undefined {
    const selection = document.getSelection();

    const anchor = selection?.anchorNode ?? null;
    const focus = selection?.focusNode ?? null;

    if (selection === null || anchor === null || focus === null) {
      return undefined;
    }
    return {
      anchor: this.view.posAtDOM(anchor, selection.anchorOffset),
      head: this.view.posAtDOM(focus, selection.focusOffset),
    };
  }

  selectionInside(id: NodeId): boolean {
    const selection = document.getSelection();
    const dom = this.view.nodeDOM(id);

    return dom !== undefined && selection?.anchorNode === dom && selection.focusNode === dom;
  }

  get selectedNodes(): number {
    return this.host.querySelectorAll('.nui-editor__selected').length;
  }

  focus(): void {
    this.view.focus();
  }

  leavePageUnfocused(): () => number {
    const hasFocus = vi.spyOn(document, 'hasFocus').mockReturnValue(false);
    const focusWindow = vi.spyOn(window, 'focus').mockImplementation(() => undefined);

    this.restores.push(() => {
      hasFocus.mockRestore();
      focusWindow.mockRestore();
    });

    return () => focusWindow.mock.calls.length;
  }

  get editorFocused(): boolean {
    return this.view.hasFocus();
  }

  place(anchor: number, head = anchor): void {
    this.view.focus();
    this.view.dispatch(this.state.tr.setSelection(textSelection(anchor, head)));
  }

  selectAll(): void {
    this.view.dispatch(this.state.tr.setSelection({ kind: 'all' }));
  }

  selectInDom(anchor: number, head = anchor): void {
    const from = this.view.domAtPos(anchor);
    const to = this.view.domAtPos(head);

    document.getSelection()?.setBaseAndExtent(from.node, from.offset, to.node, to.offset);
    document.dispatchEvent(new Event('selectionchange'));
  }

  pointInDom(anchor: number, head = anchor): void {
    const from = this.view.domAtPos(anchor);
    const to = this.view.domAtPos(head);

    document.getSelection()?.setBaseAndExtent(from.node, from.offset, to.node, to.offset);
  }

  noticeSelection(): void {
    document.dispatchEvent(new Event('selectionchange'));
  }

  selectRootChildren(from: number, to: number): void {
    document.getSelection()?.setBaseAndExtent(this.host, from, this.host, to);
    document.dispatchEvent(new Event('selectionchange'));
  }

  selectBlocks(from: number, to: number): void {
    const chunk = this.blocks[from]?.parentNode ?? this.host;

    document.getSelection()?.setBaseAndExtent(chunk, from, chunk, to);
    document.dispatchEvent(new Event('selectionchange'));
  }

  type(text: string): boolean {
    return Array.from(GRAPHEMES.segment(text), (part) => part.segment).every(
      (char) => !this.host.dispatchEvent(beforeinput('insertText', char)),
    );
  }

  input(inputType: string, data: string | null = null): boolean {
    return !this.host.dispatchEvent(beforeinput(inputType, data));
  }

  press(key: string, options: KeyOptions = {}): boolean {
    return !this.host.dispatchEvent(
      new KeyboardEvent('keydown', {
        key,
        shiftKey: options.shift ?? false,
        ctrlKey: options.ctrl ?? false,
        altKey: options.alt ?? false,
        metaKey: options.meta ?? false,
        bubbles: true,
        cancelable: true,
      }),
    );
  }

  paste(text: string, html = ''): boolean {
    const event = new Event('paste', { bubbles: true, cancelable: true });
    const data: Readonly<Record<string, string>> = { 'text/plain': text, 'text/html': html };

    Object.defineProperty(event, 'clipboardData', {
      value: { getData: (format: string) => data[format] ?? '' },
    });

    return !this.host.dispatchEvent(event);
  }

  pasteFiles(files: readonly File[], text = ''): boolean {
    const event = new Event('paste', { bubbles: true, cancelable: true });

    Object.defineProperty(event, 'clipboardData', {
      value: { files, getData: (format: string) => (format === 'text/plain' ? text : '') },
    });

    return !this.host.dispatchEvent(event);
  }

  dropFilesOn(target: Element | undefined, files: readonly File[]): boolean {
    const transfer = { files, types: ['Files'], getData: () => '' };
    const over = new Event('dragover', { bubbles: true, cancelable: true });
    const drop = new Event('drop', { bubbles: true, cancelable: true });

    Object.defineProperty(over, 'dataTransfer', { value: transfer });
    Object.defineProperty(drop, 'dataTransfer', { value: transfer });
    target?.dispatchEvent(over);

    return over.defaultPrevented && !(target?.dispatchEvent(drop) ?? true);
  }

  run(command: Command): boolean {
    return command(this.state, (tr) => {
      this.view.dispatch(tr);
    });
  }

  dragSelectionTo(text: string, offset: number, options: DragOptions = {}): Dragged {
    const carried = new Map<string, string>();

    const transfer = {
      effectAllowed: 'uninitialized',
      files: [],
      types: ['text/plain', 'text/html'],
      setData: (format: string, value: string) => {
        carried.set(format, value);
      },
      getData: (format: string) => carried.get(format) ?? '',
    };

    const eventOf = (type: string): Event => {
      const event = new Event(type, { bubbles: true, cancelable: true });

      Object.defineProperty(event, 'dataTransfer', { value: transfer });
      Object.defineProperty(event, 'ctrlKey', { value: options.copy ?? false });
      return event;
    };

    const start = this.view.domAtPos(selectionRange(this.state.doc, this.state.selection).from);
    const source = options.from ?? start.node.parentElement ?? this.host;
    const over = eventOf('dragover');
    const started = source.dispatchEvent(eventOf('dragstart'));

    if (started) {
      this.caretFrom('range', text, offset);
      this.host.dispatchEvent(over);
      this.host.dispatchEvent(eventOf('drop'));
    }

    source.dispatchEvent(eventOf('dragend'));
    return { started, offered: !over.defaultPrevented, effect: transfer.effectAllowed };
  }

  copy(type: 'copy' | 'cut', format = 'text/plain'): string | undefined {
    const copied = new Map<string, string>();
    const event = new Event(type, { bubbles: true, cancelable: true });

    Object.defineProperty(event, 'clipboardData', {
      value: {
        setData: (name: string, value: string) => {
          copied.set(name, value);
        },
      },
    });

    this.host.dispatchEvent(event);
    return copied.get(format);
  }

  get selectsAll(): boolean {
    return this.host.classList.contains('nui-editor__all');
  }

  clickNode(id: NodeId): boolean {
    return !(
      this.view
        .nodeDOM(id)
        ?.dispatchEvent(
          new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0 }),
        ) ?? true
    );
  }

  startComposition(): void {
    this.host.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
  }

  endComposition(): void {
    this.host.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: '' }));
  }

  async composeJoining(block: number, typed = ''): Promise<void> {
    const kept = textNodesOf(this.blocks[block - 1] ?? this.host)[0];
    const gone = this.blocks[block];

    this.startComposition();

    if (kept !== undefined) {
      const at = kept.data.length;

      kept.appendData(`${typed}${gone?.textContent ?? ''}`);
      document.getSelection()?.collapse(kept, at + typed.length);
    }

    gone?.remove();
    await settle();
    this.endComposition();
    await settle();
  }

  async compose(text: string): Promise<boolean> {
    this.startComposition();
    const passive = this.host.dispatchEvent(beforeinput('insertCompositionText', text));

    writeAtCaret(text);
    await settle();
    this.host.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: text }));
    await settle();
    return passive;
  }

  async startComposing(text: string): Promise<void> {
    this.startComposition();
    writeAtCaret(text);
    await settle();
  }

  async finishComposing(): Promise<void> {
    this.endComposition();
    await settle();
  }

  async commitUnannounced(text: string): Promise<void> {
    this.type(text);
    await settle();
  }

  async editDom(block: number, text: string): Promise<void> {
    const node = textNodesOf(this.blocks[block] ?? this.host)[0];

    if (node !== undefined) {
      node.data = text;
    }
    await settle();
  }

  layText(options: LayoutOptions): void {
    this.restores.push(
      replaceMember(Range.prototype, 'getClientRects', function (this: Range) {
        return textRects(this, options);
      }),
    );
  }

  caretFrom(api: CaretApi, text: string | undefined, offset: number): void {
    const node =
      text === undefined
        ? document.body
        : textNodesOf(this.host).find((candidate) => candidate.data === text);

    const position = () => (node === undefined ? null : { offsetNode: node, offset });

    const range = () => {
      const found = document.createRange();

      if (node !== undefined) {
        found.setStart(node, offset);
      }
      return found;
    };

    this.restores.push(
      replaceMember(document, 'caretPositionFromPoint', api === 'position' ? position : undefined),
      replaceMember(document, 'caretRangeFromPoint', api === 'range' ? range : undefined),
    );
  }

  get mentions(): readonly string[] {
    return this.state.doc.root.content.flatMap((block) =>
      block.kind === 'element'
        ? block.content.flatMap((node) =>
            node.kind === 'element' &&
            node.type === 'mention' &&
            typeof node.attrs.user === 'string'
              ? [node.attrs.user]
              : [],
          )
        : [],
    );
  }

  get markup(): string {
    return withoutStyles(this.host);
  }

  setChunkInView(index: number, visible: boolean): void {
    const chunk = this.chunkElements[index];

    if (chunk === undefined) {
      return;
    }

    for (const callback of sights) {
      callback([{ target: chunk, isIntersecting: visible }]);
    }
  }

  async finishFilling(): Promise<void> {
    for (let round = 0; round < 50; round += 1) {
      await settle();
    }
  }

  get blocks(): readonly Element[] {
    return [...this.host.children].flatMap((child) =>
      child.matches(CHUNK) ? [...child.children] : [child],
    );
  }

  get slotHolders(): readonly string[] {
    return Array.from(this.host.querySelectorAll(`.${SLOTS}`), (holder) =>
      holder.tagName.toLowerCase(),
    );
  }

  get chunkElements(): readonly Element[] {
    return [...this.host.querySelectorAll(CHUNK)];
  }

  get chunkSizes(): readonly number[] {
    return [...this.host.querySelectorAll(CHUNK)].map((chunk) => chunk.children.length);
  }

  chunkStyle(index: number): ChunkStyle {
    const chunk = this.host.querySelectorAll(CHUNK)[index];

    return {
      visibility:
        chunk instanceof HTMLElement ? chunk.style.getPropertyValue('content-visibility') : '',
      intrinsicSize:
        chunk instanceof HTMLElement
          ? chunk.style.getPropertyValue('contain-intrinsic-block-size')
          : '',
    };
  }

  get texts(): readonly string[] {
    return textNodesOf(this.host).map((node) => node.data);
  }

  get keptBlocks(): readonly boolean[] {
    return this.blocks.map((block) => this.blocksBefore.includes(block));
  }

  get keptTexts(): readonly boolean[] {
    return textNodesOf(this.host).map((node) => this.textsBefore.includes(node));
  }

  get editable(): string | null {
    return this.host.getAttribute('contenteditable');
  }

  get role(): string | null {
    return this.host.getAttribute('role');
  }

  get docSize(): number {
    return this.state.doc.size;
  }

  get domTexts(): readonly string[] {
    return this.blocks.map((block) => block.textContent ?? '');
  }

  get rootChanges(): number {
    return (this.mutations?.takeRecords() ?? []).reduce<number>(
      (sum, record) =>
        record.target === this.host ||
        (record.target instanceof Element && record.target.matches(CHUNK))
          ? sum + record.addedNodes.length + record.removedNodes.length
          : sum,
      0,
    );
  }

  remember(): void {
    this.blocksBefore = this.blocks;
    this.textsBefore = textNodesOf(this.host);
    this.mutations?.disconnect();
    this.mutations = new MutationObserver(() => undefined);
    this.mutations.observe(this.host, { childList: true, subtree: true });
  }

  change(edit: (tr: Transaction) => Transaction): void {
    this.view.dispatch(edit(this.state.tr));
  }

  receive(state: EditorState): void {
    this.view.update(state);
  }

  changeOutside(edit: (tr: Transaction) => Transaction): void {
    this.view.update(this.state.apply(edit(this.state.tr)));
  }

  get blockIds(): readonly NodeId[] {
    return this.state.doc.root.content.flatMap((block) =>
      block.kind === 'element' ? [block.id] : [],
    );
  }

  drawn(pos: number): boolean {
    return this.view.drawn(pos);
  }

  draw(pos: number): void {
    this.view.draw(pos);
  }

  onPage(id: NodeId): boolean {
    return this.view.nodeDOM(id)?.isConnected ?? false;
  }

  positionOf(id: NodeId): number {
    return this.state.doc.positionOf(id) ?? -1;
  }

  roundTrip(pos: number): number {
    const point = this.view.domAtPos(pos);

    return this.view.posAtDOM(point.node, point.offset);
  }

  positionAt(selector: string, offset: number, nth = 0): number {
    const target = this.host.querySelectorAll(selector)[nth];

    if (target === undefined) {
      throw new Error(`Nothing matches ${selector}`);
    }
    return this.view.posAtDOM(target, offset);
  }

  positionInText(text: string, offset: number): number {
    const node = textNodesOf(this.host).find((candidate) => candidate.data === text);

    if (node === undefined) {
      throw new Error(`No text node reads ${text}`);
    }
    return this.view.posAtDOM(node, offset);
  }

  positionOutside(): number {
    return this.view.posAtDOM(document.body, 0);
  }

  nodeTag(id: NodeId): string | undefined {
    return this.view.nodeDOM(id)?.tagName.toLowerCase();
  }

  setEditable(editable: boolean): void {
    this.view.setEditable(editable);
  }

  destroy(): void {
    if (!this.host.isConnected) {
      return;
    }
    this.mutations?.disconnect();
    for (const restore of this.restores.splice(0).toReversed()) {
      restore();
    }
    this.view.destroy();
    this.host.remove();
    vi.unstubAllGlobals();
  }
}
