import type { ElementNode, NodeId } from '../model/node.types';
import type { EditorState, Transaction } from '../state/state.types';

export interface DomPoint {
  readonly node: Node;
  readonly offset: number;
}

export interface CaretRect {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
}

export interface NodeView {
  readonly dom: HTMLElement;
  readonly contentDOM: HTMLElement | null;
  update(node: ElementNode): boolean;
  destroy(): void;
}

export type NodeViewFactory = (node: ElementNode) => NodeView;

export interface EditorViewOptions {
  readonly state: EditorState;
  readonly editable?: boolean | undefined;
  readonly dispatch?: ((tr: Transaction) => void) | undefined;
  readonly nodeViews?: Readonly<Record<string, NodeViewFactory>> | undefined;
  readonly widget?: ((key: string) => HTMLElement | undefined) | undefined;
}

export interface EditorView {
  readonly dom: HTMLElement;
  readonly state: EditorState;
  readonly composing: boolean;
  update(state: EditorState): void;
  dispatch(tr: Transaction): void;
  setEditable(editable: boolean): void;
  focus(): void;
  hasFocus(): boolean;
  posAtDOM(node: Node, offset: number): number;
  domAtPos(pos: number): DomPoint;
  coordsAtPos(pos: number): CaretRect | undefined;
  posAtCoords(x: number, y: number): number | undefined;
  nodeDOM(id: NodeId): HTMLElement | undefined;
  destroy(): void;
}
