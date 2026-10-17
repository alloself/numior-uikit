import type { NuiEditorMention, NuiEditorMentions } from '@numior/editor-vue';

const DELAY_MS = 300;

const TEAM: readonly NuiEditorMention[] = [
  { id: 'anna', label: 'Анна', description: 'Дизайн' },
  { id: 'boris', label: 'Борис Ковалёв', description: 'Разработка' },
  { id: 'vera', label: 'Вера Соколова', description: 'Маркетинг' },
  { id: 'gleb', label: 'Глеб Орлов', description: 'Поддержка' },
  { id: 'daria', label: 'Дарья Миронова', description: 'Продукт' },
  { id: 'egor', label: 'Егор Белов', description: 'Аналитика' },
];

export const fakeMentions: NuiEditorMentions = (query, { signal }) =>
  new Promise((resolve, reject) => {
    const needle = query.trim().toLowerCase();

    const timer = setTimeout(() => {
      resolve(TEAM.filter((person) => person.label.toLowerCase().includes(needle)).slice(0, 5));
    }, DELAY_MS);

    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('Search cancelled', 'AbortError'));
    });
  });
