import { Key } from '@numior/primitives';
import { computed, shallowRef } from 'vue';
import {
  DrawingKind,
  StepKind,
  canEditDrawing,
  placeDrawing,
  removeDrawing,
  type DrawingAnchor,
  type SheetLayout,
} from '../../core';
import { lineSizesOf } from '../sheet-cells';
import type { FrameGrip } from '../sheet.types';
import { allEdges, boxOfAnchor, edgesOf, movedAnchor, spanOf } from './drawing-box';
import {
  ShownDrawingKind,
  type DrawingBox,
  type DrawingEdit,
  type DrawingEditOptions,
  type DrawingMoving,
  type LineSizes,
  type ShownDrawing,
} from './drawings.types';

interface Session {
  readonly id: string;
  readonly grip: FrameGrip | undefined;
  readonly anchor: DrawingAnchor;
  readonly box: DrawingBox;
  readonly picture: boolean;
  readonly x: number;
  readonly y: number;
  readonly left: number;
  readonly top: number;
  readonly sizes: LineSizes;
  moved: boolean;
  latest: DrawingAnchor | undefined;
}

const PRIMARY_BUTTON = 0;

const DRAG_THRESHOLD = 3;

const TOUCH = 'touch';

const SETTINGS_PANEL = '.nui-spreadsheet-chart-settings';

const DRAWING_PARTS = `.nui-spreadsheet__drawing, .nui-spreadsheet__handle, .nui-spreadsheet__drawing-tools, ${SETTINGS_PANEL}`;

const NUDGES: ReadonlyMap<string, readonly [number, number]> = new Map([
  [Key.ArrowLeft, [-1, 0]],
  [Key.ArrowRight, [1, 0]],
  [Key.ArrowUp, [0, -1]],
  [Key.ArrowDown, [0, 1]],
]);

const isDrawingTarget = (target: EventTarget | null): boolean =>
  target instanceof Element && target.closest(DRAWING_PARTS) !== null;

const inSettings = (target: EventTarget | null): boolean =>
  target instanceof Element && target.closest(SETTINGS_PANEL) !== null;

const nameOf = (shown: ShownDrawing): string =>
  shown.drawing.name === '' ? shown.label : shown.drawing.name;

const consume = (event: KeyboardEvent): void => {
  event.preventDefault();
  event.stopPropagation();
};

