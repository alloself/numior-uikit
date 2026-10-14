import type { SelectionRange } from './selection.types';

export type TextUnit = 'character' | 'word' | 'line';

export type TextDirection = 'backward' | 'forward';

export type InputSource = 'type' | 'delete' | 'compose' | 'paste' | 'key' | 'pointer';

export type InputIntent =
  | { readonly kind: 'insertText'; readonly text: string; readonly range?: SelectionRange }
  | { readonly kind: 'insertParagraph' }
  | { readonly kind: 'insertLineBreak' }
  | {
      readonly kind: 'delete';
      readonly direction: TextDirection;
      readonly unit: TextUnit;
      readonly range?: SelectionRange;
    }
  | { readonly kind: 'format'; readonly mark: string }
  | { readonly kind: 'history'; readonly action: 'undo' | 'redo' }
  | { readonly kind: 'paste'; readonly text: string }
  | {
      readonly kind: 'compose';
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
