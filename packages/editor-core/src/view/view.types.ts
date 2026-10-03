import type { NodeId } from '../model/node.types';
import type { EditorState } from '../state/state.types';

export interface DomPoint {
  readonly node: Node;
  readonly offset: number;
}

export interface EditorViewOptions {
  readonly state: EditorState;
  readonly editable?: boolean | undefined;
}

export interface EditorView {
  readonly dom: HTMLElement;
  readonly state: EditorState;
  update(state: EditorState): void;
  setEditable(editable: boolean): void;
  posAtDOM(node: Node, offset: number): number;
  domAtPos(pos: number): DomPoint;
  nodeDOM(id: NodeId): HTMLElement | undefined;
  destroy(): void;
}
