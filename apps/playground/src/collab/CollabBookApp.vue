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
      @rejoin="rejoin"
    />
    <NuiSpreadsheet
      v-if="ready"
      :readonly="readOnly"
      :book="book"
      :calculator="calculator"
      :collaboration="document"
      :peers="peers"
      label="Книга"
      data-testid="collab-book"
      @change="sync"
      @presence="sharePlace"
    />
  </main>
</template>

<script setup lang="ts">
import { webSocketTransport } from '@numior/collaboration';
import { useCollabWorkbook } from '@numior/collaboration/spreadsheet';
import { NuiCollabFailure, NuiCollabPresence } from '@numior/collaboration/vue';
import { NuiSpreadsheet } from '@numior/spreadsheet';
import { RU_LOCALE, createCalculator, createWorkbook } from '@numior/spreadsheet/core';
import { NuiBadge, NuiButton, NuiSwitch } from '@numior/vue';
import { collabServerOf } from './collab-server';
import { useDemoLink } from './use-demo-link';

const params = new URLSearchParams(location.search);
const clientId = params.get('user') ?? 'Гость';
const server = collabServerOf(params);

const book = createWorkbook();
const calculator = createCalculator(book, { locale: RU_LOCALE });

const { online, transport, garble } = useDemoLink(webSocketTransport(server));

const { document, ready, readOnly, status, peers, failure, sync, sharePlace, rejoin } =
  useCollabWorkbook({
    doc: params.get('doc') ?? 'book-demo',
    clientId,
    user: { id: clientId, name: clientId },
    transport,
    book,
    calculator,
  });
</script>
