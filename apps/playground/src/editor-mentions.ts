import type { NuiEditorMention, NuiEditorMentions } from '@numior/editor-vue';

const DELAY_MS = 300;

const MATCH_LIMIT = 5;

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
      resolve(
        TEAM.reduce<NuiEditorMention[]>((found, person) => {
          if (found.length < MATCH_LIMIT && person.label.toLowerCase().includes(needle)) {
            found.push(person);
          }

          return found;
        }, []),
      );
    }, DELAY_MS);

    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('Search cancelled', 'AbortError'));
    });
  });
