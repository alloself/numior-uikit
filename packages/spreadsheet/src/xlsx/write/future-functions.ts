import type { FormulaNode } from '../../core/formula/formula.types';

const WORKSHEET_FUNCTIONS = new Set(['FILTER', 'SORT']);

const FUTURE_FUNCTIONS = new Set([
  'AGGREGATE',
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
  'HSTACK',
  'HYPGEOM.DIST',
  'IFNA',
  'IFS',
  'IMAGE',
  'IMCOSH',
  'IMCOT',
  'IMCSC',
  'IMCSCH',
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
  'PERCENTRANK.EXC',
  'PERCENTRANK.INC',
  'PERMUTATIONA',
  'PHI',
  'POISSON.DIST',
  'QUARTILE.EXC',
  'QUARTILE.INC',
  'RANDARRAY',
  'RANK.AVG',
  'RANK.EQ',
  'REDUCE',
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

const mapped = (nodes: readonly FormulaNode[]): readonly FormulaNode[] => {
  const result = nodes.map(withFuturePrefixes);

  return result.every((node, index) => node === nodes[index]) ? nodes : result;
};

export const withFuturePrefixes = (node: FormulaNode): FormulaNode => {
  switch (node.kind) {
    case 'call': {
      const name = prefixed(node.name);
      const args = mapped(node.args);

      return name === node.name && args === node.args ? node : { ...node, name, args };
    }
    case 'unary':
    case 'percent': {
      const operand = withFuturePrefixes(node.operand);

      return operand === node.operand ? node : { ...node, operand };
    }
    case 'binary': {
      const left = withFuturePrefixes(node.left);
      const right = withFuturePrefixes(node.right);

      return left === node.left && right === node.right ? node : { ...node, left, right };
    }
    default:
      return node;
  }
};
