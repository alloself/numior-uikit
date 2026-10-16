import { intentCommand, isAtom, selectAtom } from '../commands/input';
import { clipboardHTML } from '../html/clipboard';
import { nearestCursor, selectionRange } from '../state/selection';
import type { SelectionRange } from '../state/selection.types';
import type {
  InputIntent,
  InputSource,
  KeyInput,
  TextDirection,
  TextUnit,
} from '../state/input.types';
import type { Transaction } from '../state/state.types';
import { posAtCoords } from './coords';
import { descAround, widgetAround } from './desc';
import type { DomWatch } from './dom-change';
import type { ViewHost } from './host.types';
import { posAtDOM } from './positions';
import type { SelectionSync } from './selection-sync';

export interface InputParts {
  readonly sync: SelectionSync;
  readonly watch: DomWatch;
  readonly setComposing: (composing: boolean) => void;
}

interface Arrow {
  readonly forward: boolean;
  readonly vertical: boolean;
}

const DELETES: Readonly<Record<string, readonly [TextDirection, TextUnit]>> = {
  deleteContentBackward: ['backward', 'character'],
  deleteContentForward: ['forward', 'character'],
  deleteWordBackward: ['backward', 'word'],
  deleteWordForward: ['forward', 'word'],
  deleteSoftLineBackward: ['backward', 'line'],
  deleteSoftLineForward: ['forward', 'line'],
  deleteHardLineBackward: ['backward', 'line'],
  deleteHardLineForward: ['forward', 'line'],
  deleteContent: ['backward', 'character'],
  deleteByCut: ['backward', 'character'],
  deleteByDrag: ['backward', 'character'],
};

const FORMATS: Readonly<Record<string, string>> = {
  formatBold: 'bold',
  formatItalic: 'italic',
  formatUnderline: 'underline',
  formatStrikeThrough: 'strike',
};

const SIMPLE: Readonly<Record<string, InputIntent>> = {
  insertParagraph: { kind: 'insertParagraph' },
  insertLineBreak: { kind: 'insertLineBreak' },
  historyUndo: { kind: 'history', action: 'undo' },
  historyRedo: { kind: 'history', action: 'redo' },
};

const PASTES = new Set(['insertFromPaste', 'insertFromDrop', 'insertFromYank']);
const PASSIVE = new Set(['insertCompositionText', 'deleteCompositionText']);

const ARROWS: Readonly<Record<string, Arrow>> = {
  ArrowLeft: { forward: false, vertical: false },
  ArrowRight: { forward: true, vertical: false },
  ArrowUp: { forward: false, vertical: true },
  ArrowDown: { forward: true, vertical: true },
};

const targetRange = (event: InputEvent, host: ViewHost): SelectionRange | undefined => {
  const first =
    typeof event.getTargetRanges === 'function' ? event.getTargetRanges()[0] : undefined;

  if (
    first === undefined ||
    first.collapsed ||
    !host.root.contains(first.startContainer) ||
    !host.root.contains(first.endContainer)
  ) {
    return undefined;
  }
  const from = posAtDOM(host.context, first.startContainer, first.startOffset);
  const to = posAtDOM(host.context, first.endContainer, first.endOffset);

  return from < to ? { from, to } : undefined;
};

const textOf = (event: InputEvent): string =>
  event.data ?? event.dataTransfer?.getData('text/plain') ?? '';

const collapsed = (host: ViewHost): boolean => {
  const selection = host.state().selection;

  return selection.kind === 'text' && selection.anchor === selection.head;
};

const deletion = (event: InputEvent, host: ViewHost): InputIntent | undefined => {
  const kind = DELETES[event.inputType];
  const range = kind === undefined || !collapsed(host) ? undefined : targetRange(event, host);

  if (kind === undefined) {
    return undefined;
  }
  return range === undefined
    ? { kind: 'delete', direction: kind[0], unit: kind[1] }
    : { kind: 'delete', direction: kind[0], unit: kind[1], range };
};

const pasted = (text: string, html: string | undefined): InputIntent | undefined =>
  text === '' && (html ?? '') === '' ? undefined : { kind: 'paste', text, html };

const insertion = (event: InputEvent, host: ViewHost): InputIntent | undefined => {
  const text = textOf(event);
  const range = event.inputType === 'insertReplacementText' ? targetRange(event, host) : undefined;

  if (PASTES.has(event.inputType)) {
    return pasted(text, event.dataTransfer?.getData('text/html'));
  }
  if (text === '') {
    return undefined;
  }
  return range === undefined ? { kind: 'insertText', text } : { kind: 'insertText', text, range };
};

