import { graphemesOf } from '../intl/graphemes';
import { MaskSlotKind } from './mask.types';

export interface MaskResult {
  readonly masked: string;
  readonly raw: string;
  readonly complete: boolean;
}

interface TokenSlot {
  readonly kind: typeof MaskSlotKind.Token;
  readonly test: RegExp;
}

interface LiteralSlot {
  readonly kind: typeof MaskSlotKind.Literal;
  readonly char: string;
}

type MaskSlot = TokenSlot | LiteralSlot;

interface MaskWalk {
  readonly masked: string;
  readonly raw: string;
  readonly position: number;
  readonly cursor: number;
}

const ESCAPE = '\\';

const TOKENS = new Map<string, RegExp>([
  ['#', /\d/u],
  ['A', /\p{L}/u],
  ['*', /[\p{L}\p{N}]/u],
]);

const parseMask = (mask: string): MaskSlot[] => {
  const slots: MaskSlot[] = [];
  let escaped = false;
  for (const char of mask) {
    if (escaped) {
      slots.push({ kind: MaskSlotKind.Literal, char });
      escaped = false;
    } else if (char === ESCAPE) {
      escaped = true;
    } else {
      const test = TOKENS.get(char);
      slots.push(test ? { kind: MaskSlotKind.Token, test } : { kind: MaskSlotKind.Literal, char });
    }
  }
  return slots;
};

const consumeToken = (walk: MaskWalk, slot: TokenSlot, char: string): MaskWalk => {
  const accepted = slot.test.test(char);
  return {
    masked: accepted ? walk.masked + char : walk.masked,
    raw: accepted ? walk.raw + char : walk.raw,
    position: accepted ? walk.position + 1 : walk.position,
    cursor: walk.cursor + 1,
  };
};

const consumeLiteral = (walk: MaskWalk, slot: LiteralSlot, char: string): MaskWalk => ({
  masked: walk.masked + slot.char,
  raw: walk.raw,
  position: walk.position + 1,
  cursor: char === slot.char ? walk.cursor + 1 : walk.cursor,
});

const stepMask = (
  walk: MaskWalk,
  slots: readonly MaskSlot[],
  chars: readonly string[],
): MaskWalk | undefined => {
  const slot = slots[walk.position];
  const char = chars[walk.cursor];
  if (slot === undefined || char === undefined) {
    return undefined;
  }
  return slot.kind === MaskSlotKind.Token
    ? consumeToken(walk, slot, char)
    : consumeLiteral(walk, slot, char);
};

export const applyMask = (input: string, mask: string): MaskResult => {
  const slots = parseMask(mask);
  const chars = graphemesOf(input);
  let walk: MaskWalk = { masked: '', raw: '', position: 0, cursor: 0 };
  for (let next = stepMask(walk, slots, chars); next; next = stepMask(next, slots, chars)) {
    walk = next;
  }
  const tokens = slots.reduce((count, slot) => count + Number(slot.kind === MaskSlotKind.Token), 0);
  return {
    masked: walk.raw === '' ? '' : walk.masked,
    raw: walk.raw,
    complete: tokens > 0 && walk.raw.length === tokens,
  };
};

export const maskCaret = (mask: string, count: number, length: number): number => {
  const slots = parseMask(mask);
  let index = 0;
  let seen = 0;
  for (const slot of slots) {
    if (slot.kind === MaskSlotKind.Token && seen === count) {
      break;
    }
    index += 1;
    if (slot.kind === MaskSlotKind.Token) {
      seen += 1;
      if (seen === count) {
        break;
      }
    }
  }
  return Math.min(index, length);
};
