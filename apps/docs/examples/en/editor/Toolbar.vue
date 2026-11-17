<template>
  <div class="flex w-full flex-col gap-3">
    <NuiToggleGroup
      v-model="mode"
      :items="modes"
      variant="segmented"
      required
      label="Formatting bar"
      class="self-start"
    />
    <NuiEditor v-model="note" :toolbar="mode ?? undefined" aria-label="Order comment" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiEditor, type NuiEditorToolbarMode } from '@numior/kit/editor';
import { NuiToggleGroup, type NuiToggleItem } from '@numior/kit';

const mode = ref<NuiEditorToolbarMode | null>('both');

const modes: readonly NuiToggleItem<NuiEditorToolbarMode>[] = [
  { value: 'fixed', label: 'On top' },
  { value: 'bubble', label: 'At selection' },
  { value: 'both', label: 'Both' },
  { value: 'none', label: 'No bar' },
];

const note = ref(
  '<p>The customer asks to deliver the armchair <strong>after 6 PM</strong> and carry it up to the fifth floor: the elevator is out of order.</p>',
);
</script>
