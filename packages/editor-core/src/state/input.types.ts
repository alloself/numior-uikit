import type { SelectionRange } from './selection.types';
import { type InputIntentKind } from './state.types';

export type TextUnit = (typeof TextUnit)[keyof typeof TextUnit];

export type TextDirection = (typeof TextDirection)[keyof typeof TextDirection];

export type InputSource = (typeof InputSource)[keyof typeof InputSource];

export type InputIntent =
  | {
      readonly kind: typeof InputIntentKind.InsertText;
      readonly text: string;
      readonly range?: SelectionRange;
    }
  | { readonly kind: typeof InputIntentKind.InsertParagraph }
  | { readonly kind: typeof InputIntentKind.InsertLineBreak }
  | {
      readonly kind: typeof InputIntentKind.Delete;
      readonly direction: TextDirection;
      readonly unit: TextUnit;
      readonly range?: SelectionRange;
    }
  | { readonly kind: typeof InputIntentKind.Format; readonly mark: string }
  | { readonly kind: typeof InputIntentKind.History; readonly action: 'undo' | 'redo' }
  | {
      readonly kind: typeof InputIntentKind.Paste;
      readonly text: string;
      readonly html?: string | undefined;
    }
  | { readonly kind: typeof InputIntentKind.Files; readonly files: readonly File[] }
  | {
      readonly kind: typeof InputIntentKind.Compose;
      readonly text: string;
      readonly range: SelectionRange;
      readonly caret?: number | undefined;
    };

export interface KeyInput {
  readonly key: string;
  readonly code: string;
  readonly ctrl: boolean;
  readonly meta: boolean;
  readonly alt: boolean;
  readonly shift: boolean;
}

export const TextUnit = { Character: 'character', Word: 'word', Line: 'line' } as const;

export const TextDirection = { Backward: 'backward', Forward: 'forward' } as const;

export const InputSource = {
  Type: 'type',
  Delete: 'delete',
  Compose: 'compose',
  Paste: 'paste',
  Key: 'key',
  Pointer: 'pointer',
} as const;
