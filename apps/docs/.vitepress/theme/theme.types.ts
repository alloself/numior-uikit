import type { Component } from 'vue';
import type { ExampleFile, ExampleLocale } from '../examples/example.types';

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
}

export interface DocsThemeConfig {
  readonly nav: readonly DocsNavItem[];
  readonly sidebar: readonly DocsSidebarGroup[];
  readonly texts: DocsTexts;
  readonly search?: { readonly provider: 'local' } | undefined;
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
