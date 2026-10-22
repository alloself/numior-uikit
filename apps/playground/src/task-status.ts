export type TaskStatus = (typeof TASK_STATUSES)[number]['value'];

export const TASK_STATUSES = [
  { value: 'todo', label: 'К выполнению' },
  { value: 'doing', label: 'В работе' },
  { value: 'done', label: 'Готово' },
] as const;

export const taskStatusOf = (value: unknown): TaskStatus =>
  TASK_STATUSES.find((status) => status.value === value)?.value ?? 'todo';

export const taskStatusLabel = (value: unknown): string =>
  TASK_STATUSES.find((status) => status.value === value)?.label ?? TASK_STATUSES[0].label;
