import type { DecorationSet } from '../decorations/decorations.types';
import type { Doc, Slice } from '../doc/doc.types';
import type {
  AttrValue,
  ContentNode,
  ElementNode,
  IdSource,
  Mark,
  NodeId,
} from '../model/node.types';
import type { Mapping } from '../transform/mapping.types';
import type { Step, StepResult } from '../transform/step.types';
import type { PeerSpot } from '../spots/spots.types';
import type { NodeMarkup, SplitType } from '../transform/transform.types';
import type { InputIntent, KeyInput } from './input.types';
import type { Selection } from './selection.types';

export interface MetaKey<T> {
  readonly name: string;
  read(tr: Transaction): T | undefined;
  write(tr: Transaction, value: T): void;
}

export interface Transaction {
  readonly before: Doc;
  readonly doc: Doc;
  readonly steps: readonly Step[];
  readonly docs: readonly Doc[];
  readonly mapping: Mapping;
  readonly changed: boolean;
  readonly time: number;
  readonly selection: Selection;
  readonly selectionSet: boolean;
  readonly storedMarks: readonly Mark[] | null;
  readonly storedMarksSet: boolean;
  newId(): NodeId;
  step(step: Step): Transaction;
  maybeStep(step: Step): StepResult;
  replace(from: number, to: number, slice?: Slice): Transaction;
  insert(pos: number, content: readonly ContentNode[]): Transaction;
  delete(from: number, to: number): Transaction;
  insertText(text: string, from?: number, to?: number): Transaction;
  addMark(from: number, to: number, mark: Mark): Transaction;
  removeMark(from: number, to: number, mark?: Mark | string): Transaction;
  setNodeAttrs(pos: number, attrs: Readonly<Record<string, AttrValue>>): Transaction;
  setNodesMarkup(changes: readonly NodeMarkup[]): Transaction;
  setDocAttrs(attrs: Readonly<Record<string, AttrValue>>): Transaction;
  split(pos: number, depth?: number, after?: SplitType): Transaction;
  join(pos: number, depth?: number): Transaction;
  setSelection(selection: Selection): Transaction;
  setStoredMarks(marks: readonly Mark[] | null): Transaction;
  replaceSelection(slice: Slice): Transaction;
  deleteSelection(): Transaction;
  setMeta<T>(key: MetaKey<T>, value: T): Transaction;
  getMeta<T>(key: MetaKey<T>): T | undefined;
}

export interface PluginStateSpec<S> {
  init(state: EditorState): S;
  apply(tr: Transaction, value: S, before: EditorState, after: EditorState): S;
}

export interface EditorProps {
  readonly handleKey?:
    | ((key: KeyInput, state: EditorState, dispatch: Dispatch) => boolean)
    | undefined;
  readonly handleIntent?:
    | ((intent: InputIntent, state: EditorState, dispatch: Dispatch) => boolean)
    | undefined;
  readonly conceals?:
    | ((parent: ElementNode, index: number, state: EditorState) => boolean)
    | undefined;
  readonly decorations?: ((state: EditorState) => DecorationSet | undefined) | undefined;
  readonly spots?: ((state: EditorState) => readonly PeerSpot[] | undefined) | undefined;
  readonly stateChanged?: ((state: EditorState, before: EditorState) => void) | undefined;
}

export interface PluginSpec<S> {
  readonly name: string;
  readonly state?: PluginStateSpec<S> | undefined;
  readonly props?: EditorProps | undefined;
  readonly filterTransaction?: ((tr: Transaction, state: EditorState) => boolean) | undefined;
  readonly appendTransaction?:
    | ((
        transactions: readonly Transaction[],
        before: EditorState,
        after: EditorState,
      ) => Transaction | undefined)
    | undefined;
}

export interface Plugin<S = unknown> {
  readonly name: string;
  readonly props: EditorProps;
  getState(state: EditorState): S | undefined;
  attach(after: EditorState, before?: EditorState, tr?: Transaction): void;
  filterTransaction(tr: Transaction, state: EditorState): boolean;
  appendTransaction(
    transactions: readonly Transaction[],
    before: EditorState,
    after: EditorState,
  ): Transaction | undefined;
}

export interface EditorStateConfig {
  readonly doc: Doc;
  readonly selection?: Selection | undefined;
  readonly storedMarks?: readonly Mark[] | null | undefined;
  readonly plugins?: readonly Plugin[] | undefined;
  readonly ids?: IdSource | undefined;
}

export interface AppliedTransaction {
  readonly state: EditorState;
  readonly transactions: readonly Transaction[];
}

export interface EditorState {
  readonly doc: Doc;
  readonly selection: Selection;
  readonly storedMarks: readonly Mark[] | null;
  readonly plugins: readonly Plugin[];
  readonly ids: IdSource;
  readonly tr: Transaction;
  apply(tr: Transaction): EditorState;
  applyTransaction(tr: Transaction): AppliedTransaction;
}

export type Dispatch = (tr: Transaction) => void;

export type Command = (state: EditorState, dispatch?: Dispatch) => boolean;

export const InputIntentKind = {
  InsertText: 'insertText',
  InsertParagraph: 'insertParagraph',
  InsertLineBreak: 'insertLineBreak',
  Delete: 'delete',
  Format: 'format',
  History: 'history',
  Paste: 'paste',
  Files: 'files',
  Compose: 'compose',
} as const;

export const SelectionKind = {
  Text: 'text',
  Node: 'node',
  Gap: 'gap',
  Block: 'block',
  Cell: 'cell',
  All: 'all',
} as const;
