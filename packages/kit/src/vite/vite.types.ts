export interface KitComponent {
  readonly from: string;
  readonly styles: readonly string[];
}

export interface KitManifest {
  readonly order: readonly string[];
  readonly components: Readonly<Record<string, KitComponent>>;
  readonly exports: Readonly<Record<string, readonly string[]>>;
}

export interface NumiorOptions {
  readonly tailwind?: boolean;
  readonly components?: boolean;
  readonly styles?: boolean;
}

export interface ScanSource {
  readonly base: string;
  readonly pattern: string;
  readonly negated: boolean;
}

export interface KitStylesheet {
  readonly path: string;
  readonly ready: () => Promise<void>;
  readonly grow: (file: string) => Promise<boolean>;
  readonly include: (sources: readonly ScanSource[]) => Promise<boolean>;
}
