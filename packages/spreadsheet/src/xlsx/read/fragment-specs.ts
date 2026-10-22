import type { ElementSpec, ElementSpecs, SlotSpec } from './fragment.types';
import { X14 } from './conditional-part';
import { MAIN } from './ooxml';

const SPACES: ReadonlyMap<string, string> = new Map([
  [X14, 'x14'],
  ['http://schemas.microsoft.com/office/excel/2006/main', 'xm'],
  ['http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing', 'xdr'],
  ['http://schemas.openxmlformats.org/drawingml/2006/chart', 'c'],
  ['http://schemas.microsoft.com/office/drawing/2012/chart', 'c15'],
  ['urn:schemas-microsoft-com:vml', 'v'],
  ['urn:schemas-microsoft-com:office:excel', 'x'],
  ['http://schemas.microsoft.com/office/spreadsheetml/2018/threadedcomments', 'tc'],
]);

const DROP_RANGES: SlotSpec = { kind: 'ranges', policy: 'drop' };

const FORMULA: SlotSpec = { kind: 'formula' };

const COUNT: SlotSpec = { kind: 'count' };

const DROP_CELL: SlotSpec = { kind: 'cell', policy: 'drop' };

const GROUP: ElementSpec = { fragment: 'group' };

const BREAKS: ElementSpec = {
  fragment: 'group',
  attributes: { count: COUNT, manualBreakCount: COUNT },
};

const itemWith = (name: string, slot: SlotSpec): ElementSpec => ({
  fragment: 'item',
  attributes: { [name]: slot },
});

export const spaceOf = (uri: string): string =>
  MAIN.has(uri) ? 'main' : (SPACES.get(uri) ?? 'other');

export const SHEET_SPECS: ElementSpecs = {
  'main:sheetView': { fragment: 'item' },
  'main:pane': {
    attributes: {
      topLeftCell: { kind: 'cell', policy: 'clamp' },
      xSplit: { kind: 'split', axis: 'cols' },
      ySplit: { kind: 'split', axis: 'rows' },
    },
  },
  'main:selection': {
    attributes: {
      activeCell: { kind: 'cell', policy: 'clamp' },
      sqref: { kind: 'ranges', policy: 'clamp' },
    },
  },
  'main:dataValidations': { fragment: 'group', attributes: { count: COUNT } },
  'main:dataValidation': itemWith('sqref', DROP_RANGES),
  'main:formula1': { text: FORMULA },
  'main:formula2': { text: FORMULA },
  'main:hyperlinks': GROUP,
  'main:hyperlink': { fragment: 'item', attributes: { ref: DROP_RANGES, location: FORMULA } },
  'main:protectedRanges': GROUP,
  'main:protectedRange': itemWith('sqref', DROP_RANGES),
  'main:ignoredErrors': GROUP,
  'main:ignoredError': itemWith('sqref', DROP_RANGES),
  'main:rowBreaks': BREAKS,
  'main:colBreaks': BREAKS,
  'main:brk': itemWith('id', { kind: 'line', base: 0, policy: 'drop' }),
  'main:cellWatches': GROUP,
  'main:cellWatch': itemWith('r', DROP_CELL),
  'main:autoFilter': itemWith('ref', DROP_RANGES),
  'main:filterColumn': itemWith('colId', { kind: 'offset' }),
  'main:sortState': itemWith('ref', DROP_RANGES),
  'main:sortCondition': itemWith('ref', DROP_RANGES),
  'x14:conditionalFormattings': { raw: true },
  'x14:dataValidations': { fragment: 'group', attributes: { count: COUNT } },
  'x14:dataValidation': { fragment: 'item' },
  'x14:sparklineGroups': GROUP,
  'x14:sparklineGroup': GROUP,
  'x14:sparkline': { fragment: 'item' },
  'xm:sqref': { text: DROP_RANGES },
  'xm:f': { text: FORMULA },
};

const ANCHOR: ElementSpec = { fragment: 'item' };

export const DRAWING_SPECS: ElementSpecs = {
  'xdr:twoCellAnchor': ANCHOR,
  'xdr:oneCellAnchor': ANCHOR,
  'xdr:col': { text: { kind: 'line', base: 0, policy: 'clamp', axis: 'cols' } },
  'xdr:row': { text: { kind: 'line', base: 0, policy: 'clamp', axis: 'rows' } },
  'xdr:sp': { attributes: { textlink: FORMULA } },
};

export const CHART_SPECS: ElementSpecs = {
  'c:f': { text: FORMULA },
  'c15:f': { text: FORMULA },
};

export const VML_SPECS: ElementSpecs = {
  'v:shape': { fragment: 'item' },
  'x:Row': { text: { kind: 'line', base: 0, policy: 'drop', axis: 'rows' } },
  'x:Column': { text: { kind: 'line', base: 0, policy: 'drop', axis: 'cols' } },
  'x:Anchor': { text: { kind: 'anchor' } },
  'x:FmlaLink': { text: FORMULA },
  'x:FmlaRange': { text: FORMULA },
  'x:FmlaTxbx': { text: FORMULA },
};

export const COMMENT_SPECS: ElementSpecs = {
  'main:comment': itemWith('ref', DROP_CELL),
};

export const THREAD_SPECS: ElementSpecs = {
  'tc:threadedComment': itemWith('ref', DROP_CELL),
};

const FREE = new Set([
  'sheetPr',
  'dimension',
  'sheetViews',
  'sheetFormatPr',
  'cols',
  'sheetCalcPr',
  'sheetProtection',
  'protectedRanges',
  'autoFilter',
  'sortState',
  'mergeCells',
  'phoneticPr',
  'conditionalFormatting',
  'dataValidations',
  'hyperlinks',
  'printOptions',
  'pageMargins',
  'pageSetup',
  'headerFooter',
  'rowBreaks',
  'colBreaks',
  'customProperties',
  'cellWatches',
  'ignoredErrors',
  'drawing',
  'legacyDrawing',
  'legacyDrawingHF',
  'drawingHF',
  'picture',
  'tableParts',
  'extLst',
]);

export const opaqueInSheet = (name: { readonly uri: string; readonly local: string }): boolean =>
  spaceOf(name.uri) !== 'main' || !FREE.has(name.local);
