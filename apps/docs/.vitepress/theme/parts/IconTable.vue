<template>
  <div class="nui-not-prose mb-5 flex flex-col gap-3">
    <NuiInput v-model="query" type="search" :label="texts.iconSearch" class="max-w-xs" />
    <NuiTable
      :columns="columns"
      :rows="found"
      :get-key="keyOf"
      :label="texts.icons"
      :column-menu="false"
      size="sm"
    >
      <template #cell-glyph="{ row }">
        <NuiIcon v-if="isIconAlias(row.alias)" :icon="row.alias" />
      </template>
      <template #cell-alias="{ row }">
        <code>{{ row.alias }}</code>
      </template>
      <template #cell-icon="{ row }">
        <code>{{ row.icon }}</code>
      </template>
      <template #cell-copy="{ row }">
        <NuiButton
          variant="ghost"
          tone="neutral"
          size="xs"
          icon-only
          :icon="copiedName === row.alias ? 'check' : 'copy'"
          :aria-label="`${texts.iconCopy} ${row.alias}`"
          @click="copy(row.alias)"
        />
      </template>
    </NuiTable>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { iconAliases, useClipboard, type IconAlias } from '@numior/primitives';
import { NuiTable, type NuiTableColumn } from '@numior/table';
import { NuiButton, NuiIcon, NuiInput } from '@numior/vue';
import type { IconReference } from '../../reference/reference.types';
import type { IconTableProps } from '../theme.types';

const { icons, texts } = defineProps<IconTableProps>();

const query = ref('');
const copiedAlias = ref('');
const clipboard = useClipboard();

const isIconAlias = (name: string): name is IconAlias => Object.hasOwn(iconAliases, name);

const textColumn = (
  key: string,
  label: string,
  width: number,
  value: (row: IconReference) => string,
): NuiTableColumn<IconReference> => ({ key, label, type: 'text', filter: false, width, value });

const nameColumn = (
  key: string,
  label: string,
  value: (row: IconReference) => string,
): NuiTableColumn<IconReference> => ({
  ...textColumn(key, label, 120, value),
  flex: 1,
  wrap: true,
});

const columns = computed<NuiTableColumn<IconReference>[]>(() => [
  textColumn('glyph', texts.iconGlyph, 56, () => ''),
  nameColumn('alias', texts.iconName, (row) => row.alias),
  nameColumn('icon', texts.iconLucide, (row) => row.icon),
  textColumn('copy', '', 44, () => ''),
]);

const found = computed(() => {
  const needle = query.value.trim().toLowerCase();

  return needle === ''
    ? icons
    : icons.filter((entry) => entry.alias.includes(needle) || entry.icon.includes(needle));
});

const copiedName = computed(() => (clipboard.copied.value ? copiedAlias.value : ''));

const keyOf = (row: IconReference): string => row.alias;

const copy = (alias: string): void => {
  copiedAlias.value = alias;
  void clipboard.copy(alias);
};
</script>
