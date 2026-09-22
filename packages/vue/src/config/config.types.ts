import type { IconRegistry } from '@numior/primitives';

export interface NuiConfigProviderProps {
  /** Icon aliases for this subtree, layered over any provider above. */
  icons?: IconRegistry;
}
