type TailElement = (typeof SHEET_TAIL)[number];

const NAME = '(?:[\\w.-]+:)?';

const SHEET_TAIL = [
  'sheetCalcPr',
  'sheetProtection',
  'protectedRanges',
  'scenarios',
  'autoFilter',
  'sortState',
  'dataConsolidate',
  'customSheetViews',
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
  'smartTags',
  'drawing',
  'legacyDrawing',
  'legacyDrawingHF',
  'drawingHF',
  'picture',
  'oleObjects',
  'controls',
  'webPublishItems',
  'tableParts',
  'extLst',
] as const;

export const followerAt = (tail: string, element: TailElement): number => {
  const later = SHEET_TAIL.slice(SHEET_TAIL.indexOf(element) + 1);

  const at =
    later.length === 0
      ? -1
      : tail.search(new RegExp(`<${NAME}(?:${later.join('|')})(?=[\\s/>])`, 'u'));

  return at < 0 ? tail.length : at;
};

export const placeInTail = (tail: string, xml: string, element: TailElement): string => {
  const at = followerAt(tail, element);

  return tail.slice(0, at) + xml + tail.slice(at);
};
