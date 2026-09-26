import type { NuiMessageCatalog } from '@numior/primitives';
import type { NuiTableAnnouncePhase, NuiTableAnnouncement } from './table.types';

export interface NuiTableMessages {
  readonly empty: string;
  readonly select: string;
  readonly selectAll: string;
  readonly expand: string;
  readonly drag: string;
  readonly resize: (params: { readonly label: string }) => string;
  readonly reorder: (params: { readonly label: string }) => string;
  readonly announce: (params: NuiTableAnnouncement) => string;
}

type Announcer = (announcement: NuiTableAnnouncement) => string;

const english: Record<NuiTableAnnouncePhase, Announcer> = {
  grabbed: ({ label, from, count }) =>
    `${label} grabbed, position ${from + 1} of ${count}. Use the arrow keys to move, Space to drop, Escape to cancel.`,
  moved: ({ label, to, count }) => `${label}, position ${to + 1} of ${count}.`,
  dropped: ({ label, to, count }) => `${label} dropped at position ${to + 1} of ${count}.`,
  cancelled: ({ label }) => `${label}, move cancelled.`,
};

const subject = ({ kind, label }: NuiTableAnnouncement): string =>
  `${kind === 'column' ? 'Колонка' : 'Строка'} «${label}»`;

const russian: Record<NuiTableAnnouncePhase, Announcer> = {
  grabbed: (announcement) =>
    `${subject(announcement)} взята, позиция ${announcement.from + 1} из ${announcement.count}. Стрелки перемещают, Пробел отпускает, Escape отменяет.`,
  moved: (announcement) =>
    `${subject(announcement)}: позиция ${announcement.to + 1} из ${announcement.count}.`,
  dropped: (announcement) =>
    `${subject(announcement)} перемещена на позицию ${announcement.to + 1} из ${announcement.count}.`,
  cancelled: (announcement) => `${subject(announcement)}: перемещение отменено.`,
};

export const tableMessages: NuiMessageCatalog<'table'> = {
  namespace: 'table',
  en: {
    empty: 'No data',
    select: 'Select row',
    selectAll: 'Select all rows',
    expand: 'Toggle row',
    drag: 'Reorder row',
    resize: ({ label }) => `Resize ${label}`,
    reorder: ({ label }) => `Reorder ${label}`,
    announce: (announcement) => english[announcement.phase](announcement),
  },
  ru: {
    empty: 'Нет данных',
    select: 'Выбрать строку',
    selectAll: 'Выбрать все строки',
    expand: 'Развернуть строку',
    drag: 'Переставить строку',
    resize: ({ label }) => `Ширина колонки ${label}`,
    reorder: ({ label }) => `Переставить колонку ${label}`,
    announce: (announcement) => russian[announcement.phase](announcement),
  },
};
