<template>
  <main class="collab">
    <div class="collab__bar">
      <NuiBadge data-testid="collab-status">{{ status.kind }}</NuiBadge>
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
import { NuiBadge } from '@numior/vue';
import { onBeforeUnmount, ref, shallowRef } from 'vue';

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

const client = createCollabClient({
  doc: params.get('doc') ?? 'book-demo',
  clientId,
  schema: WORKBOOK_SCHEMA,
  document: session,
  transport: webSocketTransport(server),
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
