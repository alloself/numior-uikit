import { intentCommand, isAtom, selectAtom } from '../commands/input';
import { nearestCursor } from '../state/selection';
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
import { descAround } from './desc';
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

const insertion = (event: InputEvent, host: ViewHost): InputIntent | undefined => {
  const text = textOf(event);
  const range = event.inputType === 'insertReplacementText' ? targetRange(event, host) : undefined;

  if (text === '') {
    return undefined;
  }
  if (PASTES.has(event.inputType)) {
    return { kind: 'paste', text };
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

const moveByArrow = (host: ViewHost, event: KeyboardEvent): boolean => {
  const arrow = ARROWS[event.key];

  if (arrow === undefined || hasModifier(event)) {
    return false;
  }
  const forward = arrow.vertical ? arrow.forward : arrow.forward !== isRtl(host);
  const state = host.state();

  return selectAtom(forward ? 'forward' : 'backward', arrow.vertical)(state, (tr) => {
    host.dispatch(tr, 'key');
  });
};

const handleKey = (host: ViewHost, event: KeyboardEvent): boolean => {
  const key = keyOf(event);
  const state = host.state();

  const dispatch = (tr: Transaction): void => {
    host.dispatch(tr, 'key');
  };

  return (
    state.plugins.some((plugin) => plugin.props.handleKey?.(key, state, dispatch) === true) ||
    moveByArrow(host, event)
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
    const text = event.clipboardData?.getData('text/plain') ?? '';

    event.preventDefault();
    parts.sync.read();
    if (text !== '') {
      runIntent(host, { kind: 'paste', text });
    }
  };

  const onDrop = (event: DragEvent): void => {
    const text = event.dataTransfer?.getData('text/plain') ?? '';
    const pos = posAtCoords(host, event.clientX, event.clientY);
    const state = host.state();

    event.preventDefault();
    if (text === '' || pos === undefined) {
      return;
    }
    host.dispatch(state.tr.setSelection(nearestCursor(state.doc, pos)), 'pointer');
    runIntent(host, { kind: 'paste', text });
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
    parts.sync.read();
  };

  root.addEventListener('keydown', onKeydown);
  root.addEventListener('beforeinput', onBeforeinput);
  root.addEventListener('paste', onPaste);
  root.addEventListener('drop', onDrop);
  root.addEventListener('dragover', onDrag);
  root.addEventListener('dragstart', onDrag);
  root.addEventListener('mousedown', onMousedown);
  root.addEventListener('compositionstart', onCompositionstart);
  root.addEventListener('compositionend', onCompositionend);
  doc.addEventListener('selectionchange', onSelectionchange);

  return () => {
    root.removeEventListener('keydown', onKeydown);
    root.removeEventListener('beforeinput', onBeforeinput);
    root.removeEventListener('paste', onPaste);
    root.removeEventListener('drop', onDrop);
    root.removeEventListener('dragover', onDrag);
    root.removeEventListener('dragstart', onDrag);
    root.removeEventListener('mousedown', onMousedown);
    root.removeEventListener('compositionstart', onCompositionstart);
    root.removeEventListener('compositionend', onCompositionend);
    doc.removeEventListener('selectionchange', onSelectionchange);
  };
};
