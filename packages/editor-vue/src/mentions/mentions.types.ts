export interface NuiEditorMention {
  readonly id: string;
  readonly label: string;
  readonly description?: string | undefined;
  readonly avatar?: string | undefined;
}

export type NuiEditorMentions = (
  query: string,
  context: { readonly signal: AbortSignal },
) => Promise<readonly NuiEditorMention[]>;
