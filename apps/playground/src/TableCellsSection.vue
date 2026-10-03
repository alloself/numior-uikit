<template>
  <section class="panel" aria-labelledby="table-cells-title">
    <div class="section-heading">
      <h2 id="table-cells-title">Лист из источника ячеек</h2>
      <span class="tag">tableCells · nextEdge · 1 048 576 × 16 384</span>
    </div>
    <div class="data-row">
      <NuiButton
        size="sm"
        variant="outline"
        tone="neutral"
        data-testid="table-cells-toggle"
        @click="toggle"
      >
        {{ cells ? 'Скрыть лист' : 'Показать лист' }}
      </NuiButton>
    </div>
    <template v-if="cells">
      <NuiTable
        v-model:ranges="ranges"
        v-bind="cells"
        :column-menu="false"
        bordered
        size="sm"
        height="20rem"
        label="Лист из источника ячеек"
        data-testid="table-cells"
      />
      <pre class="output" data-testid="table-cells-output">{{ output }}</pre>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue';
import { NuiButton } from '@numior/vue';
import { NuiTable, tableCells, type NuiTableCells, type NuiTableRanges } from '@numior/table';
import { bigSheet } from './sheet-source';

const cells = shallowRef<NuiTableCells>();
const ranges = ref<NuiTableRanges>([]);

const output = computed(() => JSON.stringify({ ranges: ranges.value }));

const toggle = (): void => {
  cells.value = cells.value === undefined ? tableCells(bigSheet) : undefined;
  ranges.value = [];
};
</script>
