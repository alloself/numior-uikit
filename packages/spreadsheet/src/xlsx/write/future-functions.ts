import { lambdaNames, letNames } from '../../core/calc/signatures';
import type { CellAddress } from '../../core/cell.types';
import {
  FormulaNodeKind,
  FormulaReferenceKind,
  UnaryOperator,
  type FormulaNode,
} from '../../core/formula/formula.types';
import { FILE_FORMULAS } from '../../core/formula/locale';
import { printFormula } from '../../core/formula/printer';
import { foldFormula, operandsOf, withChildren } from '../../core/formula/walk';

interface Parameter {
  readonly key: string;
  readonly text: string;
}

type Declares = (index: number, count: number) => boolean;

const PARAMETER = '_xlpm.';

const DECLARING: ReadonlyMap<string, Declares> = new Map([
  ['LET', letNames],
  ['LAMBDA', lambdaNames],
]);

const WORKSHEET_FUNCTIONS = new Set(['FILTER', 'SORT']);

const FUTURE_FUNCTIONS = new Set([
  'ACOT',
  'ACOTH',
  'AGGREGATE',
  'ANCHORARRAY',
  'ARABIC',
  'ARRAYTOTEXT',
  'BASE',
  'BETA.DIST',
  'BETA.INV',
  'BINOM.DIST',
  'BINOM.DIST.RANGE',
  'BINOM.INV',
  'BITAND',
  'BITLSHIFT',
  'BITOR',
  'BITRSHIFT',
  'BITXOR',
  'BYCOL',
  'BYROW',
  'CEILING.MATH',
  'CEILING.PRECISE',
  'CHISQ.DIST',
  'CHISQ.DIST.RT',
  'CHISQ.INV',
  'CHISQ.INV.RT',
  'CHISQ.TEST',
  'CHOOSECOLS',
  'CHOOSEROWS',
  'COMBINA',
  'CONCAT',
  'CONFIDENCE.NORM',
  'CONFIDENCE.T',
  'COT',
  'COTH',
  'COVARIANCE.P',
  'COVARIANCE.S',
  'CSC',
  'CSCH',
  'DAYS',
  'DECIMAL',
  'DETECTLANGUAGE',
  'DROP',
  'ENCODEURL',
  'ERF.PRECISE',
  'ERFC.PRECISE',
  'EXPAND',
  'EXPON.DIST',
  'F.DIST',
  'F.DIST.RT',
  'F.INV',
  'F.INV.RT',
  'F.TEST',
  'FIELDVALUE',
  'FILTERXML',
  'FLOOR.MATH',
  'FLOOR.PRECISE',
  'FORECAST.ETS',
  'FORECAST.ETS.CONFINT',
  'FORECAST.ETS.SEASONALITY',
  'FORECAST.ETS.STAT',
  'FORECAST.LINEAR',
  'FORMULATEXT',
  'GAMMA',
  'GAMMA.DIST',
  'GAMMA.INV',
  'GAMMALN.PRECISE',
  'GAUSS',
  'GROUPBY',
  'HSTACK',
  'HYPGEOM.DIST',
  'IFNA',
  'IFS',
  'IMAGE',
  'IMCOSH',
  'IMCOT',
  'IMCSC',
  'IMCSCH',
  'IMPORTCSV',
  'IMPORTTEXT',
  'IMSEC',
  'IMSECH',
  'IMSINH',
  'IMTAN',
  'ISFORMULA',
  'ISOMITTED',
  'ISOWEEKNUM',
  'LAMBDA',
  'LET',
  'LOGNORM.DIST',
  'LOGNORM.INV',
  'MAKEARRAY',
  'MAP',
  'MAXIFS',
  'MINIFS',
  'MODE.MULT',
  'MODE.SNGL',
  'MUNIT',
  'NEGBINOM.DIST',
  'NORM.DIST',
  'NORM.INV',
  'NORM.S.DIST',
  'NORM.S.INV',
  'NUMBERVALUE',
  'PDURATION',
  'PERCENTILE.EXC',
  'PERCENTILE.INC',
  'PERCENTOF',
  'PERCENTRANK.EXC',
  'PERCENTRANK.INC',
  'PERMUTATIONA',
  'PHI',
  'PIVOTBY',
  'POISSON.DIST',
  'QUARTILE.EXC',
  'QUARTILE.INC',
  'RANDARRAY',
  'RANK.AVG',
  'RANK.EQ',
  'REDUCE',
  'REGEXEXTRACT',
  'REGEXREPLACE',
  'REGEXTEST',
  'RRI',
  'SCAN',
  'SEC',
  'SECH',
  'SEQUENCE',
  'SHEET',
  'SHEETS',
  'SKEW.P',
  'SORTBY',
  'STDEV.P',
  'STDEV.S',
  'STOCKHISTORY',
  'SWITCH',
  'T.DIST',
  'T.DIST.2T',
  'T.DIST.RT',
  'T.INV',
  'T.INV.2T',
  'T.TEST',
  'TAKE',
  'TEXTAFTER',
  'TEXTBEFORE',
  'TEXTJOIN',
  'TEXTSPLIT',
  'TOCOL',
  'TOROW',
  'TRANSLATE',
  'TRIMRANGE',
  'UNICHAR',
  'UNICODE',
  'UNIQUE',
  'VALUETOTEXT',
  'VAR.P',
  'VAR.S',
  'VSTACK',
  'WEBSERVICE',
  'WEIBULL.DIST',
  'WRAPCOLS',
  'WRAPROWS',
  'XLOOKUP',
  'XMATCH',
  'XOR',
  'Z.TEST',
]);

