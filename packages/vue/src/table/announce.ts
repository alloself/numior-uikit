import type { NuiTableAnnouncement } from './table.types';

export const defaultAnnounce = (announcement: NuiTableAnnouncement): string => {
  const { label, phase, from, to, count } = announcement;
  if (phase === 'grabbed') {
    return `${label} grabbed, position ${from + 1} of ${count}. Use the arrow keys to move, Space to drop, Escape to cancel.`;
  }
  if (phase === 'moved') {
    return `${label}, position ${to + 1} of ${count}.`;
  }
  if (phase === 'dropped') {
    return `${label} dropped at position ${to + 1} of ${count}.`;
  }
  return `${label}, move cancelled.`;
};

export const moveItem = <T>(list: readonly T[], from: number, to: number): T[] => {
  const next = [...list];
  const [item] = next.splice(from, 1);
  if (item !== undefined) {
    next.splice(to, 0, item);
  }
  return next;
};
