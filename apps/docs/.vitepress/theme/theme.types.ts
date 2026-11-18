import type { NuiTableColumn } from '@numior/table';
import type { NuiCodeProps, ResolvedColorScheme } from '@numior/vue';
import type { MarkdownRenderer } from 'vitepress';
import type { Component } from 'vue';
import type { ConfiguratorChange, ConfiguratorState } from './configurator-code';
import type { SearchFields } from './search-index';
import type { ExampleFile, ExampleLocale, ExampleModule } from '../examples/example.types';
import type {
  CatalogReference,
  ComponentReference,
  IconReference,
  LocalizedText,
  ReferenceKey,
  ReferenceProp,
  TokenReference,
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

export interface NavEntry {
  readonly link: string;
  readonly title: string;
  readonly group: string;
  readonly section: string;
}

export interface NavSection {
  readonly title: NavTitle;
  readonly link?: string | undefined;
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

export type TokenSample = (typeof TokenSample)[keyof typeof TokenSample];

export type TokenSection = (typeof TokenSection)[keyof typeof TokenSection];
export type BlockViewport = (typeof BlockViewport)[keyof typeof BlockViewport];

export interface TokenRow extends TokenReference {
  readonly sample: TokenSample;
  readonly value: string;
}

export type DocsAccent = (typeof DocsAccent)[keyof typeof DocsAccent];
export type ThemePreset = (typeof ThemePreset)[keyof typeof ThemePreset];
export type ThemeFont = (typeof ThemeFont)[keyof typeof ThemeFont];

export interface DocsTexts {
  readonly navigation: string;
  readonly sections: string;
  readonly search: string;
  readonly searchPlaceholder: string;
  readonly searchEmpty: string;
  readonly theme: string;
  readonly light: string;
  readonly dark: string;
  readonly system: string;
  readonly more: string;
  readonly license: string;
  readonly footerSections: string;
  readonly accent: string;
  readonly builtInAccents: string;
  readonly accents: Readonly<Record<DocsAccent, string>>;
  readonly themeBuilder: string;
  readonly themeOptions: string;
  readonly themePreview: string;
  readonly themePreset: string;
  readonly themePresets: Readonly<Record<ThemePreset, string>>;
  readonly themeColor: string;
  readonly themeRadius: string;
  readonly themeFont: string;
  readonly themeFonts: Readonly<Record<ThemeFont, string>>;
  readonly themeCode: string;
  readonly themeCodeLead: string;
  readonly themeFontLead: string;
  readonly themeFontImport: string;
  readonly language: string;
  readonly onThisPage: string;
  readonly pager: string;
  readonly previous: string;
  readonly next: string;
  readonly skip: string;
  readonly editPage: string;
  readonly notFoundTitle: string;
  readonly notFoundText: string;
  readonly notFoundSearch: string;
  readonly notFoundSimilar: string;
  readonly home: string;
  readonly details: string;
  readonly exampleView: string;
  readonly preview: string;
  readonly code: string;
  readonly exampleOptions: string;
  readonly invertTheme: string;
  readonly rtl: string;
  readonly homeScreen: string;
  readonly screenOptions: string;
  readonly copyCode: string;
  readonly blockViewport: string;
  readonly baseTheme: string;
  readonly siteTheme: string;
  readonly viewportDesktop: string;
  readonly viewportTablet: string;
  readonly viewportPhone: string;
  readonly blockOpen: string;
  readonly copied: string;
  readonly exampleFiles: string;
  readonly codeVariants: string;
  readonly tokens: string;
  readonly tokenSample: string;
  readonly tokenName: string;
  readonly tokenValue: string;
  readonly tokenDark: string;
  readonly icons: string;
  readonly iconSearch: string;
  readonly iconGlyph: string;
  readonly iconName: string;
  readonly iconLucide: string;
  readonly iconCopy: string;
  readonly apiProps: string;
  readonly apiModels: string;
  readonly apiEvents: string;
  readonly apiSlots: string;
  readonly apiExposed: string;
  readonly apiKeyboard: string;
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
  readonly description: string;
}

export interface DocsSearchOptions {
  readonly miniSearch: { readonly options: SearchFields };
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

export interface BlockStageProps {
  name: string;
  locale: ExampleLocale;
}

export interface BlockFrameProps {
  name: string;
  src: string;
  height: number;
  files: readonly ExampleFile[];
  texts: DocsTexts;
}

export interface ThemeCompareProps {
  src: string;
  height: number;
  files: readonly ExampleFile[];
  texts: DocsTexts;
}

export interface ThemeFrameProps {
  label: string;
  src: string;
  height: number;
  palette: readonly string[];
}

export interface ScreenState {
  readonly scheme: ResolvedColorScheme;
  readonly accent: string;
  readonly rtl: boolean;
}

export interface FrameTheme {
  readonly classes: readonly string[];
  readonly dir: string;
}

export interface HomeScreenProps {
  src: string;
  height: number;
  texts: DocsTexts;
}

export interface ThemeChoice {
  readonly preset: ThemePreset;
  readonly palette: string;
  readonly radius: string;
  readonly font: ThemeFont;
}

export interface ThemeSources {
  readonly kit: string;
  readonly accents: string;
  readonly site: string;
}

export interface ThemeModel {
  readonly presets: Readonly<Record<ThemePreset, ThemeChoice>>;
  readonly radii: readonly string[];
  readonly overrides: (choice: ThemeChoice) => ReadonlyMap<string, string>;
  readonly preview: (choice: ThemeChoice) => Readonly<Record<string, string>>;
  readonly previewOf: (
    declarations: ReadonlyMap<string, string>,
  ) => Readonly<Record<string, string>>;
  readonly css: (choice: ThemeChoice) => string;
}

export interface ThemeStepProps {
  theme: Readonly<Record<string, string>>;
}

export interface ThemeStepViewProps extends ThemeStepProps {
  locale: ExampleLocale;
  texts: DocsTexts;
}

export interface ThemeBuilderProps {
  preview: Component;
  texts: DocsTexts;
}

export interface ThemeBuilderViewProps {
  locale: ExampleLocale;
  texts: DocsTexts;
}

export interface ExampleFilesProps {
  files: readonly ExampleFile[];
  texts: DocsTexts;
}

export interface DocsTokensProps {
  section: TokenSection;
}

export interface TokensViewProps {
  section: TokenSection;
  texts: DocsTexts;
}

export interface TokenTableProps {
  rows: readonly TokenRow[];
  texts: DocsTexts;
}

export interface TokenSampleProps {
  row: TokenRow;
}

export interface IconTableProps {
  icons: readonly IconReference[];
  texts: DocsTexts;
}

export interface CodeGroupItem {
  readonly label: string;
  readonly code: NuiCodeProps;
}

export interface DocsCodeGroupProps {
  items: readonly CodeGroupItem[];
}

export interface CodeTabsProps {
  items: readonly CodeGroupItem[];
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
  stacked?: boolean | undefined;
  defaultLabel?: string | undefined;
}

export interface ApiKeyboardProps {
  keys: readonly ReferenceKey[];
  locale: ExampleLocale;
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
  scene?: ExampleModule | undefined;
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

export const TokenSample = {
  Color: 'color',
  Radius: 'radius',
  Size: 'size',
  Shadow: 'shadow',
  Font: 'font',
  FontSize: 'font-size',
  FontWeight: 'font-weight',
  None: 'none',
} as const;

export const BlockViewport = {
  Desktop: 'desktop',
  Tablet: 'tablet',
  Phone: 'phone',
} as const;

export const TokenSection = {
  Surfaces: 'surfaces',
  Tones: 'tones',
  States: 'states',
  Shape: 'shape',
  Sizes: 'sizes',
  Type: 'type',
  Code: 'code',
  Effects: 'effects',
} as const;

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

export const ThemePreset = { Base: 'base', Numior: 'numior' } as const;

export const ThemeFont = { Inter: 'inter', Manrope: 'manrope', System: 'system' } as const;
