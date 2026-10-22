import type { CellValue } from '../cell.types';
import { EMPTY, textValue } from '../values';
import { pivotKey } from './pivot-cache';
import { VALUES_FIELD, dataIndexOf, normalizedPivot } from './pivot-engine';
import type {
  PivotCache,
  PivotCell,
  PivotDefinition,
  PivotLine,
  PivotOutput,
  PivotResult,
} from './pivot.types';

interface Grid {
  readonly cells: PivotCell[];
  readonly top: number;
}

interface Labels {
  readonly definition: PivotDefinition;
  readonly cache: PivotCache;
}

const PERCENT = '0.00%';

const RATIOS = new Set([
  'percentOfTotal',
  'percentOfRow',
  'percentOfCol',
  'index',
  'percent',
  'percentDiff',
]);

const put = (grid: Grid, row: number, col: number, value: CellValue, format?: string): void => {
  if (value.kind !== 'empty') {
    grid.cells.push({ row: grid.top + row, col, value, format });
  }
};

const fieldName = (labels: Labels, field: number): string =>
  field === VALUES_FIELD
    ? labels.definition.captions.values
    : (labels.cache.fields[field]?.name ?? '');

const itemLabel = (
  labels: Labels,
  levels: readonly number[],
  line: PivotLine,
  level: number,
): CellValue => {
  const field = levels[level] ?? VALUES_FIELD;
  const item = line.items[level] ?? 0;

  if (field === VALUES_FIELD) {
    return textValue(labels.definition.values[item]?.name ?? '');
  }

  const value = labels.cache.group(field)?.items[item] ?? EMPTY;

  return value.kind === 'empty' ? textValue(labels.definition.captions.blank) : value;
};

const labelText = (value: CellValue): string =>
  value.kind === 'string' || value.kind === 'number' ? String(value.value) : '';

const closingLabel = (labels: Labels, levels: readonly number[], line: PivotLine): CellValue => {
  const { captions, values } = labels.definition;
  const expanded = levels.includes(VALUES_FIELD) && values.length > 1;
  const name = values[line.value]?.name ?? '';

  if (line.kind === 'grand') {
    return textValue(expanded ? `${captions.total} ${name}` : captions.grandTotal);
  }

  const item = labelText(itemLabel(labels, levels, line, line.depth));

  return textValue(
    expanded && !levels.slice(0, line.depth + 1).includes(VALUES_FIELD)
      ? `${item} ${name}`
      : `${item} ${captions.total}`,
  );
};

const changedFrom = (previous: PivotLine | undefined, line: PivotLine, level: number): boolean =>
  previous === undefined ||
  line.items.slice(0, level + 1).some((item, index) => previous.items[index] !== item);

const formatOf = (
  definition: PivotDefinition,
  row: PivotLine,
  col: PivotLine,
): string | undefined => {
  const value = definition.values[dataIndexOf(definition, row, col)];

  if (value === undefined) {
    return undefined;
  }
  return value.format ?? (RATIOS.has(value.showAs.kind) ? PERCENT : undefined);
};

const filterArea = (labels: Labels, grid: Grid): void => {
  const { definition } = labels;

  definition.filters.forEach((filter, index) => {
    const hidden = definition.fields[filter.field]?.hidden.length ?? 0;

    const selected =
      filter.selected === undefined
        ? textValue(hidden > 0 ? definition.captions.multiple : definition.captions.all)
        : (labels.cache
            .group(filter.field)
            ?.items.find((item) => pivotKey(item) === pivotKey(filter.selected ?? EMPTY)) ??
          filter.selected);

    grid.cells.push({
      row: index,
      col: 0,
      value: textValue(fieldName(labels, filter.field)),
      format: undefined,
    });

    grid.cells.push({
      row: index,
      col: 1,
      value: selected.kind === 'empty' ? textValue(definition.captions.blank) : selected,
      format: undefined,
    });
  });
};

