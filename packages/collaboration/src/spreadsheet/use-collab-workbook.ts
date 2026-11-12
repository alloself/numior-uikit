import {
  WORKBOOK_SCHEMA,
  createWorkbookDocument,
  workbookPeers,
  type WorkbookPeer,
  type WorkbookPlace,
} from '@numior/spreadsheet/core';
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue';
import { createCollabClient } from '../client/client';
import {
  CollabStatusKind,
  type CollabClient,
  type CollabFailureView,
  type CollabStatus,
} from '../client/client.types';
import type { CollabWorkbook, UseCollabWorkbookOptions } from './workbook.types';

const NO_PEERS: readonly WorkbookPeer[] = [];

const newClientId = (): string => Math.random().toString(36).slice(2, 10);

export const useCollabWorkbook = (options: UseCollabWorkbookOptions): CollabWorkbook => {
  const { doc, user, transport, book, calculator } = options;
  const clientId = options.clientId ?? newClientId();
  const shared = createWorkbookDocument({ book, calculator });
  const ready = ref(false);
  const joining = ref(false);
  const status = shallowRef<CollabStatus>({ kind: CollabStatusKind.Connecting });
  const peers = shallowRef<readonly WorkbookPeer[]>(NO_PEERS);
  const failure = shallowRef<CollabFailureView>();
  const readOnly = computed(() => failure.value !== undefined || joining.value);

  let client: CollabClient | undefined;
  let place: WorkbookPlace | undefined;
  let stopped = false;

  const stopListening = shared.subscribe(() => {
    ready.value = true;
    joining.value = false;
  });

  const join = (): void => {
    client = createCollabClient({
      doc,
      clientId,
      schema: WORKBOOK_SCHEMA,
      transport,
      document: shared,
      onStatus: (next) => {
        status.value = next;

        if (next.kind !== CollabStatusKind.Failed) {
          return;
        }

        failure.value = { reason: next.reason, unsent: shared.pending().length };
      },
      onPresence: (states) => {
        peers.value = workbookPeers(states);
      },
    });

    client.setPresence({ user, place });
  };

  const sync = (): void => {
    client?.sync();
  };

  const sharePlace = (next: WorkbookPlace | undefined): void => {
    place = next;
    client?.setPresence({ user, place });
  };

  const rejoin = (): void => {
    if (failure.value === undefined || stopped) {
      return;
    }

    client?.stop();
    shared.reset();
    failure.value = undefined;
    joining.value = true;
    peers.value = NO_PEERS;
    status.value = { kind: CollabStatusKind.Connecting };
    join();
  };

  onMounted(join);

  onBeforeUnmount(() => {
    stopped = true;
    client?.stop();
    stopListening();
  });

  return {
    document: shared,
    ready,
    readOnly,
    status,
    peers,
    failure,
    sync,
    sharePlace,
    rejoin,
  };
};
