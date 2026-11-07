import { RefreshCw, Sheet as SheetIcon, TableProperties } from '@lucide/vue';
import { FloatingPlacement, useLocale, useMessages } from '@numior/primitives';
import type { NuiTableOverlaySlot, NuiTableRect } from '@numior/table';
import type { NuiMenuEntry } from '@numior/vue';
import { useMediaQuery } from '@vueuse/core';
import { computed, markRaw, shallowRef, watch } from 'vue';
import {
  CellValueKind,
  PivotLanguage,
  PivotSourceKind,
  StepKind,
  containsCell,
  currentRegion,
  emptyPivot,
  pivotFieldItems,
  pivotKey,
  pivotSourceFields,
  renderValue,
  type CellRange,
  type CellValue,
  type PivotDefinition,
  type PivotSource,
  type PivotSourceField,
  type Sheet,
  type SheetPivot,
  type Workbook,
} from '../../core';
import { tableRangeOf } from '../use-sheet-selection';
import { useSheetPopover } from '../use-sheet-popover';
import { spreadsheetPivotMessages } from './pivot-panel.messages';
import type {
  PivotItemView,
  PivotTarget,
  SheetPivots,
  SheetPivotsOptions,
} from './pivot-panel.types';

const INSERT_ICON = markRaw(SheetIcon);

const FIELDS_ICON = markRaw(TableProperties);

const REFRESH_ICON = markRaw(RefreshCw);

const ANCHOR = { row: 2, col: 0 } as const;

const WIDE_SCREEN = '(min-width: 48rem)';

const freeName = (taken: ReadonlySet<string>, name: (index: number) => string): string => {
  let index = 1;

  while (taken.has(name(index).toLowerCase())) {
    index += 1;
  }
  return name(index);
};

const pivotNames = (book: Workbook): Set<string> => {
  const names = new Set<string>();

  book.pivots.forEach((pivot) => {
    names.add(pivot.name.toLowerCase());
  });

  return names;
};

const isSingle = (range: CellRange): boolean =>
  range.top === range.bottom && range.left === range.right;

