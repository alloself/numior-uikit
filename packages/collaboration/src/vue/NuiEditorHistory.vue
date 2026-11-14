<template>
  <section class="nui-collab-history" :aria-label="text.history">
    <header class="nui-collab-history__header">
      <h2 class="nui-collab-history__title">{{ text.history }}</h2>
      <NuiButton v-if="history.canSave" size="sm" variant="soft" @click="history.save()">
        {{ text.saveVersion }}
      </NuiButton>
    </header>

    <NuiAlert v-if="history.failed.value" tone="error" :title="text.historyFailed" />

    <NuiEmpty
      v-if="history.versions.value.length === 0"
      size="sm"
      hide-icon
      :title="text.noVersions"
    />

    <NuiList
      v-else
      selectable="single"
      size="sm"
      :label="text.history"
      :items="entries"
      :model-value="history.selected.value ?? null"
      @update:model-value="pick"
    />

    <NuiEditorVersionPreview
      v-if="history.selected.value !== undefined"
      :history="history"
      :text="text"
    />

    <NuiEditorAlternatives
      v-if="alternatives !== undefined && alternatives.list.value.length > 0"
      :alternatives="alternatives"
      :text="text"
      :time-of="timeOf"
    />
  </section>
</template>

<script setup lang="ts">
import { NuiAlert, NuiButton, NuiEmpty, NuiList, type NuiListEntry } from '@numior/vue';
import { computed } from 'vue';
import { useCollabTexts } from './use-collab-texts';
import type { NuiEditorHistoryProps } from './collab.types';
import NuiEditorAlternatives from './NuiEditorAlternatives.vue';
import NuiEditorVersionPreview from './NuiEditorVersionPreview.vue';

const { history, alternatives, labels } = defineProps<NuiEditorHistoryProps>();

const { text, timeOf } = useCollabTexts(() => labels);

const entries = computed<readonly NuiListEntry<string>[]>(() =>
  history.versions.value.map((version) => {
    const time = timeOf(version.createdAt);

    return {
      value: version.id,
      label: version.label ?? time,
      description:
        version.label === undefined ? version.author.name : `${version.author.name}, ${time}`,
    };
  }),
);

const pick = (id: string | null): void => {
  if (id === null) {
    history.close();
  } else {
    void history.open(id);
  }
};
</script>
