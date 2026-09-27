export interface LocalizedText {
  readonly ru: string;
  readonly en: string;
}

export type ReferencePropKind = 'boolean' | 'enum' | 'string' | 'number' | 'function' | 'other';

export interface ReferenceProp {
  readonly name: string;
  readonly type: string;
  readonly kind: ReferencePropKind;
  readonly required: boolean;
  readonly default: string | undefined;
  readonly values: readonly string[] | undefined;
  readonly description: LocalizedText | undefined;
}

export interface ReferenceModel {
  readonly name: string;
  readonly prop: string;
  readonly event: string;
  readonly type: string;
  readonly default: string | undefined;
  readonly description: LocalizedText | undefined;
}

export interface ReferenceMember {
  readonly name: string;
  readonly type: string;
  readonly description: LocalizedText | undefined;
}

export interface ReferenceBlock {
  readonly name: string;
  readonly parts: readonly string[];
  readonly modifiers: readonly string[];
}

export interface ReferenceStyles {
  readonly import: string;
  readonly blocks: readonly ReferenceBlock[];
  readonly tokens: readonly string[];
}

export interface ReferenceKey {
  readonly keys: string;
  readonly description: LocalizedText;
}

export interface ReferenceConfigurator {
  readonly props: readonly string[];
  readonly content: LocalizedText | undefined;
}

export interface ComponentReference {
  readonly name: string;
  readonly package: string;
  readonly family: string;
  readonly file: string;
  readonly styles: ReferenceStyles | undefined;
  readonly messages: string | undefined;
  readonly props: readonly ReferenceProp[];
  readonly models: readonly ReferenceModel[];
  readonly events: readonly ReferenceMember[];
  readonly slots: readonly ReferenceMember[];
  readonly exposed: readonly ReferenceMember[];
  readonly keyboard: readonly ReferenceKey[];
  readonly configurator: ReferenceConfigurator | undefined;
}

export interface CatalogReference {
  readonly namespace: string;
  readonly texts: Readonly<Record<string, LocalizedText>>;
}

export type DeclarationKind = 'function' | 'value' | 'type';

export interface DeclarationReference {
  readonly name: string;
  readonly package: string;
  readonly kind: DeclarationKind;
  readonly signature: string;
}

export interface TokenReference {
  readonly name: string;
  readonly group: string;
  readonly light: string;
  readonly dark: string | undefined;
}

export interface IconReference {
  readonly alias: string;
  readonly icon: string;
}

export interface ReferenceBundle {
  readonly version: 1;
  readonly components: Readonly<Record<string, ComponentReference>>;
  readonly catalogs: Readonly<Record<string, CatalogReference>>;
  readonly declarations: readonly DeclarationReference[];
  readonly tokens: readonly TokenReference[];
  readonly icons: readonly IconReference[];
}

export type DescriptionMap = Readonly<Record<string, LocalizedText>>;

export interface ComponentDocs {
  readonly props?: DescriptionMap | undefined;
  readonly models?: DescriptionMap | undefined;
  readonly events?: DescriptionMap | undefined;
  readonly slots?: DescriptionMap | undefined;
  readonly exposed?: DescriptionMap | undefined;
  readonly keyboard?: readonly ReferenceKey[] | undefined;
  readonly configurator?: ReferenceConfigurator | undefined;
}

export type DocsMap = Readonly<Record<string, ComponentDocs>>;

export interface ComponentEntry {
  readonly name: string;
  readonly package: string;
  readonly family: string;
  readonly file: string;
  readonly dir: string;
}
