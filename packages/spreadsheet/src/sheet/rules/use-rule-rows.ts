import { computed, type ComputedRef } from 'vue';
import {
  printFormula,
  rulesOf,
  touches,
  type CellRange,
  type ConditionalRule,
  type FormulaNode,
  type PlacedRule,
} from '../../core';
import { ConditionalRuleKind } from '../../core/conditional/conditional.types';
import { areaText } from './rule-form';
import { describeRule } from './rule-text';
import { rulePreview } from './rule-preview';
import type { RuleLooks, RuleRow, RuleRowsOptions } from './rules.types';

const keys = new WeakMap<ConditionalRule, number>();

let issued = 0;

const keyOf = (rule: ConditionalRule): number => {
  const known = keys.get(rule) ?? issued;

  if (known === issued) {
    keys.set(rule, issued);
    issued += 1;
  }
  return known;
};

const NO_ORIGIN = { row: 0, col: 0 };

const printer =
  (ranges: readonly CellRange[], looks: RuleLooks) =>
  (formula: FormulaNode): string => {
    const first = ranges[0];
    const origin = first === undefined ? NO_ORIGIN : { row: first.top, col: first.left };

    return printFormula(formula, looks.locale.formulas, origin);
  };

export const useRuleRows = (
  options: RuleRowsOptions,
): { rows: ComputedRef<readonly RuleRow[]>; shown: ComputedRef<readonly RuleRow[]> } => {
  const rowOf = (placed: PlacedRule, index: number, seen: Set<number>): RuleRow => {
    const looks = options.looks();
    const own = keyOf(placed.entry.rule);
    const key = seen.has(own) ? `${String(own)}-${String(index)}` : String(own);

    seen.add(own);

    return {
      key,
      index,
      placed,
      description: describeRule(
        placed.entry.rule,
        options.texts.value,
        printer(placed.ranges, looks),
      ),
      area: areaText(placed.ranges),
      preview: rulePreview(placed.entry.rule, looks),
      editable: placed.entry.rule.kind !== ConditionalRuleKind.Foreign,
    };
  };

  const rows = computed((): readonly RuleRow[] => {
    const seen = new Set<number>();

    return rulesOf(options.formats()).map((placed, index) => rowOf(placed, index, seen));
  });

  const shown = computed((): readonly RuleRow[] =>
    options.only()
      ? rows.value.filter((row) => touches(row.placed.ranges, options.selection()))
      : rows.value,
  );

  return { rows, shown };
};
