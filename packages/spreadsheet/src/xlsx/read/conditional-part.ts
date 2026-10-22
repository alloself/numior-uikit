import { parseCell, parseRange } from '../../core/address';
import type { CellAddress, CellRange } from '../../core/cell.types';
import type {
  CellIsOperator,
  ConditionalEntry,
  ConditionalFormat,
  ConditionalRule,
  DifferentialStyle,
  TextOperator,
  Threshold,
  TimePeriod,
} from '../../core/conditional/conditional.types';
import type { StyleColor } from '../../core/decorations';
import type { FormulaNode } from '../../core/formula/formula.types';
import { EN_FORMULAS } from '../../core/formula/locale';
import { parseFormula } from '../../core/formula/parser';
import type { XmlAttribute, XmlName } from '../xml/xml.types';
import { escapeAttribute, escapeText } from '../xml/writer';
import { MAIN, attributeOf, numberOf } from './ooxml';
import { colorOf } from './styles';

export interface ConditionalCollector {
  inside(): boolean;
  open(name: XmlName, attributes: readonly XmlAttribute[]): void;
  text(text: string): void;
  close(name: XmlName): void;
  formats(): ConditionalFormat[];
  foreign(): number;
}

interface Recorder {
  open(name: XmlName, attributes: readonly XmlAttribute[]): void;
  text(text: string): void;
  close(name: XmlName): void;
  result(): string;
}

interface Cfvo {
  readonly type: string;
  readonly value: string | undefined;
}

interface RuleDraft {
  readonly attributes: readonly XmlAttribute[];
  readonly raw: Recorder;
  readonly formulas: string[];
  readonly cfvos: Cfvo[];
  readonly colors: StyleColor[];
  settings: readonly XmlAttribute[];
  extra: Recorder | undefined;
  formula: string | undefined;
  extraDepth: number;
}

interface Drafting {
  readonly anchor: CellAddress;
  readonly attribute: (name: string) => string | undefined;
  readonly style: DifferentialStyle;
}

type RuleReader = (draft: RuleDraft, drafting: Drafting) => ConditionalRule | undefined;

const PREFIXES = /_xl(?:fn|ws|pm)\./gu;

const OPERATORS: readonly CellIsOperator[] = [
  'between',
  'notBetween',
  'equal',
  'notEqual',
  'greaterThan',
  'lessThan',
  'greaterThanOrEqual',
  'lessThanOrEqual',
];

const PERIODS: readonly TimePeriod[] = [
  'today',
  'yesterday',
  'tomorrow',
  'last7Days',
  'thisWeek',
  'lastWeek',
  'nextWeek',
  'thisMonth',
  'lastMonth',
  'nextMonth',
];

const TEXTS: Readonly<Record<string, TextOperator>> = {
  containsText: 'contains',
  notContainsText: 'notContains',
  beginsWith: 'beginsWith',
  endsWith: 'endsWith',
};

const VALUE_TESTS: Readonly<
  Record<string, 'duplicates' | 'uniques' | 'blanks' | 'filled' | 'errors' | 'noErrors'>
> = {
  duplicateValues: 'duplicates',
  uniqueValues: 'uniques',
  containsBlanks: 'blanks',
  notContainsBlanks: 'filled',
  containsErrors: 'errors',
  notContainsErrors: 'noErrors',
};

const THRESHOLDS: Readonly<Record<string, Threshold['kind']>> = {
  min: 'min',
  max: 'max',
  autoMin: 'autoMin',
  autoMax: 'autoMax',
  num: 'number',
  percent: 'percent',
  percentile: 'percentile',
  formula: 'formula',
};

const isOperator = (value: string | undefined): value is CellIsOperator =>
  OPERATORS.some((operator) => operator === value);

const isPeriod = (value: string | undefined): value is TimePeriod =>
  PERIODS.some((period) => period === value);

const createRecorder = (): Recorder => {
  const prefixes = new Map<string, string>();
  const pieces: string[] = [];
  let root = '';

  const note = (name: XmlName): void => {
    const colon = name.qname.indexOf(':');
    const prefix = colon > 0 ? name.qname.slice(0, colon) : '';

    if (prefix !== '' && prefix !== 'xml') {
      prefixes.set(prefix, name.uri);
    }
  };

  return {
    open: (name, attributes) => {
      const own =
        !name.qname.includes(':') && !MAIN.has(name.uri)
          ? ` xmlns="${escapeAttribute(name.uri)}"`
          : '';

      note(name);

      attributes.forEach((attribute) => {
        note(attribute.name);
      });

      root ||= name.qname;

      pieces.push(
        `<${name.qname}${own}${attributes
          .map((attribute) => ` ${attribute.name.qname}="${escapeAttribute(attribute.value)}"`)
          .join('')}>`,
      );
    },
    text: (text) => {
      pieces.push(escapeText(text));
    },
    close: (name) => {
      pieces.push(`</${name.qname}>`);
    },
    result: () => {
      const declarations = [...prefixes]
        .map(([prefix, uri]) => ` xmlns:${prefix}="${escapeAttribute(uri)}"`)
        .join('');

      const [first = '', ...rest] = pieces;

      return `<${root}${declarations}${first.slice(root.length + 1)}${rest.join('')}`;
    },
  };
};