export const useSheetPivots = (options: SheetPivotsOptions): SheetPivots => {
  const texts = useMessages(spreadsheetPivotMessages);

  const locale = useLocale(() => undefined);

  const target = shallowRef<PivotTarget>();

  const held = shallowRef<CellRange>();

  const language = (): PivotLanguage =>
    locale.value.startsWith('ru') ? PivotLanguage.Ru : PivotLanguage.En;

  const popover = useSheetPopover({
    focusStart: options.focusPanel,
    closed: () => {
      target.value = undefined;
      held.value = undefined;
    },
    back: () => options.formula.backToGrid(),
  });

  const wide = useMediaQuery(WIDE_SCREEN);

  const placement = computed(() =>
    wide.value ? FloatingPlacement.RightStart : FloatingPlacement.BottomStart,
  );

  const pivot = computed((): SheetPivot | undefined => {
    const current = target.value;

    return current === undefined || options.editing.revision.value < 0
      ? undefined
      : options.book().pivots.get(current.sheet, current.name);
  });

  const definition = computed(() => pivot.value?.definition);

  const fields = computed((): readonly PivotSourceField[] | undefined => {
    const current = definition.value;

    return current === undefined ? undefined : pivotSourceFields(options.book(), current.source);
  });

  const pivotAtActive = (): SheetPivot | undefined => {
    const sheet = options.sheet();
    const active = options.selection.current.value?.active;

    return sheet === undefined || active === undefined
      ? undefined
      : options
          .book()
          .pivots.on(sheet)
          .find(
            (each) =>
              each.footprint !== undefined && containsCell(each.footprint, active.row, active.col),
          );
  };

  const announce = (text: string): void => {
    options.formula.announcement.value = text;
  };

  const sourceOf = (sheet: Sheet): PivotSource | undefined => {
    const selection = options.selection.current.value;
    const picked = selection?.ranges[0];

    if (selection === undefined || picked === undefined) {
      return undefined;
    }

    const range = isSingle(picked)
      ? currentRegion(sheet.cells, selection.active.row, selection.active.col)
      : picked;

    return range.bottom > range.top
      ? { kind: PivotSourceKind.Range, sheet: sheet.name, range }
      : undefined;
  };

  const open = (found: SheetPivot): void => {
    target.value = { sheet: found.sheet, name: found.name };
    held.value = found.footprint;
    popover.show();
  };

  const insert = (): void => {
    const book = options.book();
    const sheet = options.sheet();
    const source = sheet === undefined ? undefined : sourceOf(sheet);

    if (
      sheet === undefined ||
      source === undefined ||
      pivotSourceFields(book, source) === undefined
    ) {
      announce(texts.value.noSource);
      return;
    }

    const index = book.sheets.indexOf(sheet);
    const taken = new Set(book.sheets.map((each) => each.name.toLowerCase()));
    const sheetName = freeName(taken, (at) => texts.value.pivotSheet({ index: at }));
    const name = freeName(pivotNames(book), (at) => texts.value.pivotName({ index: at }));

    const applied = options.editing.apply([
      { kind: StepKind.AddSheet, name: sheetName, index },
      {
        kind: StepKind.SetPivot,
        sheet: sheetName,
        name,
        pivot: { anchor: ANCHOR, definition: emptyPivot(source, language()) },
      },
    ]);

    const created = book.sheet(sheetName);

    if (!applied || created === undefined) {
      announce(texts.value.refused);
      return;
    }

    options.sheetIndex.value = book.sheets.indexOf(created);
    options.formula.ranges.value = [];
    options.formula.active.value = { ...ANCHOR };
    target.value = { sheet: created, name };
    held.value = book.pivots.get(created, name)?.footprint;
    popover.show();
  };

  const refresh = (found: SheetPivot): void => {
    const applied = options.editing.apply([
      { kind: StepKind.RefreshPivot, sheet: found.sheet.name, name: found.name },
    ]);

    announce(applied ? texts.value.refreshed : texts.value.refused);
  };

  const tools = (): readonly NuiMenuEntry[] => {
    if (options.readonly()) {
      return [];
    }

    const found = pivotAtActive();

    if (found === undefined) {
      return [
        {
          key: 'pivot-insert',
          label: texts.value.insertPivot,
          icon: INSERT_ICON,
          onSelect: insert,
        },
      ];
    }
    return [
      {
        key: 'pivot-fields',
        label: texts.value.pivotFields,
        icon: FIELDS_ICON,
        onSelect: () => open(found),
      },
      {
        key: 'pivot-refresh',
        label: texts.value.refreshPivot,
        icon: REFRESH_ICON,
        onSelect: () => refresh(found),
      },
    ];
  };

  const rect = (rectOf: NuiTableOverlaySlot['rectOf']): NuiTableRect | undefined => {
    const cells = options.cells();
    const current = pivot.value;
    const footprint = held.value ?? current?.footprint;

    if (
      cells === undefined ||
      current === undefined ||
      footprint === undefined ||
      current.sheet.id !== options.sheet()?.id
    ) {
      return undefined;
    }

    const area = wide.value
      ? footprint
      : { top: footprint.top, left: footprint.left, bottom: footprint.top, right: footprint.left };

    return rectOf(tableRangeOf(cells, area));
  };

  const change = (next: PivotDefinition): void => {
    const current = pivot.value;

    if (current === undefined) {
      return;
    }

    const applied = options.editing.apply([
      {
        kind: StepKind.SetPivot,
        sheet: current.sheet.name,
        name: current.name,
        pivot: { anchor: current.anchor, definition: next },
      },
    ]);

    if (!applied) {
      announce(texts.value.refused);
    }
  };

  watch(pivot, (next) => {
    if (next === undefined && popover.open.value) {
      popover.hide();
    }
  });

  const panel = computed((): PivotDefinition | undefined =>
    popover.shown.value ? definition.value : undefined,
  );

  const format = (value: CellValue, code: string): string =>
    renderValue(value, code, options.locale().numbers)?.text ?? '';

  const items = (field: number): readonly PivotItemView[] | undefined => {
    const current = definition.value;

    const values =
      current === undefined ? undefined : pivotFieldItems(options.book(), current, field);

    return values?.map((value) => ({
      key: pivotKey(value),
      value,
      label:
        value.kind === CellValueKind.Empty ? (current?.captions.blank ?? '') : format(value, ''),
    }));
  };

  return { popover, definition, fields, placement, panel, items, format, tools, rect, change };
};
