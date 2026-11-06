export type HelpLanguage = (typeof HelpLanguage)[keyof typeof HelpLanguage];

export interface FunctionHelp {
  readonly summary: string;
  readonly args: readonly string[];
  readonly repeat?: number | undefined;
}

export type FunctionHelpCatalog = Readonly<Record<string, FunctionHelp>>;

export interface SignaturePart {
  readonly text: string;
  readonly current: boolean;
}

export interface SignatureInput {
  readonly name: string;
  readonly min: number;
  readonly max: number;
  readonly help: FunctionHelp;
  readonly argument: number;
  readonly separator: string;
}

export const HelpLanguage = { En: 'en', Ru: 'ru' } as const;