const rangesOf = (text: string): CellRange[] =>
  text.split(/\s+/u).reduce<CellRange[]>((found, part) => {
    const cell = part.includes(':') ? undefined : parseCell(part);

    const range =
      cell === undefined
        ? parseRange(part)
        : { top: cell.row, left: cell.col, bottom: cell.row, right: cell.col };

    if (range !== undefined) {
      found.push(range);
    }
    return found;
  }, []);

const formulaOf = (text: string, anchor: CellAddress): FormulaNode | undefined => {
  const parsed = parseFormula(text.replaceAll(PREFIXES, ''), EN_FORMULAS, anchor);

  return parsed.ok ? parsed.ast : undefined;
};

const thresholdOf = (cfvo: Cfvo | undefined, anchor: CellAddress): Threshold | undefined => {
  const kind = cfvo === undefined ? undefined : THRESHOLDS[cfvo.type];
  const value = cfvo?.value === undefined ? undefined : formulaOf(cfvo.value, anchor);

  switch (kind) {
    case undefined:
      return undefined;
    case 'min':
    case 'max':
    case 'autoMin':
    case 'autoMax':
      return { kind };
    default:
      return value === undefined ? undefined : { kind, value };
  }
};

const thresholdsOf = (draft: RuleDraft, anchor: CellAddress): Threshold[] | undefined => {
  const found = draft.cfvos.map((cfvo) => thresholdOf(cfvo, anchor));

  return found.every((item) => item !== undefined)
    ? found.filter((item) => item !== undefined)
    : undefined;
};

const formulasOf = (draft: RuleDraft, anchor: CellAddress): FormulaNode[] | undefined => {
  const found = draft.formulas.map((text) => formulaOf(text, anchor));

  return found.length > 0 && found.every((item) => item !== undefined)
    ? found.filter((item) => item !== undefined)
    : undefined;
};

const setting = (draft: RuleDraft, name: string): string | undefined =>
  attributeOf(draft.settings, name);

const cellIs: RuleReader = (draft, { anchor, attribute, style }) => {
  const operator = attribute('operator');
  const formulas = formulasOf(draft, anchor);

  return isOperator(operator) && formulas !== undefined
    ? { kind: 'cellIs', operator, formulas, style }
    : undefined;
};

const expression: RuleReader = (draft, { anchor, style }) => {
  const [formula] = formulasOf(draft, anchor) ?? [];

  return formula === undefined ? undefined : { kind: 'expression', formula, style };
};

const colorScale: RuleReader = (draft, { anchor }) => {
  const thresholds = thresholdsOf(draft, anchor);

  if (
    thresholds === undefined ||
    thresholds.length !== draft.colors.length ||
    thresholds.length < 2
  ) {
    return undefined;
  }
  return {
    kind: 'colorScale',
    stops: thresholds.map((threshold, index) => ({
      threshold,
      color: draft.colors[index] ?? { kind: 'auto' },
    })),
  };
};

const dataBar: RuleReader = (draft, { anchor }) => {
  const [min, max] = thresholdsOf(draft, anchor) ?? [];
  const [color] = draft.colors;

  return min === undefined || max === undefined || color === undefined
    ? undefined
    : { kind: 'dataBar', min, max, color, showValue: setting(draft, 'showValue') !== '0' };
};

const iconSet: RuleReader = (draft, { anchor }) => {
  const thresholds = thresholdsOf(draft, anchor);

  return thresholds === undefined
    ? undefined
    : {
        kind: 'iconSet',
        set: setting(draft, 'iconSet') ?? '3TrafficLights1',
        thresholds,
        reverse: setting(draft, 'reverse') === '1',
        showValue: setting(draft, 'showValue') !== '0',
      };
};

const top: RuleReader = (_draft, { attribute, style }) => ({
  kind: 'top',
  rank: numberOf(attribute('rank'), 10),
  percent: attribute('percent') === '1',
  bottom: attribute('bottom') === '1',
  style,
});

const average: RuleReader = (_draft, { attribute, style }) => ({
  kind: 'aboveAverage',
  below: attribute('aboveAverage') === '0',
  equal: attribute('equalAverage') === '1',
  deviations: numberOf(attribute('stdDev'), 0),
  style,
});

const period: RuleReader = (_draft, { attribute, style }) => {
  const value = attribute('timePeriod');

  return isPeriod(value) ? { kind: 'timePeriod', period: value, style } : undefined;
};

