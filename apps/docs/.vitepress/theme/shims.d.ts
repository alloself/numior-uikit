declare module '@localSearchIndex' {
  const indexes: Record<string, () => Promise<{ default: string }>>;

  export default indexes;
}

declare module 'virtual:nui-examples' {
  const registry: import('../examples/example.types').ExampleRegistry;

  export default registry;
}

declare module 'virtual:nui-reference' {
  interface ReferenceRegistry {
    readonly components: Readonly<
      Record<
        string,
        () => Promise<{
          readonly default: import('../reference/reference.types').ComponentReference | null;
        }>
      >
    >;
    readonly catalogs: Readonly<
      Record<
        string,
        () => Promise<{
          readonly default: import('../reference/reference.types').CatalogReference | null;
        }>
      >
    >;
    readonly declarations: Readonly<
      Record<
        string,
        () => Promise<{
          readonly default: import('../reference/reference.types').DeclarationSlice | null;
        }>
      >
    >;
  }

  const registry: ReferenceRegistry;

  export default registry;
}

declare module 'virtual:nui-reference/tokens' {
  const tokens: readonly import('../reference/reference.types').TokenReference[];

  export default tokens;
}

declare module 'virtual:nui-reference/icons' {
  const icons: readonly import('../reference/reference.types').IconReference[];

  export default icons;
}
