import {
  diffDocs,
  fromJSON,
  replaceDocument,
  toJSON,
  type Doc,
  type DocJSON,
  type Schema,
} from '@numior/editor-core';
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue';
import type { DocumentVersion } from '../history/history.types';
import type { CollabHistory, UseEditorHistoryOptions } from './collab.types';

interface LoadedVersion {
  readonly doc: Doc;
  readonly older: Doc | undefined;
}

const NO_VERSIONS: readonly DocumentVersion[] = [];

const parsed = (schema: Schema, json: DocJSON | undefined): Doc | undefined => {
  if (json === undefined) {
    return undefined;
  }

  const result = fromJSON(schema, json);

  return result.ok ? result.doc : undefined;
};

export const useEditorHistory = (options: UseEditorHistoryOptions): CollabHistory => {
  const { doc, user, adapter, editor } = options;
  const stored = shallowRef<readonly DocumentVersion[]>(NO_VERSIONS);
  const selected = shallowRef<string>();
  const loaded = shallowRef<LoadedVersion>();
  const comparing = ref(true);
  const loading = ref(false);
  const failed = ref(false);
  const documents = new Map<string, DocJSON>();
  const lifetime = new AbortController();

  let request: AbortController | undefined;

  const versions = computed(() =>
    stored.value.toSorted((a, b) => b.createdAt.localeCompare(a.createdAt)),
  );

  const diff = computed(() => {
    const version = loaded.value;

    return comparing.value && version?.older !== undefined
      ? diffDocs(version.older, version.doc)
      : undefined;
  });

  const preview = computed(() => diff.value?.doc ?? loaded.value?.doc);

  const changes = computed(() => diff.value?.changes);

  const attempt = async <T>(
    action: () => Promise<T>,
    signal: AbortSignal,
  ): Promise<T | undefined> => {
    failed.value = false;

    try {
      return await action();
    } catch {
      failed.value = !signal.aborted;
      return undefined;
    }
  };

  const fetched = async (id: string, signal: AbortSignal): Promise<DocJSON> => {
    const known = documents.get(id) ?? (await adapter.load(doc, id, signal));

    documents.set(id, known);
    return known;
  };

  const olderThan = (id: string): string | undefined =>
    versions.value[versions.value.findIndex((version) => version.id === id) + 1]?.id;

  const compare = (value: boolean): void => {
    comparing.value = value;
  };

  const close = (): void => {
    request?.abort();
    selected.value = undefined;
    loaded.value = undefined;
    loading.value = false;
  };

  const open = async (id: string): Promise<void> => {
    const schema = editor()?.state()?.doc.schema;

    if (schema === undefined) {
      return;
    }
    close();

    const current = new AbortController();
    const older = olderThan(id);

    request = current;
    selected.value = id;
    loading.value = true;

    const pair = await attempt(
      () =>
        Promise.all([
          fetched(id, current.signal),
          older === undefined ? Promise.resolve(undefined) : fetched(older, current.signal),
        ]),
      current.signal,
    );

    if (current.signal.aborted) {
      return;
    }
    loading.value = false;

    const version = parsed(schema, pair?.[0]);

    failed.value = version === undefined;

    loaded.value =
      version === undefined ? undefined : { doc: version, older: parsed(schema, pair?.[1]) };
  };

  const save = async (label?: string): Promise<void> => {
    const state = editor()?.state();

    if (state === undefined || adapter.save === undefined) {
      return;
    }

    const version = await attempt(
      async () => adapter.save?.(doc, { document: toJSON(state.doc), author: user, label }),
      lifetime.signal,
    );

    if (version === undefined) {
      return;
    }

    stored.value = [...stored.value, version];
  };

  const restore = (): void => {
    const version = loaded.value?.doc;

    if (version === undefined) {
      return;
    }

    editor()?.run(replaceDocument(version));
    close();
  };

  onMounted(async () => {
    const listed = await attempt(() => adapter.versions(doc, lifetime.signal), lifetime.signal);

    if (listed === undefined) {
      return;
    }

    stored.value = listed;
  });

  onBeforeUnmount(() => {
    lifetime.abort();
    request?.abort();
  });

  return {
    versions,
    selected,
    preview,
    changes,
    comparing,
    compare,
    loading,
    failed,
    canSave: adapter.save !== undefined,
    open,
    close,
    save,
    restore,
  };
};
