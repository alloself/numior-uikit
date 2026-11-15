import type { MarkdownRenderer } from 'vitepress';

export type InstallForm = (typeof InstallForm)[keyof typeof InstallForm];

type CoreRule = Parameters<MarkdownRenderer['core']['ruler']['push']>[1];

export type CoreState = Parameters<CoreRule>[0];

export type CoreToken = CoreState['tokens'][number];

export interface MarkdownPageEnv {
  readonly relativePath?: string | undefined;
}

export interface InstallComponent {
  readonly stylesheets: readonly string[];
}

export interface InstallPlan {
  readonly code: string;
  readonly packages: readonly string[];
}

export interface InstallSource {
  readonly components: Readonly<Record<string, InstallComponent>>;
  readonly stylesheets: readonly string[];
}

export const InstallForm = {
  Files: 'files',
  Packages: 'packages',
} as const;
