import type { DocJSON } from '@numior/editor-core';
import { shallowRef } from 'vue';
import type { CollabAlternative, DocumentVersion, HistoryAdapter } from '../../src';
import type { CollabAlternatives } from '../../src/vue';

export interface FakeHistoryAdapter extends HistoryAdapter {
  readonly saved: () => readonly DocJSON[];
  readonly failNextLoad: () => void;
  readonly holdLoad: (id: string) => () => void;
}

export interface FakeAlternatives extends CollabAlternatives {
  readonly applied: () => readonly CollabAlternative[];
  readonly revealed: () => readonly CollabAlternative[];
}

export interface StoredVersion {
  readonly id: string;
  readonly at: string;
  readonly document: DocJSON;
  readonly label?: string | undefined;
}

const AUTHOR = { id: 'ann', name: 'Ann' };

export const fakeHistoryAdapter = (seed: readonly StoredVersion[] = []): FakeHistoryAdapter => {
  const documents = new Map(seed.map((version) => [version.id, version.document]));
  const held = new Map<string, Promise<void>>();
  const saved: DocJSON[] = [];
  let failing = false;

  let versions: readonly DocumentVersion[] = seed.map(({ id, at, label }) => ({
    id,
    label,
    author: AUTHOR,
    createdAt: at,
  }));

  return {
    saved: () => saved,
    failNextLoad: () => {
      failing = true;
    },
    holdLoad: (id) => {
      let open: (() => void) | undefined;

      held.set(
        id,
        new Promise<void>((resolve) => {
          open = resolve;
        }),
      );

      return () => {
        open?.();
      };
    },
    versions: () => Promise.resolve(versions),
    load: async (_doc, id) => {
      await held.get(id);

      if (failing) {
        failing = false;
        throw new Error('refused');
      }

      const document = documents.get(id);

      if (document === undefined) {
        throw new Error('unknown version');
      }
      return document;
    },
    save: (_doc, { document, author, label }) => {
      const version = {
        id: `saved-${saved.length.toString()}`,
        author,
        label,
        createdAt: '2026-11-09T12:00:00.000Z',
      };

      saved.push(document);
      documents.set(version.id, document);
      versions = [...versions, version];
      return Promise.resolve(version);
    },
  };
};

export const fakeAlternatives = (initial: readonly CollabAlternative[]): FakeAlternatives => {
  const list = shallowRef(initial);
  const applied: CollabAlternative[] = [];
  const revealed: CollabAlternative[] = [];

  return {
    list,
    applied: () => applied,
    revealed: () => revealed,
    apply: (alternative) => {
      applied.push(alternative);
    },
    reveal: (alternative) => {
      revealed.push(alternative);
    },
    dismiss: (alternative) => {
      list.value = list.value.filter((item) => item !== alternative);
    },
  };
};
