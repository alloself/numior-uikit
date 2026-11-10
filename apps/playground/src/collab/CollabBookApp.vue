<template>
  <main class="collab">
    <div class="collab__bar">
      <span>{{ clientId }}</span>
      <NuiCollabPresence :peers="peers" data-testid="collab-peers" />
      <div class="collab__status">
        <NuiSwitch v-model="online" label="Связь" data-testid="collab-link" />
        <NuiBadge data-testid="collab-status">{{ status.kind }}</NuiBadge>
      </div>
    </div>
    <NuiSpreadsheet
      v-if="ready"
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
  type CollabStatus,
} from '@numior/collaboration';
import { NuiCollabPresence } from '@numior/collaboration/vue';
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
import { NuiBadge, NuiSwitch } from '@numior/vue';
import { onBeforeUnmount, ref, shallowRef } from 'vue';
import { collabServerOf } from './collab-server';
import { useDemoLink } from './use-demo-link';

const params = new URLSearchParams(location.search);
const clientId = params.get('user') ?? 'Гость';
const server = collabServerOf(params);

const user = { id: clientId, name: clientId };

const status = shallowRef<CollabStatus>({ kind: CollabStatusKind.Connecting });
const peers = shallowRef<readonly WorkbookPeer[]>([]);
const ready = ref(false);

const book = createWorkbook();
const calculator = createCalculator(book, { locale: RU_LOCALE });
const session = createWorkbookDocument({ book, calculator });

session.subscribe(() => {
  ready.value = true;
});

const { online, transport } = useDemoLink(webSocketTransport(server));

const client = createCollabClient({
  doc: params.get('doc') ?? 'book-demo',
  clientId,
  schema: WORKBOOK_SCHEMA,
  document: session,
  transport,
  onStatus: (next) => {
    status.value = next;
  },
  onPresence: (states) => {
    peers.value = workbookPeers(states);
  },
});

client.setPresence({ user });

const sync = (): void => {
  client.sync();
};

const sharePlace = (place: NuiSpreadsheetPlace | undefined): void => {
  client.setPresence({ user, place });
};

onBeforeUnmount(() => {
  client.stop();
});
</script>
