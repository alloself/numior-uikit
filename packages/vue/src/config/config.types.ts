import type { IconRegistry, TodayProvider } from '@numior/primitives';

export interface NuiConfigProviderProps {
  icons?: IconRegistry | undefined;
  locale?: string | undefined;
  today?: TodayProvider | undefined;
}
