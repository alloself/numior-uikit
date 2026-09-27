declare module '@localSearchIndex' {
  const indexes: Record<string, () => Promise<{ default: string }>>;

  export default indexes;
}

declare module 'virtual:nui-examples' {
  import type { ExampleRegistry } from '../examples/example.types';

  const registry: ExampleRegistry;

  export default registry;
}
