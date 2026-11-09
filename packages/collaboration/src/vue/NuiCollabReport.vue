<template>
  <NuiAlert tone="warning" :title="text.reportTitle">
    <ul class="nui-collab-report">
      <li v-for="line in lines" :key="line">{{ line }}</li>
    </ul>
  </NuiAlert>
</template>

<script setup lang="ts">
import { useMessages } from '@numior/primitives';
import { NuiAlert } from '@numior/vue';
import { computed } from 'vue';
import { CollabBlockKind, type CollabBlock } from '../client/client.types';
import { collabMessages, type NuiCollabMessages } from './collab.messages';
import type { NuiCollabReportProps } from './collab.types';

const { report, labels } = defineProps<NuiCollabReportProps>();

const messages = useMessages(collabMessages);

const text = computed(() => ({ ...messages.value, ...labels }));

const lineOf = (block: CollabBlock, texts: NuiCollabMessages): string => {
  switch (block.kind) {
    case CollabBlockKind.Version:
      return texts.reportVersion(block);
    case CollabBlockKind.Step:
      return texts.reportStep(block);
    case CollabBlockKind.Damaged:
      return texts.reportDamaged;
  }
};

const lines = computed(() => [
  ...report.blocks.map((block) => lineOf(block, text.value)),
  ...(report.unsent > 0 ? [text.value.reportUnsent({ count: report.unsent })] : []),
]);
</script>
