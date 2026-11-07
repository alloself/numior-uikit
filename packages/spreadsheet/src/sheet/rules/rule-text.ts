import {
  ConditionalRuleKind,
  type ConditionalRule,
} from '../../core/conditional/conditional.types';
import type { FormulaNode } from '../../core/formula/formula.types';
import type { NuiSpreadsheetRulesMessages } from './rules.messages';

export const describeRule = (
  rule: ConditionalRule,
  texts: NuiSpreadsheetRulesMessages,
  print: (formula: FormulaNode) => string,
): string => {
  switch (rule.kind) {
    case ConditionalRuleKind.CellIs: {
      const [first, second] = rule.formulas.map(print);

      return texts.cellIs({ operator: rule.operator, first: first ?? '', second: second ?? '' });
    }
    case ConditionalRuleKind.Expression:
      return texts.expression({ formula: print(rule.formula) });
    case ConditionalRuleKind.ColorScale:
      return texts.colorScale({ count: rule.stops.length });
    case ConditionalRuleKind.DataBar:
      return texts.dataBar;
    case ConditionalRuleKind.IconSet:
      return texts.iconSet;
    case ConditionalRuleKind.Top:
      return texts.top(rule);
    case ConditionalRuleKind.AboveAverage:
      return texts.average(rule);
    case ConditionalRuleKind.Text:
      return texts.text(rule);
    case ConditionalRuleKind.TimePeriod:
      return texts.period(rule);
    case ConditionalRuleKind.Foreign:
      return texts.foreign;
    default:
      return texts.valueTest({ kind: rule.kind });
  }
};
