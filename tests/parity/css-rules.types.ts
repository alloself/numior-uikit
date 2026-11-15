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

export type Displays = ReadonlyMap<string, string>;

export interface FoldedRules {
  readonly rules: CssRule[];
  readonly fallbacks: number;
}

export interface CssEnvironment {
  readonly aliases: Aliases;
  readonly fixed: Aliases;
  readonly helpers: Aliases;
}

export type Longhand = readonly [property: string, value: string];

export interface SideNames {
  readonly top: string;
  readonly bottom: string;
  readonly start: string;
  readonly end: string;
  readonly right: string;
  readonly left: string;
}

export type Specificity = readonly [ids: number, classes: number, types: number];

export interface DroppedReset {
  readonly rule: string;
  readonly index: number;
  readonly properties: readonly string[];
}

export interface LonghandOwner {
  readonly rule: string;
  readonly index: number;
  readonly selector: string;
}

export interface RuleComparison {
  readonly issues: readonly string[];
  readonly resets: readonly DroppedReset[];
}
