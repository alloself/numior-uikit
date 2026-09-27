import type { MarkdownRenderer } from 'vitepress';
import type { Component } from 'vue';
import type { ExampleFile, ExampleLocale } from '../examples/example.types';
import type {
  ComponentReference,
  LocalizedText,
  ReferenceKey,
  ReferenceStyles,
} from '../reference/reference.types';

export interface DocsNavItem {
  readonly text: string;
  readonly link: string;
}

export interface DocsSidebarItem {
  readonly text: string;
  readonly link: string;
}

export interface DocsSidebarGroup {
  readonly text: string;
  readonly items: readonly DocsSidebarItem[];
}

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
  readonly apiParts: string;
  readonly apiModifiers: string;
  readonly apiTokens: string;
  readonly apiKey: string;
  readonly apiText: string;
  readonly configuratorProps: string;
  readonly configuratorContent: string;
}

export interface DocsSearchOptions {
  readonly _render: (source: string, env: unknown, md: MarkdownRenderer) => string;
}

export interface DocsSearchConfig {
  readonly provider: 'local';
  readonly options?: DocsSearchOptions | undefined;
}

export interface DocsThemeConfig {
  readonly nav: readonly DocsNavItem[];
  readonly sidebar: readonly DocsSidebarGroup[];
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
  locale: ExampleLocale;
  texts: DocsTexts;
  heading: boolean;
}

export interface ApiRow {
  readonly name: string;
  readonly type: string;
  readonly default?: string | undefined;
  readonly required?: boolean | undefined;
  readonly description: LocalizedText | undefined;
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
