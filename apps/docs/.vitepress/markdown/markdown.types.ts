export type InstallForm = (typeof InstallForm)[keyof typeof InstallForm];

export interface MarkdownPageEnv {
  readonly relativePath?: string | undefined;
}

export interface InstallComponent {
  readonly stylesheets: readonly string[];
}

export interface InstallSource {
  readonly components: Readonly<Record<string, InstallComponent>>;
  readonly stylesheets: readonly string[];
}

export const InstallForm = {
  Files: 'files',
  Packages: 'packages',
} as const;