export const useSheetDrawingEdit = (options: DrawingEditOptions): DrawingEdit => {
  let session: Session | undefined;

  const selectedId = shallowRef<string>();

  const moving = shallowRef<DrawingMoving>();

  const dragging = shallowRef(false);

  const editable = computed(() => !options.readonly() && options.editing.draft.value === undefined);

  const selected = computed(() =>
    options.drawings().find((shown) => shown.drawing.id === selectedId.value),
  );

  const canEdit = (shown: ShownDrawing): boolean => {
    const sheet = options.sheet();

    return editable.value && sheet !== undefined && canEditDrawing(sheet.layout, shown.drawing);
  };

  const write = (change: (layout: SheetLayout) => SheetLayout): boolean => {
    const sheet = options.sheet();

    return (
      sheet !== undefined &&
      options.editing.apply([
        { kind: StepKind.SetLayout, sheet: sheet.name, layout: change(sheet.layout) },
      ])
    );
  };

  const select = (shown: ShownDrawing): void => {
    if (canEdit(shown) && selectedId.value !== shown.drawing.id) {
      selectedId.value = shown.drawing.id;
      options.announce(options.messages().drawingSelected({ label: nameOf(shown) }));
      options.focus();
    }
  };

  const selectNew = (id: string, name: string): void => {
    selectedId.value = id;
    options.announce(options.messages().drawingSelected({ label: name }));
    options.focus();
  };

  const deselect = (): void => {
    selectedId.value = undefined;
  };

  const openSettings = (shown: ShownDrawing): void => {
    if (shown.kind === ShownDrawingKind.Chart && canEdit(shown)) {
      select(shown);
      options.openSettings();
    }
  };

  const begin = (event: PointerEvent, shown: ShownDrawing, grip: FrameGrip | undefined): void => {
    const sheet = options.sheet();
    const scroll = options.table.value?.scrollPosition();

    if (sheet === undefined || scroll === undefined) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    options.root.value?.setPointerCapture(event.pointerId);

    const sizes = lineSizesOf(sheet);

    session = {
      id: shown.drawing.id,
      grip,
      anchor: shown.drawing.anchor,
      box: boxOfAnchor(shown.drawing.anchor, sizes),
      picture: shown.drawing.content.kind === DrawingKind.Picture,
      x: event.clientX,
      y: event.clientY,
      left: scroll.left,
      top: scroll.top,
      sizes,
      moved: false,
      latest: undefined,
    };
  };

  const onDown = (event: PointerEvent, shown: ShownDrawing): void => {
    if (
      event.button !== PRIMARY_BUTTON ||
      !canEdit(shown) ||
      (event.pointerType === TOUCH && selectedId.value !== shown.drawing.id)
    ) {
      return;
    }
    select(shown);
    begin(event, shown, undefined);
  };

  const onGripDown = (event: PointerEvent, shown: ShownDrawing, grip: FrameGrip): void => {
    if (event.button === PRIMARY_BUTTON && canEdit(shown)) {
      begin(event, shown, grip);
    }
  };

  const dragTo = (x: number, y: number, keepRatio: boolean): void => {
    const current = session;
    const scroll = options.table.value?.scrollPosition();

    if (current === undefined || scroll === undefined) {
      return;
    }

    const across = x - current.x + scroll.left - current.left;
    const down = y - current.y + scroll.top - current.top;

    if (!current.moved && Math.hypot(across, down) < DRAG_THRESHOLD) {
      return;
    }
    current.moved = true;
    dragging.value = true;

    const edges = edgesOf(current.grip, options.rtl() ? -across : across, down, {
      box: current.box,
      keepRatio: keepRatio && current.picture,
    });

    current.latest = movedAnchor(current.anchor, edges, current.sizes);
    moving.value = { id: current.id, span: spanOf(current.latest, current.sizes) };
  };

  const onMove = (event: PointerEvent): void => {
    const { clientX: x, clientY: y, shiftKey } = event;

    if (session === undefined) {
      return;
    }
    dragTo(x, y, shiftKey);

    options.table.value?.followEdge(x, y, () => {
      dragTo(x, y, shiftKey);
    });
  };

  const finish = (): Session | undefined => {
    const ended = session;

    if (ended !== undefined) {
      session = undefined;
      dragging.value = false;
      moving.value = undefined;
      options.table.value?.stopEdge();
    }
    return ended;
  };

  const onUp = (): void => {
    const ended = finish();

    if (ended?.moved === true && ended.latest !== undefined) {
      const { id, latest } = ended;

      write((layout) => placeDrawing(layout, id, latest));
    }
  };

  const onCancel = (): void => {
    finish();
  };

  const onRootDown = (event: PointerEvent): void => {
    if (selectedId.value !== undefined && !isDrawingTarget(event.target)) {
      deselect();
    }
  };

  const nudge = (shown: ShownDrawing, across: number, down: number, whole: boolean): void => {
    const sheet = options.sheet();

    if (sheet === undefined) {
      return;
    }

    const sizes = lineSizesOf(sheet);
    const { from } = shown.span;
    const x = whole ? across * sizes.width(from.col) : across;
    const y = whole ? down * sizes.height(from.row) : down;
    const box = boxOfAnchor(shown.drawing.anchor, sizes);
    const edges = allEdges(Math.max(options.rtl() ? -x : x, -box.x), Math.max(y, -box.y));
    const anchor = movedAnchor(shown.drawing.anchor, edges, sizes);

    write((layout) => placeDrawing(layout, shown.drawing.id, anchor));
  };

  const cycle = (shown: ShownDrawing, backwards: boolean): void => {
    const list = options.drawings().filter(canEdit);
    const at = list.indexOf(shown);
    const next = list[(at + (backwards ? -1 : 1) + list.length) % list.length];

    if (next !== undefined) {
      select(next);
    }
  };

  const remove = (shown: ShownDrawing): void => {
    if (write((layout) => removeDrawing(layout, shown.drawing.id))) {
      deselect();
      options.announce(options.messages().drawingRemoved({ label: nameOf(shown) }));
    }
  };

  const onSelectedKey = (event: KeyboardEvent, shown: ShownDrawing): boolean => {
    const step = NUDGES.get(event.key);

    if (step !== undefined) {
      nudge(shown, step[0], step[1], event.shiftKey);
      return true;
    }

    switch (event.key) {
      case Key.Delete:
      case Key.Backspace:
        remove(shown);
        return true;
      case Key.Escape:
        finish();
        deselect();
        return true;
      case Key.Tab:
        cycle(shown, event.shiftKey);
        return true;
      case Key.Enter:
        openSettings(shown);
        return shown.kind === ShownDrawingKind.Chart;
      default:
        return false;
    }
  };

  const onKeydown = (event: KeyboardEvent): void => {
    const shown = selected.value;

    if (inSettings(event.target)) {
      return;
    }
    if (shown === undefined) {
      const [first] = options.drawings().filter(canEdit);

      if (event.key === Key.F10 && event.altKey && first !== undefined) {
        consume(event);
        select(first);
      }
      return;
    }
    if (event.ctrlKey || event.metaKey) {
      return;
    }
    if (onSelectedKey(event, shown)) {
      consume(event);
    } else if (event.key.length === 1) {
      deselect();
    }
  };

  return {
    selectedId,
    moving,
    dragging,
    editable,
    selected,
    select,
    selectNew,
    deselect,
    openSettings,
    onDown,
    onGripDown,
    onMove,
    onUp,
    onCancel,
    onRootDown,
    onKeydown,
  };
};
