<template>
  <section
    class="nui-spreadsheet-pivot__area"
    :class="{
      'nui-spreadsheet-pivot__area--target': target !== undefined,
      'nui-spreadsheet-pivot__area--empty': view.chips.length === 0,
    }"
    :aria-labelledby="titleId"
  >
    <h3 :id="titleId" class="nui-spreadsheet-pivot__area-title">{{ view.label }}</h3>
    <ol class="nui-spreadsheet-pivot__chips" role="list">
      <li v-for="chip in view.chips" :key="chip.key" class="nui-spreadsheet-pivot__slot">
        <NuiMenu :items="menuOf(chip)" :label="menuLabel(chip)" placement="bottom-start" lazy>
          <template #trigger="{ attrs }">
            <button
              v-bind="attrs"
              type="button"
              class="nui-spreadsheet-pivot__chip"
              :class="{ 'nui-spreadsheet-pivot__chip--grabbed': chip.key === grabbed }"
              :disabled="readonly"
              :title="chip.label"
              @pointerdown="emit('grab', chip, $event)"
              @keydown="emit('chipKeydown', chip, $event)"
            >
              <span class="nui-spreadsheet-pivot__chip-text">{{ chip.label }}</span>
              <NuiIcon icon="chevron-down" />
            </button>
          </template>
        </NuiMenu>
      </li>
    </ol>
    <p v-if="view.chips.length === 0" class="nui-spreadsheet-pivot__hint">{{ empty }}</p>
    <span class="nui-spreadsheet-pivot__drop" aria-hidden="true"></span>
  </section>
</template>

<script setup lang="ts">
import { NuiIcon, NuiMenu } from '@numior/vue';
import { useId } from 'vue';
import type { PivotChip, SheetPivotAreaProps } from './pivot-panel.types';

const { view, target, grabbed, readonly, empty, menuOf, menuLabel } =
  defineProps<SheetPivotAreaProps>();

const emit = defineEmits<{
  grab: [chip: PivotChip, event: PointerEvent];
  chipKeydown: [chip: PivotChip, event: KeyboardEvent];
}>();

const titleId = useId();
</script>
