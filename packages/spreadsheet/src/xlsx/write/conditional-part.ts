import { formatCell, formatRange } from '../../core/address';
import type { CellAddress } from '../../core/cell.types';
import type {
  ConditionalEntry,
  ConditionalFormat,
  ConditionalRule,
  Threshold,
  TimePeriod,
} from '../../core/conditional/conditional.types';
import type { FormulaNode } from '../../core/formula/formula.types';
import { FILE_FORMULAS } from '../../core/formula/locale';
import { printFormula } from '../../core/formula/printer';
import { escapeAttribute, escapeText } from '../xml/writer';
import { withFuturePrefixes } from './future-functions';
import { colorXml, type StyleBook } from './styles-part';

interface RuleXml {
  readonly type: string;
  readonly attributes: string;
  readonly body: string;
  readonly style: boolean;
}

interface Writing {
  readonly anchor: CellAddress;
  readonly q: string;
}

const NAME = '(?:[\\w.-]+:)?';

const BLOCK = new RegExp(
  `<(${NAME})conditionalFormatting(?=[\\s/>])[^>]*?(?:/>|>[\\s\\S]*?</\\1conditionalFormatting>)`,
  'gu',
);

const FOLLOWERS = [
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
  'picture',
  'oleObjects',
  'controls',
  'webPublishItems',
  'tableParts',
  'extLst',
];

const FOLLOWER = new RegExp(`<${NAME}(?:${FOLLOWERS.join('|')})(?=[\\s/>])`, 'u');

const TEXT_TYPES: Readonly<Record<string, string>> = {
  contains: 'containsText',
  notContains: 'notContainsText',
  beginsWith: 'beginsWith',
  endsWith: 'endsWith',
};

const TEXT_OPERATORS: Readonly<Record<string, string>> = {
  contains: 'containsText',
  notContains: 'notContains',
  beginsWith: 'beginsWith',
  endsWith: 'endsWith',
};

const VALUE_TYPES: Readonly<Record<string, string>> = {
  duplicates: 'duplicateValues',
  uniques: 'uniqueValues',
  blanks: 'containsBlanks',
  filled: 'notContainsBlanks',
  errors: 'containsErrors',
  noErrors: 'notContainsErrors',
};

const THRESHOLD_TYPES: Readonly<Record<Threshold['kind'], string>> = {
  min: 'min',
  max: 'max',
  autoMin: 'autoMin',
  autoMax: 'autoMax',
  number: 'num',
  percent: 'percent',
  percentile: 'percentile',
  formula: 'formula',
};

const PERIOD_FORMULAS: Readonly<Record<TimePeriod, (cell: string) => string>> = {
  today: (cell) => `FLOOR(${cell},1)=TODAY()`,
  yesterday: (cell) => `FLOOR(${cell},1)=TODAY()-1`,
  tomorrow: (cell) => `FLOOR(${cell},1)=TODAY()+1`,
  last7Days: (cell) => `AND(TODAY()-FLOOR(${cell},1)<=6,FLOOR(${cell},1)<=TODAY())`,
  thisWeek: (cell) =>
    `AND(TODAY()-ROUNDDOWN(${cell},0)<=WEEKDAY(TODAY())-1,ROUNDDOWN(${cell},0)-TODAY()<=7-WEEKDAY(TODAY()))`,
  lastWeek: (cell) =>
    `AND(TODAY()-ROUNDDOWN(${cell},0)>=(WEEKDAY(TODAY())),TODAY()-ROUNDDOWN(${cell},0)<(WEEKDAY(TODAY())+7))`,
  nextWeek: (cell) =>
    `AND(ROUNDDOWN(${cell},0)-TODAY()>(7-WEEKDAY(TODAY())),ROUNDDOWN(${cell},0)-TODAY()<(15-WEEKDAY(TODAY())))`,
  thisMonth: (cell) => `AND(MONTH(${cell})=MONTH(TODAY()),YEAR(${cell})=YEAR(TODAY()))`,
  lastMonth: (cell) =>
    `AND(MONTH(${cell})=MONTH(EDATE(TODAY(),0-1)),YEAR(${cell})=YEAR(EDATE(TODAY(),0-1)))`,
  nextMonth: (cell) =>
    `AND(MONTH(${cell})=MONTH(EDATE(TODAY(),0+1)),YEAR(${cell})=YEAR(EDATE(TODAY(),0+1)))`,
};

