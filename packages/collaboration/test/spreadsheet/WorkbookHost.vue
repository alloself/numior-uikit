<template>
  <NuiCollabFailure v-if="failure !== undefined" :failure="failure" @rejoin="rejoin" />
  <NuiSpreadsheet
    v-if="ready"
    :book="book"
    :calculator="calculator"
    :collaboration="document"
    :readonly="readOnly"
    :peers="peers"
    :label="LABEL"
    @change="sync"
    @presence="sharePlace"
  />
</template>

<script setup lang="ts">
import { NuiSpreadsheet } from '@numior/spreadsheet';
import { createCalculator, createWorkbook, type WorkbookUser } from '@numior/spreadsheet/core';
import type { CollabTransport } from '../../src';
import { useCollabWorkbook } from '../../src/spreadsheet';
import { NuiCollabFailure } from '../../src/vue';

const LABEL = 'Book';

const { transport, user } = defineProps<{
  transport: CollabTransport;
  user: WorkbookUser;
}>();

const book = createWorkbook();

const calculator = createCalculator(book);

const { document, ready, readOnly, peers, failure, sync, sharePlace, rejoin } = useCollabWorkbook({
  doc: 'book',
  user,
  transport,
  book,
  calculator,
});
</script>
