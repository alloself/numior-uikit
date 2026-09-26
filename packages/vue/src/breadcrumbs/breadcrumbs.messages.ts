import type { NuiMessageCatalog } from '@numior/primitives';

export interface NuiBreadcrumbsMessages {
  readonly label: string;
  readonly more: string;
}

export const breadcrumbsMessages: NuiMessageCatalog<'breadcrumbs'> = {
  namespace: 'breadcrumbs',
  en: { label: 'Breadcrumb', more: 'Show path' },
  ru: { label: 'Навигационная цепочка', more: 'Показать путь' },
};
