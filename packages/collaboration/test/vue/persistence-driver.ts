import { createState, fromJSON, toJSON } from '@numior/editor-core';
import { fixtureSchema, generateDoc } from '@numior/editor-core/fixtures';
import type { NuiEditorApi } from '@numior/editor-vue';
import { flushPromises, mount } from '@vue/test-utils';
import { nextTick, shallowRef } from 'vue';
import type { ClientMessage, CollabPersistence, CollabRestored, CollabTransport } from '../../src';
import type { CollabEditor } from '../../src/vue/collab.types';
import PersistenceHost from './PersistenceHost.vue';

interface PersistenceDriver {
  readonly sent: () => readonly ClientMessage[];
  readonly opened: () => number;
  readonly closed: () => number;
  readonly collab: () => CollabEditor;
  readonly mountEditor: () => Promise<void>;
  readonly loaded: () => Promise<void>;
  readonly unmount: () => void;
}

export const snapshotOfFixture = (): unknown =>
  toJSON(generateDoc(fixtureSchema, { blocks: 1, seed: 1 }));

const apiFor = (collab: CollabEditor): NuiEditorApi => {
  const read = fromJSON(fixtureSchema, collab.document.value);

  if (!read.ok) {
    throw new Error('The restored document did not parse');
  }

  const state = createState({ doc: read.doc, plugins: [...collab.plugins.value] });

  return {
    state: () => state,
    run: () => false,
    focus: () => undefined,
    flush: () => undefined,
    coordsAt: () => undefined,
    contentBox: () => undefined,
    revealNode: () => undefined,
  };
};

export const createPersistenceDriver = (
  restored: CollabRestored | undefined,
): PersistenceDriver => {
  const sent: ClientMessage[] = [];
  const editor = shallowRef<NuiEditorApi>();
  let opened = 0;
  let closed = 0;
  let collab: CollabEditor | undefined;

  const transport: CollabTransport = {
    open: (listener) => {
      opened += 1;
      queueMicrotask(listener.opened);

      return {
        send: (message) => {
          sent.push(message);
        },
        close: listener.closed,
      };
    },
  };

  const persistence: CollabPersistence = {
    restore: () => Promise.resolve(restored),
    track: () => undefined,
    close: () => {
      closed += 1;
      return Promise.resolve();
    },
  };

  const wrapper = mount(PersistenceHost, {
    props: {
      options: {
        doc: 'doc',
        user: { id: 'anna', name: 'Анна' },
        schema: fixtureSchema,
        transport,
        editor: () => editor.value,
        persistence,
      },
      capture: (value: CollabEditor) => {
        collab = value;
      },
    },
  });

  const current = (): CollabEditor => {
    if (collab === undefined) {
      throw new Error('The host did not capture the composable');
    }
    return collab;
  };

  return {
    sent: () => sent,
    opened: () => opened,
    closed: () => closed,
    collab: current,
    loaded: async () => {
      await flushPromises();
    },
    mountEditor: async () => {
      editor.value = apiFor(current());
      await nextTick();
      await flushPromises();
    },
    unmount: () => {
      wrapper.unmount();
    },
  };
};
