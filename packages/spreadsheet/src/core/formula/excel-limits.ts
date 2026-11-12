import { CellError } from '../cell.types';
import {
  FormulaFailureReason,
  FormulaNodeKind,
  FormulaReferenceKind,
  UnaryOperator,
  type CallSignature,
  type FormulaNode,
  type SignatureOf,
} from './formula.types';

export interface FormulaRefusal {
  readonly reason: FormulaFailureReason;
  readonly name?: string | undefined;
  readonly argument?: number | undefined;
}

export const MAX_FORMULA_TEXT = 8191;

const MAX_FORMULA_STRING = 255;

const LEAD_EXPONENTS = { low: -309, high: 307 } as const;

const ZERO_EXPONENTS = { low: -308, high: 308 } as const;

const NUMBER_PARTS = /^(\d*)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/u;

const REFERENCE_KINDS: ReadonlySet<string> = new Set(Object.values(FormulaReferenceKind));

const callGivesReference = (name: string, signatureOf: SignatureOf): boolean => {
  const signature = signatureOf(name);

  return signature === undefined || signature.givesReference === true;
};

const givesReference = (node: FormulaNode, signatureOf: SignatureOf): boolean => {
  switch (node.kind) {
    case FormulaNodeKind.Error:
      return node.code === CellError.Ref;
    case FormulaNodeKind.Unary:
      return node.op === UnaryOperator.Intersect && givesReference(node.operand, signatureOf);
    case FormulaNodeKind.Call:
      return callGivesReference(node.name, signatureOf);
    case FormulaNodeKind.Opaque:
      return true;
    default:
      return REFERENCE_KINDS.has(node.kind);
  }
};

const fitsCount = (signature: CallSignature, count: number): boolean =>
  count >= signature.min && count <= signature.max && (signature.counts?.(count) ?? true);

export const callRefusal = (
  name: string,
  args: readonly FormulaNode[],
  signatureOf: SignatureOf,
): FormulaRefusal | undefined => {
  const signature = signatureOf(name);

  if (signature === undefined) {
    return undefined;
  }
  if (!fitsCount(signature, args.length)) {
    return { reason: FormulaFailureReason.Arguments, name };
  }

  const argument = args.findIndex(
    (arg, index) => signature.referenceAt?.(index) === true && !givesReference(arg, signatureOf),
  );

  return argument < 0
    ? undefined
    : { reason: FormulaFailureReason.ReferenceArgument, name, argument };
};

const outside = (
  exponent: number,
  bounds: { readonly low: number; readonly high: number },
): FormulaFailureReason | undefined => {
  if (exponent > bounds.high) {
    return FormulaFailureReason.BigNumber;
  }
  return exponent < bounds.low ? FormulaFailureReason.SmallNumber : undefined;
};

export const numberRefusal = (text: string): FormulaFailureReason | undefined => {
  const parts = NUMBER_PARTS.exec(text);

  if (parts === null) {
    return FormulaFailureReason.BigNumber;
  }

  const [, whole = '', fraction = '', power = '0'] = parts;
  const digits = `${whole}${fraction}`;
  const first = digits.search(/[1-9]/u);
  const exponent = Number(power) - fraction.length;

  return first < 0
    ? outside(exponent, ZERO_EXPONENTS)
    : outside(exponent + digits.length - 1 - first, LEAD_EXPONENTS);
};

export const literalRefusal = (node: FormulaNode): FormulaFailureReason | undefined => {
  switch (node.kind) {
    case FormulaNodeKind.String:
      return node.value.length > MAX_FORMULA_STRING ? FormulaFailureReason.LongText : undefined;
    case FormulaNodeKind.Number:
      return numberRefusal(String(Math.abs(node.value)));
    default:
      return undefined;
  }
};

const childrenOf = (node: FormulaNode): readonly FormulaNode[] => {
  switch (node.kind) {
    case FormulaNodeKind.Call:
      return node.args;
    case FormulaNodeKind.Unary:
    case FormulaNodeKind.Percent:
      return [node.operand];
    case FormulaNodeKind.Binary:
      return [node.left, node.right];
    case FormulaNodeKind.Array:
      return node.rows.flat();
    default:
      return [];
  }
};

const ownRefusal = (node: FormulaNode, signatureOf: SignatureOf): FormulaRefusal | undefined => {
  if (node.kind === FormulaNodeKind.Call) {
    return callRefusal(node.name, node.args, signatureOf);
  }

  const reason = literalRefusal(node);

  return reason === undefined ? undefined : { reason };
};

export const formulaRefusal = (
  ast: FormulaNode,
  signatureOf: SignatureOf,
): FormulaRefusal | undefined => {
  const waiting: FormulaNode[] = [ast];

  for (let node = waiting.pop(); node !== undefined; node = waiting.pop()) {
    const refusal = ownRefusal(node, signatureOf);

    if (refusal !== undefined) {
      return refusal;
    }
    for (const child of childrenOf(node)) {
      waiting.push(child);
    }
  }
  return undefined;
};
