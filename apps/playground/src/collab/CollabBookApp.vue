<template>
  <main class="collab">
    <div class="collab__bar">
      <span>{{ clientId }}</span>
      <NuiCollabPresence :peers="peers" data-testid="collab-peers" />
      <div class="collab__status">
        <NuiSwitch v-model="online" label="Связь" data-testid="collab-link" />
        <NuiButton
          variant="ghost"
          tone="neutral"
          size="sm"
          data-testid="collab-garble"
          @click="garble"
          >Сбой</NuiButton
        >
        <NuiBadge data-testid="collab-status">{{ status.kind }}</NuiBadge>
      </div>
    </div>
    <NuiCollabFailure
      v-if="failure !== undefined"
      :failure="failure"
      data-testid="collab-failure"
      @rejoin="reopen"
    />
    <NuiSpreadsheet
      v-if="ready"
      :readonly="failure !== undefined || joining"
      :book="book"
      :calculator="calculator"
      :collaboration="session"
      :peers="peers"
      label="Книга"
      data-testid="collab-book"
      @change="sync"
      @presence="sharePlace"
    />
  </main>
</template>

<script setup lang="ts">
import {
  CollabStatusKind,
  createCollabClient,
  webSocketTransport,
  type CollabClient,
  type CollabStatus,
} from '@numior/collaboration';
import {
  NuiCollabFailure,
  NuiCollabPresence,
  type CollabFailureView,
} from '@numior/collaboration/vue';
import { NuiSpreadsheet, type NuiSpreadsheetPlace } from '@numior/spreadsheet';
import {
  RU_LOCALE,
  WORKBOOK_SCHEMA,
  createCalculator,
  createWorkbook,
  createWorkbookDocument,
  workbookPeers,
  type WorkbookPeer,
} from '@numior/spreadsheet/core';
import { NuiBadge, NuiButton, NuiSwitch } from '@numior/vue';
import { onBeforeUnmount, ref, shallowRef } from 'vue';
import { collabServerOf } from './collab-server';
import { useDemoLink } from './use-demo-link';

const params = new URLSearchParams(location.search);
const clientId = params.get('user') ?? 'Гость';
const server = collabServerOf(params);

const user = { id: clientId, name: clientId };

const status = shallowRef<CollabStatus>({ kind: CollabStatusKind.Connecting });
const peers = shallowRef<readonly WorkbookPeer[]>([]);
const failure = shallowRef<CollabFailureView>();
const ready = ref(false);
const joining = ref(false);

const book = createWorkbook();
const calculator = createCalculator(book, { locale: RU_LOCALE });
const session = createWorkbookDocument({ book, calculator });

session.subscribe(() => {
  ready.value = true;
  joining.value = false;
});

const { online, transport, garble } = useDemoLink(webSocketTransport(server));

let shownPlace: NuiSpreadsheetPlace | undefined;

const join = (): CollabClient => {
  const joined = createCollabClient({
    doc: params.get('doc') ?? 'book-demo',
    clientId,
    schema: WORKBOOK_SCHEMA,
    document: session,
    transport,
    onStatus: (next) => {
      status.value = next;

      if (next.kind !== CollabStatusKind.Failed) {
        return;
      }

      failure.value = { reason: next.reason, unsent: session.pending().length };
    },
    onPresence: (states) => {
      peers.value = workbookPeers(states);
    },
  });

  joined.setPresence({ user, place: shownPlace });
  return joined;
};

let client = join();

const sync = (): void => {
  client.sync();
};

const reopen = (): void => {
  client.stop();
  session.reset();
  failure.value = undefined;
  joining.value = true;
  client = join();
};

const sharePlace = (place: NuiSpreadsheetPlace | undefined): void => {
  shownPlace = place;
  client.setPresence({ user, place });
};

onBeforeUnmount(() => {
  client.stop();
});
</script>
