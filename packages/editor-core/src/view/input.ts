import { caretAtEnd } from '../commands/blocks';
import { isAtom } from '../commands/atoms';
import { intentCommand, selectAtom } from '../commands/input';
import { clipboardHTML } from '../html/clipboard';
import { nearestCursor, selectionRange } from '../state/selection';
import type { Selection, SelectionRange } from '../state/selection.types';
import {
  InputSource,
  type InputIntent,
  type KeyInput,
  type TextDirection,
  type TextUnit,
} from '../state/input.types';
import {
  InputIntentKind,
  SelectionKind,
  type EditorState,
  type Transaction,
} from '../state/state.types';
import { posAtCoords } from './coords';
import { descAround, widgetAround, widgetOwner } from './desc';
import type { DomWatch } from './dom-change';
import type { ViewHost } from './host.types';
import { posAtDOM } from './positions';
import type { SelectionSync } from './selection-sync';
import { pointBeside } from './beside';
import { sideOutside } from './gap';
import { verticalTarget } from './vertical';
import {
  AttrToken,
  DescKind,
  Direction,
  DomEventType,
  GapMove,
  InputType,
  Key,
} from './view.types';
import { ContentNodeKind } from '../model/node.types';

export interface InputParts {
  readonly sync: SelectionSync;
  readonly watch: DomWatch;
  readonly setComposing: (composing: boolean) => void;
  readonly setHolding: (holding: boolean) => void;
}

interface Arrow {
  readonly forward: boolean;
  readonly vertical: boolean;
}

interface Carried {
  readonly text: string;
  readonly html: string;
}

type Extend = (tr: Transaction) => Transaction;

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

const withinBlock = (host: ViewHost, from: number, to: number): boolean => {
  const { doc } = host.state();

  return doc.resolve(from).parent.id === doc.resolve(to).parent.id;
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

  return from < to && withinBlock(host, from, to) ? { from, to } : undefined;
};

const textOf = (event: InputEvent): string =>
  event.data ?? event.dataTransfer?.getData('text/plain') ?? '';

const collapsed = (host: ViewHost): boolean => {
  const selection = host.state().selection;

  return selection.kind === SelectionKind.Text && selection.anchor === selection.head;
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

const transferred = (data: DataTransfer | null): InputIntent | undefined => {
  const text = data?.getData('text/plain') ?? '';
  const files = [...(data?.files ?? [])];

  return files.length > 0 && text === ''
    ? { kind: 'files', files }
    : pasted(text, data?.getData('text/html'));
};

const insertion = (event: InputEvent, host: ViewHost): InputIntent | undefined => {
  const text = textOf(event);

  const range =
    event.inputType === InputType.InsertReplacementText ? targetRange(event, host) : undefined;

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
    case InputIntentKind.InsertText:
      return InputSource.Type;
    case InputIntentKind.Compose:
      return InputSource.Compose;
    case InputIntentKind.Delete:
      return InputSource.Delete;
    case InputIntentKind.Paste:
    case InputIntentKind.Files:
      return InputSource.Paste;
    default:
      return InputSource.Key;
  }
};

