import { computed, ref, shallowRef, type ComputedRef, type Ref, type ShallowRef } from 'vue';
import type { NuiMenuEntry, NuiMenuFocus } from '@numior/vue';
import type { NuiTableMessages } from './table.messages';
import type {
  NuiTableContextMenu,
  NuiTableContextScope,
  NuiTableRanges,
  TableCellPosition,
} from './table.types';

export interface TableContextMenuOptions<T> {
  readonly enabled: () => boolean;
  readonly extra: () => NuiTableContextMenu<T> | undefined;
  readonly frame: () => HTMLElement | null;
  readonly anchor: () => HTMLElement | null;
  readonly viewport: () => HTMLElement | null;
  readonly headRows: () => number;
  readonly scopeOf: (
    target: TableCellPosition,
    ranges: NuiTableRanges,
  ) => NuiTableContextScope<T> | undefined;
  readonly select: (target: TableCellPosition) => NuiTableRanges;
  readonly copyable: () => boolean;
  readonly copy: (headers: boolean) => void;
  readonly editable: () => boolean;
  readonly clearable: () => boolean;
  readonly cut: () => void;
  readonly clear: () => void;
  readonly show: (focus: NuiMenuFocus | undefined) => void;
  readonly isRtl: () => boolean;
  readonly messages: ComputedRef<NuiTableMessages>;
}

export interface TableContextMenu {
  readonly open: Ref<boolean>;
  readonly target: Readonly<ShallowRef<HTMLElement | null>>;
  readonly items: ComputedRef<readonly NuiMenuEntry[]>;
  onContextmenu(event: MouseEvent): void;
  onLongPress(event: PointerEvent): boolean;
  onKeydown(event: KeyboardEvent): boolean;
}

const DATA_CELL =
  ':is(.nui-table__pinned, .nui-table__body) > [role="row"]:not(.nui-table__row--group) > .nui-table__cell--data';

const TOUCH_GAP = 16;

const isMenuKey = (event: KeyboardEvent): boolean =>
  event.key === 'ContextMenu' || (event.key === 'F10' && event.shiftKey);

const afterRelease = (event: MouseEvent, action: () => void): void => {
  if (event.buttons === 0) {
    action();
    return;
  }

  const released = (): void => {
    window.removeEventListener('pointerup', released, true);
    window.removeEventListener('pointercancel', released, true);
    window.setTimeout(action, 0);
  };

  window.addEventListener('pointerup', released, true);
  window.addEventListener('pointercancel', released, true);
};

export const useTableContextMenu = <T>(options: TableContextMenuOptions<T>): TableContextMenu => {
  const open = ref(false);
  const target = shallowRef<HTMLElement | null>(null);
  const scope = shallowRef<NuiTableContextScope<T>>();

  const positionOf = (cell: Element): TableCellPosition => ({
    row: Number(cell.parentElement?.getAttribute('aria-rowindex')) - options.headRows() - 1,
    col: Number(cell.getAttribute('aria-colindex')) - 1,
  });

  const cellOf = (node: EventTarget | null): HTMLElement | null => {
    const cell = node instanceof Element ? node.closest(DATA_CELL) : null;
    return cell instanceof HTMLElement && options.viewport()?.contains(cell) === true ? cell : null;
  };

  const place = (x: number, y: number): HTMLElement | null => {
    const frame = options.frame();
    const anchor = options.anchor();

    if (frame === null || anchor === null) {
      return null;
    }
    const rect = frame.getBoundingClientRect();

    anchor.style.setProperty('inset-block-start', `${y - rect.top}px`);

    anchor.style.setProperty(
      'inset-inline-start',
      `${options.isRtl() ? rect.right - x : x - rect.left}px`,
    );

    return anchor;
  };

  const prepare = (cell: HTMLElement, anchor: HTMLElement | null): boolean => {
    const position = positionOf(cell);

    if (anchor === null) {
      return false;
    }

    const next = options.scopeOf(position, options.select(position));

    if (next === undefined) {
      return false;
    }
    scope.value = next;
    target.value = anchor;
    return true;
  };

  const openAtPoint = (event: MouseEvent, gap: number): boolean => {
    const cell = cellOf(event.target);

    if (!options.enabled() || cell === null) {
      return false;
    }
    event.preventDefault();

    if (!prepare(cell, place(event.clientX, event.clientY + gap))) {
      return false;
    }

    afterRelease(event, () => {
      options.show(undefined);
    });

    return true;
  };

  const items = computed<readonly NuiMenuEntry[]>(() => {
    const current = scope.value;
    const texts = options.messages.value;

    if (current === undefined) {
      return [];
    }
    const copyable = options.copyable();
    const extra = options.extra()?.(current) ?? [];
    const editable = options.editable();
    const clearable = editable && options.clearable();

    const cut: NuiMenuEntry[] = editable
      ? [
          {
            key: 'cut',
            label: texts.menuCut,
            disabled: !copyable || !clearable,
            onSelect: options.cut,
          },
        ]
      : [];

    const clear: NuiMenuEntry[] = editable
      ? [{ key: 'clear', label: texts.menuClear, disabled: !clearable, onSelect: options.clear }]
      : [];

    const own: NuiMenuEntry[] = [
      ...cut,
      {
        key: 'copy',
        label: texts.menuCopy,
        disabled: !copyable,
        onSelect: () => {
          options.copy(false);
        },
      },
      {
        key: 'copy-headers',
        label: texts.menuCopyWithHeaders,
        disabled: !copyable,
        onSelect: () => {
          options.copy(true);
        },
      },
      ...clear,
    ];

    return extra.length === 0 ? own : [...own, { type: 'separator', key: 'extra' }, ...extra];
  });

  return {
    open,
    target,
    items,
    onContextmenu: (event) => {
      openAtPoint(event, 0);
    },
    onLongPress: (event) => event.pointerType !== 'mouse' && openAtPoint(event, TOUCH_GAP),
    onKeydown: (event) => {
      const cell = event.target instanceof HTMLElement ? cellOf(event.target) : null;

      if (!isMenuKey(event) || !options.enabled() || cell === null || cell !== event.target) {
        return false;
      }
      event.preventDefault();

      if (!prepare(cell, cell)) {
        return false;
      }
      options.show('first');
      return true;
    },
  };
};