const VALUE_FORMULAS: Readonly<Record<string, ((cell: string) => string) | undefined>> = {
  blanks: (cell) => `LEN(TRIM(${cell}))=0`,
  filled: (cell) => `LEN(TRIM(${cell}))>0`,
  errors: (cell) => `ISERROR(${cell})`,
  noErrors: (cell) => `NOT(ISERROR(${cell}))`,
};

const quoted = (text: string): string => `"${text.replaceAll('"', '""')}"`;

const TEXT_FORMULAS: Readonly<Record<string, (cell: string, text: string) => string>> = {
  contains: (cell, text) => `NOT(ISERROR(SEARCH(${quoted(text)},${cell})))`,
  notContains: (cell, text) => `ISERROR(SEARCH(${quoted(text)},${cell}))`,
  beginsWith: (cell, text) => `LEFT(${cell},LEN(${quoted(text)}))=${quoted(text)}`,
  endsWith: (cell, text) => `RIGHT(${cell},LEN(${quoted(text)}))=${quoted(text)}`,
};

const formulaText = (ast: FormulaNode, anchor: CellAddress): string =>
  printFormula(withFuturePrefixes(ast), FILE_FORMULAS, anchor);

const formulaXml = (text: string, q: string): string =>
  `<${q}formula>${escapeText(text)}</${q}formula>`;

const cfvoXml = (threshold: Threshold, writing: Writing): string =>
  `<${writing.q}cfvo type="${THRESHOLD_TYPES[threshold.kind]}"${'value' in threshold ? ` val="${escapeAttribute(formulaText(threshold.value, writing.anchor))}"` : ''}/>`;

const flagAttribute = (name: string, value: boolean, written: boolean): string =>
  value === written ? ` ${name}="${written ? '1' : '0'}"` : '';

const anchorText = (anchor: CellAddress): string =>
  formatCell({ ...anchor, rowAbsolute: false, colAbsolute: false });

const visualXml = (rule: ConditionalRule, writing: Writing): RuleXml | undefined => {
  const { q } = writing;

  switch (rule.kind) {
    case 'colorScale':
      return {
        type: 'colorScale',
        attributes: '',
        style: false,
        body: `<${q}colorScale>${rule.stops.map((stop) => cfvoXml(stop.threshold, writing)).join('')}${rule.stops.map((stop) => colorXml(`${q}color`, stop.color)).join('')}</${q}colorScale>`,
      };
    case 'dataBar':
      return {
        type: 'dataBar',
        attributes: '',
        style: false,
        body: `<${q}dataBar${flagAttribute('showValue', rule.showValue, false)}>${cfvoXml(rule.min, writing)}${cfvoXml(rule.max, writing)}${colorXml(`${q}color`, rule.color)}</${q}dataBar>`,
      };
    case 'iconSet':
      return {
        type: 'iconSet',
        attributes: '',
        style: false,
        body: `<${q}iconSet iconSet="${escapeAttribute(rule.set)}"${flagAttribute('showValue', rule.showValue, false)}${flagAttribute('reverse', rule.reverse, true)}>${rule.thresholds.map((threshold) => cfvoXml(threshold, writing)).join('')}</${q}iconSet>`,
      };
    default:
      return undefined;
  }
};

