declare module '@localSearchIndex' {
  const indexes: Record<string, () => Promise<{ default: string }>>;

  export default indexes;
}

declare module 'virtual:nui-examples' {
  import type { ExampleRegistry } from '../examples/example.types';

  const registry: ExampleRegistry;

  export default registry;
}

declare module 'virtual:nui-reference' {
  import type {
    CatalogReference,
    ComponentReference,
    DeclarationSlice,
  } from '../reference/reference.types';

  interface ReferenceRegistry {
    readonly components: Readonly<
      Record<string, () => Promise<{ readonly default: ComponentReference | null }>>
    >;
    readonly catalogs: Readonly<
      Record<string, () => Promise<{ readonly default: CatalogReference | null }>>
    >;
    readonly declarations: Readonly<
      Record<string, () => Promise<{ readonly default: DeclarationSlice | null }>>
    >;
  }

  const registry: ReferenceRegistry;

  export default registry;
}