export const runIntent = (host: ViewHost, intent: InputIntent, extend?: Extend): boolean => {
  const state = host.state();
  const source = sourceOf(intent);

  const dispatch = (tr: Transaction): void => {
    host.dispatch(extend?.(tr) ?? tr, source);
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
  host.root.ownerDocument.defaultView?.getComputedStyle(host.root).direction === Direction.Rtl;

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

  if (state.selection.kind === SelectionKind.All) {
    return leaveAll(host, forward);
  }

  const across = arrow.vertical ? verticalTarget(host, forward) : undefined;

  if (across !== undefined) {
    host.dispatch(state.tr.setSelection(across), 'key');
    return true;
  }

  return selectAtom(forward ? 'forward' : 'backward', arrow.vertical)(state, (tr) => {
    host.dispatch(tr, 'key');
  });
};

const DELETE_KEYS = new Set(['Backspace', 'Delete']);

const deleteAll = (host: ViewHost, event: KeyboardEvent): boolean =>
  host.state().selection.kind === SelectionKind.All &&
  DELETE_KEYS.has(event.key) &&
  !hasModifier(event) &&
  runIntent(host, { kind: 'delete', direction: 'backward', unit: 'character' });

const NODE_KEYS: Readonly<Record<string, InputIntent>> = {
  Backspace: { kind: 'delete', direction: 'backward', unit: 'character' },
  Delete: { kind: 'delete', direction: 'forward', unit: 'character' },
  Enter: { kind: 'insertParagraph' },
};

const overNode = (event: KeyboardEvent): InputIntent | undefined => {
  if (event.ctrlKey || event.metaKey || event.altKey) {
    return undefined;
  }
  return (
    NODE_KEYS[event.key] ??
    (Array.from(event.key).length === 1 ? { kind: 'insertText', text: event.key } : undefined)
  );
};

const atTextEdge = (host: ViewHost, backward: boolean): boolean => {
  const { selection, doc } = host.state();

  if (selection.kind !== SelectionKind.Text || selection.anchor !== selection.head) {
    return false;
  }
  const cursor = doc.resolve(selection.head);

  return (
    doc.schema.nodes.get(cursor.parent.type)?.inlineContent === true &&
    (backward ? cursor.parentOffset === 0 : cursor.pos === cursor.end(cursor.depth))
  );
};

const deleteAtEdge = (host: ViewHost, event: KeyboardEvent): boolean => {
  const intent =
    DELETE_KEYS.has(event.key) && !hasModifier(event) ? NODE_KEYS[event.key] : undefined;

  return (
    intent !== undefined && atTextEdge(host, event.key === Key.Backspace) && runIntent(host, intent)
  );
};

const editNode = (host: ViewHost, event: KeyboardEvent): boolean => {
  const { kind } = host.state().selection;

  const intent =
    kind === SelectionKind.Node || kind === SelectionKind.Gap ? overNode(event) : undefined;

  return intent !== undefined && runIntent(host, intent);
};

const GAP_KEYS: Readonly<Record<string, GapMove>> = {
  Home: 'start',
  End: 'end',
  'Shift+ArrowLeft': 'select',
  'Shift+ArrowRight': 'select',
};

const moveInGap = (host: ViewHost, event: KeyboardEvent): boolean => {
  const state = host.state();
  const { selection } = state;
  const move = GAP_KEYS[`${event.shiftKey ? 'Shift+' : ''}${event.key}`];

  if (
    selection.kind !== SelectionKind.Gap ||
    move === undefined ||
    event.ctrlKey ||
    event.metaKey ||
    event.altKey
  ) {
    return false;
  }

  host.dispatch(
    state.tr.setSelection(
      move === GapMove.Select
        ? { kind: 'node', id: selection.id }
        : { kind: 'gap', id: selection.id, side: move },
    ),
    'key',
  );

  return true;
};

const IME_KEYS = new Set(['Process', 'Unidentified']);

const isPlainInput = (event: InputEvent): boolean =>
  !event.isComposing && !event.inputType.includes('Composition');

const sameGap = (selection: Selection, gap: Selection | undefined): boolean =>
  selection.kind === SelectionKind.Gap &&
  gap?.kind === SelectionKind.Gap &&
  selection.id === gap.id &&
  selection.side === gap.side;

const handleKey = (host: ViewHost, event: KeyboardEvent): boolean => {
  const key = keyOf(event);
  const state = host.state();

  const dispatch = (tr: Transaction): void => {
    host.dispatch(tr, 'key');
  };

  return (
    state.plugins.some((plugin) => plugin.props.handleKey?.(key, state, dispatch) === true) ||
    moveInGap(host, event) ||
    moveByArrow(host, event) ||
    deleteAll(host, event) ||
    editNode(host, event) ||
    deleteAtEdge(host, event)
  );
};

const atomAt = (host: ViewHost, target: EventTarget | null): string | undefined => {
  const desc = target instanceof Node ? descAround(host.context, target) : undefined;
  let found: string | undefined;

  for (
    let current = (desc?.kind === DescKind.Text ? desc.parent : desc) ?? null;
    current !== null;
    current = current.parent
  ) {
    if (isAtom(host.context.schema, current.node)) {
      found = current.node.id;
    }
  }
  return found;
};

const INTERACTIVE = 'button, input, select, textarea, a, label, [role], [tabindex]';

const interactive = (target: EventTarget | null, owner: Element): boolean => {
  for (
    let current = target instanceof Element ? target : null;
    current !== null && current !== owner;
    current = current.parentElement
  ) {
    if (current.matches(INTERACTIVE)) {
      return true;
    }
  }
  return false;
};

const carriesFiles = (event: DragEvent): boolean =>
  [...(event.dataTransfer?.types ?? [])].includes('Files');

const onDragover = (event: DragEvent): void => {
  if (carriesFiles(event)) {
    event.preventDefault();
  }
};

const carried = (state: EditorState, range: SelectionRange): Carried => ({
  text: state.doc.textBetween(range.from, range.to, '\n'),
  html: clipboardHTML(state.doc.schema, state.doc.slice(range.from, range.to).content),
});

const withinSelection = (doc: Document, target: EventTarget | null): boolean => {
  const selection = doc.getSelection();

  return (
    target instanceof Node &&
    selection !== null &&
    selection.rangeCount > 0 &&
    selection.getRangeAt(0).intersectsNode(target)
  );
};

const without =
  (moved: SelectionRange): Extend =>
  (tr) =>
    tr.delete(tr.mapping.map(moved.from, 1), tr.mapping.map(moved.to, -1));

export const attachInput = (host: ViewHost, parts: InputParts): (() => void) => {
  const { root } = host;
  const doc = root.ownerDocument;
  let dragging = false;
  let opened: Selection | undefined;

  const openGap = (): Selection | undefined => {
    const gap = host.state().selection;

    if (gap.kind !== SelectionKind.Gap) {
      return undefined;
    }

    runIntent(host, { kind: 'insertText', text: '' });
    parts.sync.write();
    return gap;
  };

  const onCompositionstart = (): void => {
    openGap();
    parts.setComposing(true);
    parts.watch.startComposition();
  };

  const onCompositionend = (): void => {
    parts.setComposing(false);
    parts.watch.endComposition();
  };

  const onKeydown = (event: KeyboardEvent): void => {
    opened = IME_KEYS.has(event.key) ? openGap() : undefined;

    if (host.composing() || event.isComposing || event.key === Key.Process) {
      return;
    }
    parts.sync.read();
    if (handleKey(host, event)) {
      event.preventDefault();
    }
  };

  const onBeforeinput = (event: InputEvent): void => {
    const gap = opened;

    opened = undefined;
    if (host.composing() && isPlainInput(event)) {
      onCompositionend();
    }
    if (PASSIVE.has(event.inputType) || event.isComposing || host.composing()) {
      return;
    }
    parts.sync.read();
    event.preventDefault();
    const intent = readIntent(event, host);

    if (intent === undefined) {
      return;
    }

    runIntent(host, intent);

    if (intent.kind === InputIntentKind.Delete && sameGap(host.state().selection, gap)) {
      runIntent(host, intent);
    }
  };

  const onPaste = (event: ClipboardEvent): void => {
    const intent = transferred(event.clipboardData);

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
    const { text, html } = carried(state, range);

    event.preventDefault();
    event.clipboardData.setData('text/plain', text);
    event.clipboardData.setData('text/html', html);
    if (
      event.type === DomEventType.Cut &&
      root.getAttribute('contenteditable') === AttrToken.True
    ) {
      runIntent(host, { kind: 'delete', direction: 'backward', unit: 'character' });
    }
  };

  const onDragstart = (event: DragEvent): void => {
    const transfer = event.dataTransfer;

    parts.sync.read();
    const state = host.state();
    const range = selectionRange(state.doc, state.selection);

    if (transfer === null || range.from === range.to || !withinSelection(doc, event.target)) {
      event.preventDefault();
      return;
    }

    const { text, html } = carried(state, range);

    transfer.setData('text/plain', text);
    transfer.setData('text/html', html);

    transfer.effectAllowed =
      root.getAttribute('contenteditable') === AttrToken.True ? 'copyMove' : 'copy';

    dragging = true;
  };

  const onDragend = (): void => {
    dragging = false;
  };

  const onDrop = (event: DragEvent): void => {
    const intent = transferred(event.dataTransfer);

    const pos = posAtCoords(host, event.clientX, event.clientY);
    const state = host.state();
    const source = dragging ? selectionRange(state.doc, state.selection) : undefined;
    const copies = event.ctrlKey || event.altKey;

    const ontoItself =
      source !== undefined && pos !== undefined && pos >= source.from && pos <= source.to;

    event.preventDefault();
    dragging = false;
    if (intent === undefined || pos === undefined || ontoItself) {
      return;
    }
    host.dispatch(state.tr.setSelection(nearestCursor(state.doc, pos)), 'pointer');
    runIntent(host, intent, source === undefined || copies ? undefined : without(source));
  };

  const onWidgetDrag = (event: DragEvent): void => {
    if (widgetAround(host.context, event.target) && carriesFiles(event)) {
      event.preventDefault();
    }
  };

  const onWidgetDrop = (event: DragEvent): void => {
    if (!widgetAround(host.context, event.target) || !carriesFiles(event)) {
      return;
    }
    const owner = widgetOwner(host.context, event.target);
    const files = [...(event.dataTransfer?.files ?? [])];

    event.preventDefault();
    if (owner !== undefined) {
      host.dispatch(host.state().tr.setSelection({ kind: 'node', id: owner.node.id }), 'pointer');
    }
    runIntent(host, { kind: 'files', files });
  };

  const place = (event: MouseEvent, selection: Selection): void => {
    event.preventDefault();
    root.focus({ preventScroll: true });
    host.dispatch(host.state().tr.setSelection(selection), 'pointer');
  };

  const pointAt = (event: MouseEvent, id: string): Selection => {
    const side = sideOutside(host, id, event.clientX);

    return side === undefined ? { kind: 'node', id } : { kind: 'gap', id, side };
  };

  const belowContent = (event: MouseEvent): boolean => {
    const last = host.state().doc.root.content.at(-1);

    const dom =
      last?.kind === ContentNodeKind.Element ? host.context.byId.get(last.id)?.dom : undefined;

    const target = event.target;

    return (
      event.button === 0 &&
      dom !== undefined &&
      target instanceof Element &&
      (target === root || target.parentElement === root) &&
      event.clientY > dom.getBoundingClientRect().bottom
    );
  };

  const onMousedown = (event: MouseEvent): void => {
    const id = event.button === 0 ? atomAt(host, event.target) : undefined;
    const beside = id === undefined ? pointBeside(host, event) : undefined;

    if (id !== undefined) {
      const point = pointAt(event, id);

      parts.setHolding(point.kind === SelectionKind.Gap);
      place(event, point);
    } else if (beside !== undefined) {
      parts.setHolding(true);
      place(event, beside);
    } else if (belowContent(event)) {
      event.preventDefault();
      root.focus({ preventScroll: true });

      caretAtEnd(host.state(), (tr) => {
        host.dispatch(tr, 'pointer');
      });
    }
  };

  const onWidgetMousedown = (event: MouseEvent): void => {
    const owner = widgetOwner(host.context, event.target);

    if (owner?.contentDOM !== null || event.button !== 0 || interactive(event.target, owner.dom)) {
      return;
    }

    parts.setHolding(true);
    place(event, pointAt(event, owner.node.id));
  };

  const onWidgetKeydown = (event: KeyboardEvent): void => {
    const owner = widgetOwner(host.context, event.target);
    const target = event.target;

    if (
      event.key !== Key.Escape ||
      event.defaultPrevented ||
      owner?.contentDOM !== null ||
      (target instanceof Element && target.closest('.nui-layer') !== null)
    ) {
      return;
    }
    event.preventDefault();
    root.focus({ preventScroll: true });
    host.dispatch(host.state().tr.setSelection({ kind: 'node', id: owner.node.id }), 'key');
  };

  const onMouseup = (): void => {
    if (!host.holding()) {
      return;
    }

    parts.setHolding(false);
    parts.sync.write();
  };

  const onSelectionchange = (): void => {
    if (!host.holding() && !widgetAround(host.context, doc.getSelection()?.focusNode ?? null)) {
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

  const selectedOwner = (target: EventTarget | null): boolean => {
    const { selection } = host.state();
    const owner = widgetOwner(host.context, target);

    return (
      selection.kind === SelectionKind.Node &&
      owner?.node.id === selection.id &&
      !interactive(target, owner.dom)
    );
  };

  const clipboard =
    <E extends Event>(handler: (event: E) => void) =>
    (event: E): void => {
      if (!widgetAround(host.context, event.target) || selectedOwner(event.target)) {
        handler(event);
      }
    };

  const keydown = own(onKeydown);
  const beforeinput = own(onBeforeinput);
  const paste = clipboard(onPaste);
  const copy = clipboard(onCopy);
  const drop = own(onDrop);
  const dragover = own(onDragover);
  const dragstart = own(onDragstart);
  const mousedown = own(onMousedown);
  const compositionstart = own(onCompositionstart);
  const compositionend = own(onCompositionend);

  root.addEventListener('keydown', keydown);
  root.addEventListener('keydown', onWidgetKeydown);
  root.addEventListener('beforeinput', beforeinput);
  root.addEventListener('paste', paste);
  root.addEventListener('copy', copy);
  root.addEventListener('cut', copy);
  root.addEventListener('drop', drop);
  root.addEventListener('drop', onWidgetDrop);
  root.addEventListener('dragover', onWidgetDrag);
  root.addEventListener('dragover', dragover);
  root.addEventListener('dragstart', dragstart);
  root.addEventListener('dragend', onDragend);
  root.addEventListener('mousedown', mousedown);
  root.addEventListener('mousedown', onWidgetMousedown);
  doc.addEventListener('mouseup', onMouseup);
  root.addEventListener('compositionstart', compositionstart);
  root.addEventListener('compositionend', compositionend);
  doc.addEventListener('selectionchange', onSelectionchange);

  return () => {
    root.removeEventListener('keydown', keydown);
    root.removeEventListener('keydown', onWidgetKeydown);
    root.removeEventListener('beforeinput', beforeinput);
    root.removeEventListener('paste', paste);
    root.removeEventListener('copy', copy);
    root.removeEventListener('cut', copy);
    root.removeEventListener('drop', drop);
    root.removeEventListener('drop', onWidgetDrop);
    root.removeEventListener('dragover', onWidgetDrag);
    root.removeEventListener('dragover', dragover);
    root.removeEventListener('dragstart', dragstart);
    root.removeEventListener('dragend', onDragend);
    root.removeEventListener('mousedown', mousedown);
    root.removeEventListener('mousedown', onWidgetMousedown);
    doc.removeEventListener('mouseup', onMouseup);
    root.removeEventListener('compositionstart', compositionstart);
    root.removeEventListener('compositionend', compositionend);
    doc.removeEventListener('selectionchange', onSelectionchange);
  };
};
