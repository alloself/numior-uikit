export type McpLocale = (typeof McpLocale)[keyof typeof McpLocale];

export interface McpText {
  readonly ru: string;
  readonly en: string;
}

export interface McpProp {
  readonly name: string;
  readonly type: string;
  readonly kind: string;
  readonly required: boolean;
  readonly default?: string | undefined;
  readonly values?: readonly string[] | undefined;
  readonly description?: McpText | undefined;
}

export interface McpModel {
  readonly name: string;
  readonly prop: string;
  readonly event: string;
  readonly type: string;
  readonly default?: string | undefined;
  readonly description?: McpText | undefined;
}

export interface McpMember {
  readonly name: string;
  readonly type: string;
  readonly description?: McpText | undefined;
}

export interface McpKey {
  readonly keys: string;
  readonly description: McpText;
}

export interface McpBlock {
  readonly name: string;
  readonly parts: readonly string[];
  readonly modifiers: readonly string[];
}

export interface McpStyles {
  readonly blocks: readonly McpBlock[];
  readonly tokens: readonly string[];
}

export interface McpComponent {
  readonly name: string;
  readonly package: string;
  readonly styles?: McpStyles | undefined;
  readonly messages?: string | undefined;
  readonly props: readonly McpProp[];
  readonly models: readonly McpModel[];
  readonly events: readonly McpMember[];
  readonly slots: readonly McpMember[];
  readonly exposed: readonly McpMember[];
  readonly keyboard: readonly McpKey[];
  readonly pages: readonly string[];
}

export interface McpToken {
  readonly name: string;
  readonly group: string;
  readonly light: string;
  readonly dark?: string | undefined;
}

export interface McpIcon {
  readonly alias: string;
  readonly icon: string;
}

export interface McpPage {
  readonly path: string;
  readonly title: string;
  readonly section: string;
  readonly description: string;
  readonly markdown: string;
}

export interface McpFile {
  readonly name: string;
  readonly source: string;
}

export type McpExamples = Readonly<Record<string, readonly McpFile[]>>;

export interface McpData {
  readonly version: 1;
  readonly components: Readonly<Record<string, McpComponent>>;
  readonly catalogs: Readonly<Record<string, Readonly<Record<string, McpText>>>>;
  readonly exports: Readonly<Record<string, readonly string[]>>;
  readonly tokens: readonly McpToken[];
  readonly icons: readonly McpIcon[];
  readonly pages: Readonly<Record<McpLocale, readonly McpPage[]>>;
  readonly examples: Readonly<Record<McpLocale, McpExamples>>;
}

export const McpLocale = { En: 'en', Ru: 'ru' } as const;