const rankXml = (rule: ConditionalRule, writing: Writing): RuleXml | undefined => {
  const cell = anchorText(writing.anchor);

  switch (rule.kind) {
    case 'top':
      return {
        type: 'top10',
        attributes: `${flagAttribute('percent', rule.percent, true)}${flagAttribute('bottom', rule.bottom, true)} rank="${String(rule.rank)}"`,
        style: true,
        body: '',
      };
    case 'aboveAverage':
      return {
        type: 'aboveAverage',
        attributes: `${flagAttribute('aboveAverage', !rule.below, false)}${flagAttribute('equalAverage', rule.equal, true)}${rule.deviations === 0 ? '' : ` stdDev="${String(rule.deviations)}"`}`,
        style: true,
        body: '',
      };
    case 'timePeriod':
      return {
        type: 'timePeriod',
        attributes: ` timePeriod="${rule.period}"`,
        style: true,
        body: formulaXml(PERIOD_FORMULAS[rule.period](cell), writing.q),
      };
    default:
      return undefined;
  }
};

const testXml = (rule: ConditionalRule, writing: Writing): RuleXml | undefined => {
  const cell = anchorText(writing.anchor);
  const { q } = writing;

  switch (rule.kind) {
    case 'cellIs':
      return {
        type: 'cellIs',
        attributes: ` operator="${rule.operator}"`,
        style: true,
        body: rule.formulas.map((ast) => formulaXml(formulaText(ast, writing.anchor), q)).join(''),
      };
    case 'expression':
      return {
        type: 'expression',
        attributes: '',
        style: true,
        body: formulaXml(formulaText(rule.formula, writing.anchor), q),
      };
    case 'text':
      return {
        type: TEXT_TYPES[rule.operator] ?? 'containsText',
        attributes: ` operator="${TEXT_OPERATORS[rule.operator] ?? 'containsText'}" text="${escapeAttribute(rule.text)}"`,
        style: true,
        body: formulaXml(TEXT_FORMULAS[rule.operator]?.(cell, rule.text) ?? '', q),
      };
    default:
      return undefined;
  }
};

const valueXml = (rule: ConditionalRule, writing: Writing): RuleXml | undefined => {
  const type = VALUE_TYPES[rule.kind];
  const formula = VALUE_FORMULAS[rule.kind];

  return type === undefined
    ? undefined
    : {
        type,
        attributes: '',
        style: true,
        body:
          formula === undefined ? '' : formulaXml(formula(anchorText(writing.anchor)), writing.q),
      };
};

const ruleXml = (entry: ConditionalEntry, writing: Writing, styles: StyleBook): string => {
  const { rule } = entry;

  if (rule.kind === 'foreign') {
    return rule.xml;
  }

  const shape =
    testXml(rule, writing) ??
    valueXml(rule, writing) ??
    rankXml(rule, writing) ??
    visualXml(rule, writing);

  const style =
    'style' in rule && shape?.style === true
      ? ` dxfId="${String(styles.differential(rule.style))}"`
      : '';

  const stop = entry.stopIfTrue ? ' stopIfTrue="1"' : '';
  const { q } = writing;

  return shape === undefined
    ? ''
    : `<${q}cfRule type="${shape.type}"${style} priority="${String(entry.priority)}"${stop}${shape.attributes}>${shape.body}${entry.extra ?? ''}</${q}cfRule>`;
};

export const conditionalXml = (
  formats: readonly ConditionalFormat[],
  styles: StyleBook,
  q: string,
): string =>
  formats
    .map((format) => {
      const anchor = { row: format.ranges[0]?.top ?? 0, col: format.ranges[0]?.left ?? 0 };

      return `<${q}conditionalFormatting sqref="${format.ranges.map(formatRange).join(' ')}">${format.rules
        .map((entry) => ruleXml(entry, { anchor, q }, styles))
        .join('')}</${q}conditionalFormatting>`;
    })
    .join('');

export const withoutConditional = (text: string): string => text.replace(BLOCK, '');

export const withConditional = (tail: string, xml: string): string => {
  const first = tail.search(BLOCK);
  const stripped = withoutConditional(tail);
  const follower = stripped.search(FOLLOWER);
  const at = first >= 0 ? first : follower >= 0 ? follower : stripped.length;

  return stripped.slice(0, at) + xml + stripped.slice(at);
};