const READERS: Readonly<Record<string, RuleReader>> = {
  cellIs,
  expression,
  colorScale,
  dataBar,
  iconSet,
  top10: top,
  aboveAverage: average,
  timePeriod: period,
};

const ruleOf = (
  draft: RuleDraft,
  anchor: CellAddress,
  differentials: readonly DifferentialStyle[],
): ConditionalRule | undefined => {
  const attribute = (name: string): string | undefined => attributeOf(draft.attributes, name);
  const type = attribute('type') ?? '';
  const dxf = attribute('dxfId');
  const style = (dxf === undefined ? undefined : differentials[numberOf(dxf, -1)]) ?? {};
  const text = TEXTS[type];
  const test = VALUE_TESTS[type];

  if (text !== undefined) {
    return { kind: 'text', operator: text, text: attribute('text') ?? '', style };
  }
  if (test !== undefined) {
    return { kind: test, style };
  }
  return READERS[type]?.(draft, { anchor, attribute, style });
};

const newDraft = (attributes: readonly XmlAttribute[]): RuleDraft => ({
  attributes,
  raw: createRecorder(),
  formulas: [],
  cfvos: [],
  colors: [],
  settings: [],
  extra: undefined,
  formula: undefined,
  extraDepth: 0,
});

const draftPart = (draft: RuleDraft, name: XmlName, attributes: readonly XmlAttribute[]): void => {
  switch (name.local) {
    case 'formula':
      draft.formula = '';
      return;
    case 'cfvo':
      draft.cfvos.push({
        type: attributeOf(attributes, 'type') ?? '',
        value: attributeOf(attributes, 'val'),
      });

      return;
    case 'color':
      draft.colors.push(colorOf(attributes) ?? { kind: 'auto' });
      return;
    case 'colorScale':
    case 'dataBar':
    case 'iconSet':
      draft.settings = attributes;
      return;
    default:
      return;
  }
};

export const createConditionalCollector = (
  differentials: readonly DifferentialStyle[],
): ConditionalCollector => {
  const formats: ConditionalFormat[] = [];
  let ranges: CellRange[] | undefined;
  let rules: ConditionalEntry[] = [];
  let draft: RuleDraft | undefined;
  let foreign = 0;

  const finished = (current: RuleDraft): void => {
    const anchor = { row: ranges?.[0]?.top ?? 0, col: ranges?.[0]?.left ?? 0 };
    const rule = ruleOf(current, anchor, differentials);

    foreign += rule === undefined ? 1 : 0;

    rules.push({
      rule: rule ?? { kind: 'foreign', xml: current.raw.result() },
      priority: numberOf(attributeOf(current.attributes, 'priority'), 1),
      stopIfTrue: attributeOf(current.attributes, 'stopIfTrue') === '1',
      extra: rule === undefined ? undefined : current.extra?.result(),
    });
  };

  const openInRule = (
    current: RuleDraft,
    name: XmlName,
    attributes: readonly XmlAttribute[],
  ): void => {
    current.raw.open(name, attributes);
    if (current.extraDepth > 0 || (name.local === 'extLst' && MAIN.has(name.uri))) {
      current.extra ??= createRecorder();
      current.extra.open(name, attributes);
      current.extraDepth += 1;
      return;
    }
    draftPart(current, name, attributes);
  };

  const closeInRule = (current: RuleDraft, name: XmlName): void => {
    current.raw.close(name);
    if (current.extraDepth > 0) {
      current.extra?.close(name);
      current.extraDepth -= 1;
    } else if (name.local === 'formula' && current.formula !== undefined) {
      current.formulas.push(current.formula);
      current.formula = undefined;
    }
  };

  return {
    inside: () => ranges !== undefined,
    open: (name, attributes) => {
      if (ranges === undefined) {
        ranges = rangesOf(attributeOf(attributes, 'sqref') ?? '');
        rules = [];
      } else if (draft === undefined && name.local === 'cfRule') {
        draft = newDraft(attributes);
        draft.raw.open(name, attributes);
      } else if (draft !== undefined) {
        openInRule(draft, name, attributes);
      }
    },
    text: (text) => {
      draft?.raw.text(text);
      if (draft !== undefined && draft.extraDepth > 0) {
        draft.extra?.text(text);
      } else if (draft?.formula !== undefined) {
        draft.formula += text;
      }
    },
    close: (name) => {
      if (draft !== undefined && name.local === 'cfRule' && draft.extraDepth === 0) {
        draft.raw.close(name);
        finished(draft);
        draft = undefined;
      } else if (draft !== undefined) {
        closeInRule(draft, name);
      } else if (ranges !== undefined) {
        formats.push({ ranges, rules });
        ranges = undefined;
      }
    },
    formats: () => formats,
    foreign: () => foreign,
  };
};