const columnHeaders = (labels: Labels, grid: Grid, result: PivotResult, at: number): void => {
  const levels = labels.definition.columns;
  let previous: PivotLine | undefined;

  result.columns.forEach((line, index) => {
    const col = at + index;

    if (line.kind === 'item') {
      levels.forEach((_, level) => {
        if (changedFrom(previous, line, level)) {
          put(grid, 1 + level, col, itemLabel(labels, levels, line, level));
        }
      });

      previous = line;
      return;
    }
    put(grid, line.kind === 'grand' ? 1 : 1 + line.depth, col, closingLabel(labels, levels, line));
  });
};

const rowLabels = (labels: Labels, grid: Grid, result: PivotResult, header: number): void => {
  const { definition } = labels;
  const levels = definition.rows;
  const compact = definition.layout === 'compact';
  let previous: PivotLine | undefined;

  result.rows.forEach((line, index) => {
    const row = header + index;

    if (line.kind === 'grand' || line.kind === 'subtotal') {
      put(
        grid,
        row,
        compact || line.kind === 'grand' ? 0 : line.depth,
        closingLabel(labels, levels, line),
      );

      return;
    }
    if (line.depth < 0) {
      return;
    }
    if (definition.layout === 'tabular') {
      levels.slice(0, line.depth + 1).forEach((_, level) => {
        if (changedFrom(previous, line, level)) {
          put(grid, row, level, itemLabel(labels, levels, line, level));
        }
      });

      previous = line;
      return;
    }
    put(grid, row, compact ? 0 : line.depth, itemLabel(labels, levels, line, line.depth));
  });
};

const headerArea = (
  labels: Labels,
  grid: Grid,
  shape: { readonly header: number; readonly labelCols: number },
): void => {
  const { definition } = labels;
  const { header, labelCols } = shape;
  const single = definition.values.length === 1 ? definition.values[0]?.name : undefined;
  const firstColumn = definition.columns[0];

  if (definition.columns.length > 0) {
    put(grid, 0, 0, single === undefined ? EMPTY : textValue(single));

    const caption =
      definition.layout === 'compact'
        ? definition.columns.length === 1 && firstColumn === VALUES_FIELD
          ? definition.captions.values
          : definition.captions.columns
        : fieldName(labels, firstColumn ?? VALUES_FIELD);

    put(grid, 0, labelCols, textValue(caption));
  } else if (single !== undefined) {
    put(grid, 0, labelCols, textValue(single));
  }

  if (definition.rows.length === 0) {
    return;
  }
  if (definition.layout === 'compact') {
    put(grid, header - 1, 0, textValue(definition.captions.rows));
    return;
  }

  definition.rows.forEach((field, level) => {
    put(grid, header - 1, level, textValue(fieldName(labels, field)));
  });
};

export const renderPivot = (
  input: PivotDefinition,
  cache: PivotCache,
  result: PivotResult,
): PivotOutput => {
  const definition = normalizedPivot(input);
  const labels: Labels = { definition, cache };
  const pageRows = definition.filters.length === 0 ? 0 : definition.filters.length + 1;
  const grid: Grid = { cells: [], top: pageRows };
  const rowLevels = definition.rows.length;

  const labelCols =
    rowLevels > 0
      ? definition.layout === 'compact'
        ? 1
        : rowLevels
      : Number(definition.columns.length > 0);

  const header = 1 + definition.columns.length;

  filterArea(labels, { cells: grid.cells, top: 0 });
  headerArea(labels, grid, { header, labelCols });
  columnHeaders(labels, grid, result, labelCols);
  rowLabels(labels, grid, result, header);

  result.rows.forEach((row, index) => {
    result.columns.forEach((col, offset) => {
      put(
        grid,
        header + index,
        labelCols + offset,
        result.cells[index]?.[offset] ?? EMPTY,
        formatOf(definition, row, col),
      );
    });
  });

  return {
    cells: grid.cells,
    size: {
      row: pageRows + header + result.rows.length,
      col: Math.max(labelCols + result.columns.length, pageRows > 0 ? 2 : 0),
    },
    firstHeaderRow: 1,
    firstDataRow: header,
    firstDataCol: labelCols,
    pageRows,
  };
};
