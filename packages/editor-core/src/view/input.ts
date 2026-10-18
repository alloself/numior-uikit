import { caretAtEnd } from '../commands/blocks';
import { isAtom } from '../commands/atoms';
import { intentCommand, selectAtom } from '../commands/input';
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
import { descAround, widgetAround, widgetOwner } from './desc';
import type { DomWatch } from './dom-change';
import type { ViewHost } from './host.types';
import { posAtDOM } from './positions';
import type { SelectionSync } from './selection-sync';
import { atomBeside } from './beside';
import { atomAcross } from './vertical';

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

const transferred = (data: DataTransfer | null): InputIntent | undefined => {
  const text = data?.getData('text/plain') ?? '';
  const files = [...(data?.files ?? [])];

  return files.length > 0 && text === ''
    ? { kind: 'files', files }
    : pasted(text, data?.getData('text/html'));
};

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
    case 'files':
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

  const across = arrow.vertical ? atomAcross(host, forward) : undefined;

  if (across !== undefined) {
    host.dispatch(state.tr.setSelection({ kind: 'node', id: across }), 'key');
    return true;
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

  if (selection.kind !== 'text' || selection.anchor !== selection.head) {
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
    intent !== undefined && atTextEdge(host, event.key === 'Backspace') && runIntent(host, intent)
  );
};

const editNode = (host: ViewHost, event: KeyboardEvent): boolean => {
  const intent = host.state().selection.kind === 'node' ? overNode(event) : undefined;

  return intent !== undefined && runIntent(host, intent);
};

const handleKey = (host: ViewHost, event: KeyboardEvent): boolean => {
  const key = keyOf(event);
  const state = host.state();

  const dispatch = (tr: Transaction): void => {
    host.dispatch(tr, 'key');
  };

  return (
    state.plugins.some((plugin) => plugin.props.handleKey?.(key, state, dispatch) === true) ||
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
    let current = (desc?.kind === 'text' ? desc.parent : desc) ?? null;
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
    const slice = state.doc.slice(range.from, range.to);

    event.preventDefault();
    event.clipboardData.setData('text/plain', state.doc.textBetween(range.from, range.to, '\n'));
    event.clipboardData.setData('text/html', clipboardHTML(state.doc.schema, slice.content));
    if (event.type === 'cut' && root.getAttribute('contenteditable') === 'true') {
      runIntent(host, { kind: 'delete', direction: 'backward', unit: 'character' });
    }
  };

  const onDrop = (event: DragEvent): void => {
    const intent = transferred(event.dataTransfer);

    const pos = posAtCoords(host, event.clientX, event.clientY);
    const state = host.state();

    event.preventDefault();
    if (intent === undefined || pos === undefined) {
      return;
    }
    host.dispatch(state.tr.setSelection(nearestCursor(state.doc, pos)), 'pointer');
    runIntent(host, intent);
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

  const selectNode = (event: MouseEvent, id: string): void => {
    event.preventDefault();
    root.focus({ preventScroll: true });
    host.dispatch(host.state().tr.setSelection({ kind: 'node', id }), 'pointer');
  };

  const belowContent = (event: MouseEvent): boolean => {
    const last = host.state().doc.root.content.at(-1);
    const dom = last?.kind === 'element' ? host.context.byId.get(last.id)?.dom : undefined;
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
    const beside = id === undefined ? atomBeside(host.context, root, event) : undefined;

    if (id !== undefined) {
      selectNode(event, id);
    } else if (beside !== undefined) {
      parts.setHolding(true);
      selectNode(event, beside);
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

    if (owner?.contentDOM === null && event.button === 0 && !interactive(event.target, owner.dom)) {
      parts.setHolding(true);
      selectNode(event, owner.node.id);
    }
  };

  const onWidgetKeydown = (event: KeyboardEvent): void => {
    const owner = widgetOwner(host.context, event.target);
    const target = event.target;

    if (
      event.key !== 'Escape' ||
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
    if (host.holding()) {
      parts.setHolding(false);
      parts.sync.write();
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
      selection.kind === 'node' &&
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
  const drag = own(onDrag);
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
  root.addEventListener('dragover', drag);
  root.addEventListener('dragstart', drag);
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
    root.removeEventListener('dragover', drag);
    root.removeEventListener('dragstart', drag);
    root.removeEventListener('mousedown', mousedown);
    root.removeEventListener('mousedown', onWidgetMousedown);
    doc.removeEventListener('mouseup', onMouseup);
    root.removeEventListener('compositionstart', compositionstart);
    root.removeEventListener('compositionend', compositionend);
    doc.removeEventListener('selectionchange', onSelectionchange);
  };
};
