import type { NuiMessageCatalog } from '@numior/primitives';

export interface NuiSidebarMessages {
  readonly label: string;
  readonly toggle: string;
}

export const sidebarMessages: NuiMessageCatalog<NuiSidebarMessages> = {
  namespace: 'sidebar',
  en: { label: 'Navigation', toggle: 'Toggle sidebar' },
  ru: { label: 'Навигация', toggle: 'Переключить боковую панель' },
};
