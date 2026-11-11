export interface CssDeclaration {
  readonly property: string;
  readonly value: string;
}

export interface CssRule {
  readonly context: string;
  readonly selector: string;
  readonly declarations: readonly CssDeclaration[];
}

export interface CssBlock {
  readonly prelude: string;
  readonly body: string;
}

export type Aliases = ReadonlyMap<string, string>;

export interface FoldedRules {
  readonly rules: CssRule[];
  readonly fallbacks: number;
}
