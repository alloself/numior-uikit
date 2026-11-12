import { vi } from 'vite-plus/test';
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
  nearestCursor,
  textSelection,
  type Command,
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
import { outlineOf } from '../support/outline';

const SOURCES: Readonly<Record<InputIntent['kind'], InputSource>> = {
  insertText: 'type',
  insertParagraph: 'key',
  insertLineBreak: 'key',
  delete: 'delete',
  format: 'key',
  history: 'key',
  paste: 'paste',
  files: 'paste',
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

const defaultPlugins = (): readonly Plugin[] => [
  inputRules(markdownRules),
  keymap(baseKeymap),
  history(),
];

export class EditingHarness {
  private applied = 0;

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

  get lastSteps(): number {
    return this.applied;
  }

  get outline(): string {
    return outlineOf(this.current.doc.root);
  }

  private dispatcher(source: InputSource | undefined): (tr: Transaction) => void {
    return (tr) => {
      if (source !== undefined) {
        tr.setMeta(inputSource, source);
      }
      this.applied = tr.steps.length;
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

  paste(html: string, text = ''): boolean {
    return this.intent({ kind: 'paste', text, html });
  }

  backspace(): boolean {
    return this.intent({ kind: 'delete', direction: 'backward', unit: 'character' });
  }

  deleteForward(): boolean {
    return this.intent({ kind: 'delete', direction: 'forward', unit: 'character' });
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

  nearestText(pos: number): number {
    const cursor = nearestCursor(this.current.doc, pos);

    return cursor.kind === 'text' ? cursor.head : pos;
  }

  endOfTextAfter(pos: number, length: number): number {
    const { parent, parentOffset } = this.current.doc.resolve(pos);

    return pos + Math.min(length, parent.size - 2 - parentOffset);
  }

  private textAt(text: string): number {
    let found: number | undefined;

    this.current.doc.nodesBetween(0, this.current.doc.size, (node, pos) => {
      if (found === undefined && node.kind === 'text' && node.text === text) {
        found = pos;
      }
      return found === undefined;
    });

    if (found === undefined) {
      throw new Error(`No text node reads ${text}`);
    }
    return found;
  }

  placeIn(text: string, offset = 0): void {
    this.select(textSelection(this.textAt(text) + offset));
  }

  blockOf(text: string): string {
    return this.current.doc.resolve(this.textAt(text)).parent.id;
  }

  select(selection: Selection): void {
    this.dispatcher('pointer')(this.current.tr.setSelection(selection));
  }

  run(command: Command): boolean {
    return command(this.current, this.dispatcher('key'));
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