const INSERTIONS = new Set(['insertText', 'insertReplacementText', ...PASTES]);

const readIntent = (event: InputEvent, host: ViewHost): InputIntent | undefined => {
  const mark = FORMATS[event.inputType];

  if (mark !== undefined) {
    return { kind: 'format', mark };
  }
  if (INSERTIONS.has(event.inputType)) {
    return insertion(event, host);
  }
  return SIMPLE[event.inputType] ?? deletion(event, host);
};

const sourceOf = (intent: InputIntent): InputSource => {
  switch (intent.kind) {
    case 'insertText':
      return 'type';
    case 'compose':
      return 'compose';
    case 'delete':
      return 'delete';
    case 'paste':
      return 'paste';
    default:
      return 'key';
  }
};

export const runIntent = (host: ViewHost, intent: InputIntent): boolean => {
  const state = host.state();
  const source = sourceOf(intent);

  const dispatch = (tr: Transaction): void => {
    host.dispatch(tr, source);
  };

  return (
    state.plugins.some((plugin) => plugin.props.handleIntent?.(intent, state, dispatch) === true) ||
    intentCommand(intent)(state, dispatch)
  );
};

const keyOf = (event: KeyboardEvent): KeyInput => ({
  key: event.key,
  code: event.code,
  ctrl: event.ctrlKey,
  meta: event.metaKey,
  alt: event.altKey,
  shift: event.shiftKey,
});

const hasModifier = (event: KeyboardEvent): boolean =>
  event.shiftKey || event.ctrlKey || event.metaKey || event.altKey;

const isRtl = (host: ViewHost): boolean =>
  host.root.ownerDocument.defaultView?.getComputedStyle(host.root).direction === 'rtl';

const leaveAll = (host: ViewHost, forward: boolean): boolean => {
  const state = host.state();
  const edge = forward ? state.doc.size : 0;

  host.dispatch(state.tr.setSelection(nearestCursor(state.doc, edge, forward ? -1 : 1)), 'key');
  return true;
};

const moveByArrow = (host: ViewHost, event: KeyboardEvent): boolean => {
  const arrow = ARROWS[event.key];

  if (arrow === undefined || hasModifier(event)) {
    return false;
  }
  const forward = arrow.vertical ? arrow.forward : arrow.forward !== isRtl(host);
  const state = host.state();

  if (state.selection.kind === 'all') {
    return leaveAll(host, forward);
  }

  return selectAtom(forward ? 'forward' : 'backward', arrow.vertical)(state, (tr) => {
    host.dispatch(tr, 'key');
  });
};

const DELETE_KEYS = new Set(['Backspace', 'Delete']);

const deleteAll = (host: ViewHost, event: KeyboardEvent): boolean =>
  host.state().selection.kind === 'all' &&
  DELETE_KEYS.has(event.key) &&
  !hasModifier(event) &&
  runIntent(host, { kind: 'delete', direction: 'backward', unit: 'character' });

const handleKey = (host: ViewHost, event: KeyboardEvent): boolean => {
  const key = keyOf(event);
  const state = host.state();

  const dispatch = (tr: Transaction): void => {
    host.dispatch(tr, 'key');
  };

  return (
    state.plugins.some((plugin) => plugin.props.handleKey?.(key, state, dispatch) === true) ||
    moveByArrow(host, event) ||
    deleteAll(host, event)
  );
};

const atomAt = (host: ViewHost, target: EventTarget | null): string | undefined => {
  const desc = target instanceof Node ? descAround(host.context, target) : undefined;

  return desc?.kind === 'element' &&
    desc.contentDOM === null &&
    isAtom(host.context.schema, desc.node)
    ? desc.node.id
    : undefined;
};

const onDrag = (event: DragEvent): void => {
  event.preventDefault();
};

