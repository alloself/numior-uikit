import type { NuiTableColumn } from '@numior/table';
import type { MarkdownRenderer } from 'vitepress';
import type { Component } from 'vue';
import type { ConfiguratorChange, ConfiguratorState } from './configurator-code';
import type { ExampleFile, ExampleLocale } from '../examples/example.types';
import type {
  CatalogReference,
  ComponentReference,
  LocalizedText,
  ReferenceKey,
  ReferenceProp,
  ReferenceStyles,
} from '../reference/reference.types';

export interface DocsNavItem {
  readonly text: string;
  readonly link: string;
  readonly sections: readonly string[];
}

export interface DocsNavLink {
  readonly text: string;
  readonly link: string;
  readonly current: boolean;
}

export interface DocsNavProps {
  items: readonly DocsNavLink[];
  label: string;
  moreLabel: string;
}

export type NavTitle = string | LocalizedText;

export interface NavPage {
  readonly link: string;
  readonly title: NavTitle;
}

export interface NavGroup {
  readonly title: NavTitle;
  readonly pages: readonly NavPage[];
}

export interface NavSection {
  readonly title: NavTitle;
  readonly prefixes: readonly string[];
  readonly groups: readonly NavGroup[];
}

export interface DocsSidebarItem {
  readonly text: string;
  readonly link: string;
}

export interface DocsSidebarGroup {
  readonly text: string;
  readonly items: readonly DocsSidebarItem[];
}

export type DocsSidebarSections = Readonly<Record<string, readonly DocsSidebarGroup[]>>;

export type DocsAccent = (typeof DocsAccent)[keyof typeof DocsAccent];

export interface DocsTexts {
  readonly navigation: string;
  readonly sections: string;
  readonly search: string;
  readonly searchPlaceholder: string;
  readonly searchEmpty: string;
  readonly searchPages: string;
  readonly theme: string;
  readonly light: string;
  readonly dark: string;
  readonly system: string;
  readonly more: string;
  readonly accent: string;
  readonly builtInAccents: string;
  readonly accents: Readonly<Record<DocsAccent, string>>;
  readonly language: string;
  readonly onThisPage: string;
  readonly pager: string;
  readonly previous: string;
  readonly next: string;
  readonly skip: string;
  readonly notFoundTitle: string;
  readonly notFoundText: string;
  readonly home: string;
  readonly details: string;
  readonly exampleView: string;
  readonly preview: string;
  readonly code: string;
  readonly exampleOptions: string;
  readonly invertTheme: string;
  readonly rtl: string;
  readonly copyCode: string;
  readonly copied: string;
  readonly exampleFiles: string;
  readonly apiProps: string;
  readonly apiModels: string;
  readonly apiEvents: string;
  readonly apiSlots: string;
  readonly apiExposed: string;
  readonly apiKeyboard: string;
  readonly apiStyles: string;
  readonly apiTexts: string;
  readonly apiName: string;
  readonly apiType: string;
  readonly apiDefault: string;
  readonly apiDescription: string;
  readonly apiPayload: string;
  readonly apiSlotProps: string;
  readonly apiKeys: string;
  readonly apiAction: string;
  readonly apiRequired: string;
  readonly apiKey: string;
  readonly apiText: string;
  readonly configuratorProps: string;
  readonly configuratorContent: string;
  readonly configuratorContentHint: string;
  readonly apiRussian: string;
  readonly apiEnglish: string;
  readonly reset: string;
  readonly facts: string;
  readonly description: string;
}

export interface DocsSearchOptions {
  readonly _render: (source: string, env: unknown, md: MarkdownRenderer) => string;
}

export interface DocsSearchConfig {
  readonly provider: 'local';
  readonly options?: DocsSearchOptions | undefined;
}

export interface DocsSite {
  readonly siteUrl: string;
  readonly repository: string;
}

export interface DocsThemeConfig {
  readonly nav: readonly DocsNavItem[];
  readonly sidebar: DocsSidebarSections;
  readonly texts: DocsTexts;
  readonly search?: DocsSearchConfig | undefined;
}

export interface DocsExampleProps {
  name: string;
}

export interface ExampleViewProps {
  name: string;
  locale: ExampleLocale;
  texts: DocsTexts;
}

export interface ExampleFrameProps {
  component: Component;
  files: readonly ExampleFile[];
  texts: DocsTexts;
}

export interface ApiReferenceProps {
  name?: string | undefined;
  names?: readonly string[] | undefined;
}

export interface ApiReferenceViewProps {
  names: readonly string[];
  locale: ExampleLocale;
  texts: DocsTexts;
}

export interface ApiComponentProps {
  component: ComponentReference;
  catalog: CatalogReference | undefined;
  locale: ExampleLocale;
  texts: DocsTexts;
  heading: boolean;
}

export interface ApiTextsProps {
  catalog: CatalogReference;
  texts: DocsTexts;
}

export interface SignatureProps {
  name?: string | undefined;
  names?: readonly string[] | undefined;
}

export interface SignatureViewProps {
  names: readonly string[];
}

export interface KeyboardReferenceProps {
  name: string;
}

export interface KeyboardViewProps {
  name: string;
  locale: ExampleLocale;
  texts: DocsTexts;
}

export interface ApiRow {
  readonly name: string;
  readonly type: string;
  readonly default?: string | undefined;
  readonly required?: boolean | undefined;
  readonly description: LocalizedText | undefined;
}

export interface ApiTableProps<T extends ApiRow> {
  title: string;
  columns: readonly NuiTableColumn<T>[];
  rows: readonly T[];
  locale: ExampleLocale;
  requiredLabel?: string | undefined;
}

export interface ApiKeyboardProps {
  keys: readonly ReferenceKey[];
  locale: ExampleLocale;
  texts: DocsTexts;
}

export interface ApiStylesProps {
  styles: ReferenceStyles;
  texts: DocsTexts;
}

export interface DocsConfiguratorProps {
  name: string;
}

export interface ConfiguratorViewProps {
  name: string;
  locale: ExampleLocale;
  texts: DocsTexts;
}

export interface ConfiguratorFrameProps {
  component: ComponentReference;
  locale: ExampleLocale;
  texts: DocsTexts;
}

export interface InlineSegment {
  readonly text: string;
  readonly code: boolean;
}

export interface InlineTextProps {
  text: string;
}

export interface PreviewFrameProps {
  texts: DocsTexts;
  options: readonly PreviewOption[];
}

export type PreviewOption = 'dark' | 'rtl';

export interface PreviewOptionsProps {
  texts: DocsTexts;
}

export interface ConfiguratorControlProps {
  prop: ReferenceProp;
  state: ConfiguratorState;
  locale: ExampleLocale;
}

export interface ConfiguratorControlEmits {
  change: [change: ConfiguratorChange];
}

export const DocsAccent = {
  Indigo: 'indigo',
  Blue: 'blue',
  Violet: 'violet',
  Emerald: 'emerald',
  Teal: 'teal',
  Rose: 'rose',
  Amber: 'amber',
  Slate: 'slate',
} as const;
