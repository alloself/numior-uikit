import { MAX_COLS } from '../address';
import type { FormulaNode } from '../formula/formula.types';

export interface TreeSharing {
  share(sheet: number, col: number, ast: FormulaNode): FormulaNode;
}

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === 'object' && value !== null;

const sameTree = (left: unknown, right: unknown): boolean => {
  if (left === right) {
    return true;
  }
  if (Array.isArray(left) || Array.isArray(right)) {
    return (
      Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((item, index) => sameTree(item, right[index]))
    );
  }
  if (!isRecord(left) || !isRecord(right)) {
    return false;
  }

  const keys = Object.keys(left);

  return (
    keys.length === Object.keys(right).length &&
    keys.every((key) => sameTree(left[key], right[key]))
  );
};

export const createTreeSharing = (): TreeSharing => {
  const last = new Map<number, FormulaNode>();

  return {
    share: (sheet, col, ast) => {
      const key = sheet * MAX_COLS + col;
      const known = last.get(key);

      if (known !== undefined && sameTree(known, ast)) {
        return known;
      }
      last.set(key, ast);
      return ast;
    },
  };
};