export const attachInput = (host: ViewHost, parts: InputParts): (() => void) => {
  const { root } = host;
  const doc = root.ownerDocument;

  const onKeydown = (event: KeyboardEvent): void => {
    if (host.composing() || event.isComposing || event.key === 'Process') {
      return;
    }
    parts.sync.read();
    if (handleKey(host, event)) {
      event.preventDefault();
    }
  };

  const onBeforeinput = (event: InputEvent): void => {
    if (PASSIVE.has(event.inputType) || event.isComposing || host.composing()) {
      return;
    }
    parts.sync.read();
    event.preventDefault();
    const intent = readIntent(event, host);

    if (intent !== undefined) {
      runIntent(host, intent);
    }
  };

  const onPaste = (event: ClipboardEvent): void => {
    const intent = pasted(
      event.clipboardData?.getData('text/plain') ?? '',
      event.clipboardData?.getData('text/html'),
    );

    event.preventDefault();
    parts.sync.read();
    if (intent !== undefined) {
      runIntent(host, intent);
    }
  };

  const onCopy = (event: ClipboardEvent): void => {
    parts.sync.read();
    const state = host.state();
    const range = selectionRange(state.doc, state.selection);

    if (range.from === range.to || event.clipboardData === null) {
      return;
    }
    const slice = state.doc.slice(range.from, range.to);

    event.preventDefault();
    event.clipboardData.setData('text/plain', state.doc.textBetween(range.from, range.to, '\n'));
    event.clipboardData.setData('text/html', clipboardHTML(state.doc.schema, slice.content));
    if (event.type === 'cut' && root.getAttribute('contenteditable') === 'true') {
      runIntent(host, { kind: 'delete', direction: 'backward', unit: 'character' });
    }
  };

  const onDrop = (event: DragEvent): void => {
    const intent = pasted(
      event.dataTransfer?.getData('text/plain') ?? '',
      event.dataTransfer?.getData('text/html'),
    );

    const pos = posAtCoords(host, event.clientX, event.clientY);
    const state = host.state();

    event.preventDefault();
    if (intent === undefined || pos === undefined) {
      return;
    }
    host.dispatch(state.tr.setSelection(nearestCursor(state.doc, pos)), 'pointer');
    runIntent(host, intent);
  };

  const onMousedown = (event: MouseEvent): void => {
    const id = event.button === 0 ? atomAt(host, event.target) : undefined;
    const state = host.state();

    if (id !== undefined) {
      event.preventDefault();
      root.focus({ preventScroll: true });
      host.dispatch(state.tr.setSelection({ kind: 'node', id }), 'pointer');
    }
  };

  const onCompositionstart = (): void => {
    parts.setComposing(true);
    parts.watch.startComposition();
  };

  const onCompositionend = (): void => {
    parts.setComposing(false);
    parts.watch.endComposition();
  };

  const onSelectionchange = (): void => {
    if (!widgetAround(host.context, doc.getSelection()?.focusNode ?? null)) {
      parts.sync.read();
    }
  };

  const own =
    <E extends Event>(handler: (event: E) => void) =>
    (event: E): void => {
      if (!widgetAround(host.context, event.target)) {
        handler(event);
      }
    };

  const keydown = own(onKeydown);
  const beforeinput = own(onBeforeinput);
  const paste = own(onPaste);
  const copy = own(onCopy);
  const drop = own(onDrop);
  const drag = own(onDrag);
  const mousedown = own(onMousedown);
  const compositionstart = own(onCompositionstart);
  const compositionend = own(onCompositionend);

  root.addEventListener('keydown', keydown);
  root.addEventListener('beforeinput', beforeinput);
  root.addEventListener('paste', paste);
  root.addEventListener('copy', copy);
  root.addEventListener('cut', copy);
  root.addEventListener('drop', drop);
  root.addEventListener('dragover', drag);
  root.addEventListener('dragstart', drag);
  root.addEventListener('mousedown', mousedown);
  root.addEventListener('compositionstart', compositionstart);
  root.addEventListener('compositionend', compositionend);
  doc.addEventListener('selectionchange', onSelectionchange);

  return () => {
    root.removeEventListener('keydown', keydown);
    root.removeEventListener('beforeinput', beforeinput);
    root.removeEventListener('paste', paste);
    root.removeEventListener('copy', copy);
    root.removeEventListener('cut', copy);
    root.removeEventListener('drop', drop);
    root.removeEventListener('dragover', drag);
    root.removeEventListener('dragstart', drag);
    root.removeEventListener('mousedown', mousedown);
    root.removeEventListener('compositionstart', compositionstart);
    root.removeEventListener('compositionend', compositionend);
    doc.removeEventListener('selectionchange', onSelectionchange);
  };
};
