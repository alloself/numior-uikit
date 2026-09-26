import type { NuiMessageCatalog } from '@numior/primitives';

export interface NuiCalendarMessages {
  readonly previous: string;
  readonly next: string;
  readonly month: string;
  readonly year: string;
  readonly today: string;
  readonly week: string;
}

export const calendarMessages: NuiMessageCatalog<'calendar'> = {
  namespace: 'calendar',
  en: {
    previous: 'Previous month',
    next: 'Next month',
    month: 'Choose month',
    year: 'Choose year',
    today: 'Today',
    week: 'Week',
  },
  ru: {
    previous: 'Предыдущий месяц',
    next: 'Следующий месяц',
    month: 'Выбрать месяц',
    year: 'Выбрать год',
    today: 'Сегодня',
    week: 'Неделя',
  },
};
