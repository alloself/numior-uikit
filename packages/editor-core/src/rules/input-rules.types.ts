import type { Transaction } from '../state/state.types';

export interface InputRuleMatch {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export interface InputRule {
  readonly match: RegExp;
  readonly apply: (tr: Transaction, match: RegExpExecArray, from: number, to: number) => boolean;
}
