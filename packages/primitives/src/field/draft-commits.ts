import { inject, onScopeDispose, provide, type InjectionKey } from 'vue';

export interface DraftCommits {
  register(commit: () => void): () => void;
  commitAll(): void;
}

const DRAFT_COMMITS_KEY: InjectionKey<DraftCommits> = Symbol('nui:draft-commits');

export const provideDraftCommits = (): DraftCommits => {
  const commits = new Set<() => void>();

  const drafts: DraftCommits = {
    register: (commit) => {
      commits.add(commit);
      return () => {
        commits.delete(commit);
      };
    },
    commitAll: () => {
      for (const commit of commits) {
        commit();
      }
    },
  };

  provide(DRAFT_COMMITS_KEY, drafts);
  return drafts;
};

export const useDraftCommit = (commit: (() => void) | undefined): void => {
  const drafts = inject(DRAFT_COMMITS_KEY, null);

  if (commit && drafts) {
    onScopeDispose(drafts.register(commit));
  }
};
