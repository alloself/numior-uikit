<template>
  <main class="collab">
    <div class="collab__bar">
      <span>{{ clientId }}</span>
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
      label="Книга"
      data-testid="collab-book"
      @change="sync"
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
import { NuiSpreadsheet } from '@numior/spreadsheet';
import {
  RU_LOCALE,
  WORKBOOK_SCHEMA,
  createCalculator,
  createWorkbook,
  createWorkbookDocument,
} from '@numior/spreadsheet/core';
import { NuiBadge, NuiSwitch } from '@numior/vue';
import { onBeforeUnmount, ref, shallowRef } from 'vue';
import { useDemoLink } from './use-demo-link';

const params = new URLSearchParams(location.search);
const clientId = params.get('user') ?? 'Гость';
const server = params.get('server') ?? `ws://${location.hostname}:4175`;

const status = shallowRef<CollabStatus>({ kind: CollabStatusKind.Connecting });
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
});

const sync = (): void => {
  client.sync();
};

onBeforeUnmount(() => {
  client.stop();
});
</script>