const prefixed = (name: string): string => {
  if (WORKSHEET_FUNCTIONS.has(name)) {
    return `_xlfn._xlws.${name}`;
  }
  return FUTURE_FUNCTIONS.has(name) ? `_xlfn.${name}` : name;
};

const parameterOf = (node: FormulaNode, place: CellAddress): Parameter | undefined => {
  const own =
    (node.kind === FormulaReferenceKind.Name || node.kind === FormulaReferenceKind.Cell) &&
    node.sheet === undefined &&
    node.book === undefined;

  if (!own) {
    return undefined;
  }
  if (node.kind === FormulaReferenceKind.Name) {
    return { key: node.name.toUpperCase(), text: node.name };
  }
  if (node.ref.rowAbsolute || node.ref.colAbsolute) {
    return undefined;
  }

  const text = printFormula(node, FILE_FORMULAS, place);

  return { key: text.toUpperCase(), text };
};

const parameterNode = (text: string): FormulaNode => ({
  kind: FormulaReferenceKind.Name,
  name: `${PARAMETER}${text}`,
});

const renamed = (
  node: FormulaNode,
  visible: ReadonlyMap<string, string>,
  place: CellAddress,
): FormulaNode =>
  visible.size === 0
    ? node
    : foldFormula<FormulaNode>(
        node,
        (item, parts) => {
          const key = parameterOf(item, place)?.key;
          const text = key === undefined ? undefined : visible.get(key);

          return text === undefined ? withChildren(item, parts) : parameterNode(text);
        },
        operandsOf,
      );

const withParameters = (
  name: string,
  parts: readonly FormulaNode[],
  place: CellAddress,
): readonly FormulaNode[] => {
  const declares = DECLARING.get(name.toUpperCase());

  if (declares === undefined) {
    return parts;
  }

  const visible = new Map<string, string>();
  const named: FormulaNode[] = [];

  for (const [index, part] of parts.entries()) {
    const parameter = declares(index, parts.length) ? parameterOf(part, place) : undefined;

    if (parameter === undefined) {
      named.push(renamed(part, visible, place));
      continue;
    }

    named.push(parameterNode(parameter.text));
    visible.set(parameter.key, parameter.text);
  }
  return named;
};

const prefixedNode = (
  node: FormulaNode,
  parts: readonly FormulaNode[],
  place: CellAddress,
): FormulaNode => {
  switch (node.kind) {
    case FormulaNodeKind.Call: {
      const name = prefixed(node.name);
      const args = withParameters(node.name, parts, place);
      const rebuilt = withChildren(node, args);

      return name === node.name ? rebuilt : { ...node, name, args };
    }
    case FormulaNodeKind.Unary:
      return node.op === UnaryOperator.Intersect
        ? { kind: 'call', name: '_xlfn.SINGLE', args: [parts[0] ?? node.operand] }
        : withChildren(node, parts);
    default:
      return withChildren(node, parts);
  }
};

export const withFuturePrefixes = (node: FormulaNode, place: CellAddress): FormulaNode =>
  foldFormula<FormulaNode>(node, (item, parts) => prefixedNode(item, parts, place), operandsOf);
