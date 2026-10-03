import { vi } from 'vitest';
import {
  createDoc,
  createState,
  type EditorState,
  type ElementNode,
  type NodeId,
  type Schema,
  type Transaction,
} from '../../src';
import { fixtureSchema } from '../../src/fixtures';
import { createEditorView, type EditorView } from '../../src/view';
import { installResizeObservers, observedTargets, resizeTarget } from '../support/resize-observers';

export interface BlockStyle {
  readonly visibility: string;
  readonly intrinsicSize: string;
}

const textNodesOf = (root: Node): Text[] => {
  const found: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);

  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    if (node instanceof Text) {
      found.push(node);
    }
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
  return copy.innerHTML;
};

export class EditorViewDriver {
  private state: EditorState;
  private blocksBefore: readonly Element[] = [];
  private textsBefore: readonly Text[] = [];
  private mutations: MutationObserver | undefined;

  private constructor(
    readonly view: EditorView,
    readonly host: HTMLElement,
  ) {
    this.state = view.state;
  }

  static mount(root: ElementNode, schema: Schema = fixtureSchema): EditorViewDriver {
    installResizeObservers();

    const host = document.createElement('div');

    document.body.append(host);

    const state = createState({ doc: createDoc(schema, root) });

    return new EditorViewDriver(createEditorView(host, { state }), host);
  }

  get markup(): string {
    return withoutStyles(this.host);
  }

  get blocks(): readonly Element[] {
    return [...this.host.children];
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

  get observed(): number {
    return observedTargets();
  }

  get docSize(): number {
    return this.state.doc.size;
  }

  get rootChanges(): number {
    return (this.mutations?.takeRecords() ?? []).reduce(
      (sum, record) => sum + record.addedNodes.length + record.removedNodes.length,
      0,
    );
  }

  remember(): void {
    this.blocksBefore = this.blocks;
    this.textsBefore = textNodesOf(this.host);
    this.mutations?.disconnect();
    this.mutations = new MutationObserver(() => undefined);
    this.mutations.observe(this.host, { childList: true });
  }

  change(edit: (tr: Transaction) => Transaction): void {
    this.state = this.state.apply(edit(this.state.tr));
    this.view.update(this.state);
  }

  receive(state: EditorState): void {
    this.view.update(state);
  }

  blockStyle(index: number): BlockStyle {
    const block = this.blocks[index];

    return {
      visibility:
        block instanceof HTMLElement ? block.style.getPropertyValue('content-visibility') : '',
      intrinsicSize:
        block instanceof HTMLElement
          ? block.style.getPropertyValue('contain-intrinsic-block-size')
          : '',
    };
  }

  resizeBlock(index: number, blockSize: number): void {
    const block = this.blocks[index];

    if (block !== undefined) {
      resizeTarget(block, blockSize);
    }
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
    this.view.destroy();
    this.host.remove();
    vi.unstubAllGlobals();
  }
}
