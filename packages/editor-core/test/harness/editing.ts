import { vi } from 'vitest';
import {
  baseKeymap,
  createDoc,
  createState,
  history,
  inputRules,
  inputSource,
  intentCommand,
  keymap,
  markdownRules,
  textSelection,
  type ContentNode,
  type EditorState,
  type ElementNode,
  type InputIntent,
  type InputSource,
  type KeyInput,
  type Plugin,
  type Selection,
  type Transaction,
} from '../../src';
import { fixtureSchema } from '../../src/fixtures';

const SOURCES: Readonly<Record<InputIntent['kind'], InputSource>> = {
  insertText: 'type',
  insertParagraph: 'key',
  insertLineBreak: 'key',
  delete: 'delete',
  format: 'key',
  history: 'key',
  paste: 'paste',
  compose: 'compose',
};

const keyOf = (name: string, code = ''): KeyInput => {
  const parts = name.split(/-(?!$)/);
  const modifiers = new Set(parts.slice(0, -1));

  return {
    key: parts.at(-1) ?? '',
    code,
    ctrl: modifiers.has('Mod'),
    meta: false,
    alt: modifiers.has('Alt'),
    shift: modifiers.has('Shift'),
  };
};

const attrsText = (node: ElementNode): string => {
  const defaults = fixtureSchema.element(node.type, { id: 'defaults' }).attrs;

  const changed = Object.entries(node.attrs).filter(
    ([key, value]) => defaults[key] !== value && key !== 'src',
  );

  return changed.length === 0
    ? ''
    : `{${changed.map(([key, value]) => `${key}=${String(value)}`).join(',')}}`;
};

const outlineOf = (node: ContentNode): string => {
  if (node.kind === 'text') {
    const marks = node.marks.map((mark) => mark.type).join('+');

    return marks === '' ? JSON.stringify(node.text) : `${marks}:${JSON.stringify(node.text)}`;
  }
  const inner = node.content.map(outlineOf).join(' ');

  return `${node.type}${attrsText(node)}${node.leaf ? '' : `(${inner})`}`;
};

const defaultPlugins = (): readonly Plugin[] => [
  inputRules(markdownRules),
  keymap(baseKeymap),
  history(),
];

export class EditingHarness {
  private constructor(private current: EditorState) {}

  static of(
    root: ElementNode,
    selection: Selection,
    plugins: readonly Plugin[] = defaultPlugins(),
  ): EditingHarness {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(1_000_000);
    return new EditingHarness(
      createState({ doc: createDoc(fixtureSchema, root), selection, plugins }),
    );
  }

  get state(): EditorState {
    return this.current;
  }

  get selection(): Selection {
    return this.current.selection;
  }

  get outline(): string {
    return this.current.doc.root.content.map(outlineOf).join(' ');
  }

  private dispatcher(source: InputSource | undefined): (tr: Transaction) => void {
    return (tr) => {
      if (source !== undefined) {
        tr.setMeta(inputSource, source);
      }
      this.current = this.current.apply(tr);
    };
  }

  intent(intent: InputIntent): boolean {
    const state = this.current;
    const dispatch = this.dispatcher(SOURCES[intent.kind]);

    return (
      state.plugins.some(
        (plugin) => plugin.props.handleIntent?.(intent, state, dispatch) === true,
      ) || intentCommand(intent)(state, dispatch)
    );
  }

  type(text: string): void {
    for (const char of text) {
      this.intent({ kind: 'insertText', text: char });
    }
  }

  composeText(text: string, from: number, to = from): boolean {
    return this.intent({ kind: 'compose', text, range: { from, to } });
  }

  backspace(): boolean {
    return this.intent({ kind: 'delete', direction: 'backward', unit: 'character' });
  }

  enter(): boolean {
    return this.intent({ kind: 'insertParagraph' });
  }

  press(name: string, code?: string): boolean {
    const state = this.current;
    const dispatch = this.dispatcher('key');
    const key = keyOf(name, code);

    return state.plugins.some((plugin) => plugin.props.handleKey?.(key, state, dispatch) === true);
  }

  placeIn(text: string, offset = 0): void {
    let found: number | undefined;

    this.current.doc.nodesBetween(0, this.current.doc.size, (node, pos) => {
      if (found === undefined && node.kind === 'text' && node.text === text) {
        found = pos + offset;
      }
      return found === undefined;
    });

    if (found === undefined) {
      throw new Error(`No text node reads ${text}`);
    }
    this.select(textSelection(found));
  }

  select(selection: Selection): void {
    this.dispatcher('pointer')(this.current.tr.setSelection(selection));
  }

  change(edit: (tr: Transaction) => Transaction): void {
    this.dispatcher(undefined)(edit(this.current.tr));
  }

  pause(ms: number): void {
    vi.setSystemTime(Date.now() + ms);
  }

  release(): void {
    vi.useRealTimers();
  }
}
