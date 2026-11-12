<template>
  <div class="flex w-full flex-col gap-3">
    <NuiToggleGroup
      v-model="mode"
      :items="modes"
      variant="segmented"
      required
      label="Панель форматирования"
      class="self-start"
    />
    <NuiEditor v-model="note" :toolbar="mode ?? undefined" aria-label="Комментарий к заказу" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiEditor, type NuiEditorToolbarMode } from '@numior/editor-vue';
import { NuiToggleGroup, type NuiToggleItem } from '@numior/vue';

const mode = ref<NuiEditorToolbarMode | null>('both');

const modes: readonly NuiToggleItem<NuiEditorToolbarMode>[] = [
  { value: 'fixed', label: 'Сверху' },
  { value: 'bubble', label: 'У выделения' },
  { value: 'both', label: 'Обе' },
  { value: 'none', label: 'Без панели' },
];

const note = ref(
  '<p>Покупатель просит доставить кресло <strong>после 18:00</strong> и поднять его на пятый этаж: лифт не работает.</p>',
);
</script>
