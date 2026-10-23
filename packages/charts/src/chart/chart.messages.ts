import type { NuiMessageCatalog } from '@numior/primitives';

export interface NuiChartMessages {
  readonly legend: string;
  readonly category: string;
  readonly empty: string;
}

export const chartMessages: NuiMessageCatalog<NuiChartMessages> = {
  namespace: 'chart',
  en: {
    legend: 'Legend',
    category: 'Category',
    empty: 'No data to show',
  },
  ru: {
    legend: 'Легенда',
    category: 'Категория',
    empty: 'Нет данных для графика',
  },
};
