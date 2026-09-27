<template>
  <div v-if="prop.kind === 'enum' && short" class="nui-flex nui-flex-col nui-gap-1">
    <span class="nui-text-sm nui-font-medium">{{ prop.name }}</span>
    <NuiToggleGroup
      :model-value="state.enums[prop.name] ?? null"
      :items="options"
      :label="prop.name"
      variant="segmented"
      size="sm"
      @update:model-value="setEnum"
    />
  </div>
  <NuiSelect
    v-else-if="prop.kind === 'enum'"
    :model-value="state.enums[prop.name] ?? null"
    :options="options"
    :label="prop.name"
    size="sm"
    @update:model-value="setEnum"
  />
  <NuiSwitch
    v-else-if="prop.kind === 'boolean'"
    :model-value="state.flags[prop.name] ?? false"
    :label="prop.name"
    size="sm"
    @update:model-value="setFlag"
  />
  <NuiNumberField
    v-else-if="prop.kind === 'number'"
    :model-value="state.numbers[prop.name] ?? null"
    :label="prop.name"
    size="sm"
    @update:model-value="setNumber"
  />
  <NuiInput
    v-else
    :model-value="state.strings[prop.name] ?? ''"
    :label="prop.name"
    size="sm"
    @update:model-value="setString"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { NuiInput, NuiNumberField, NuiSelect, NuiSwitch, NuiToggleGroup } from '@numior/vue';
import type { ConfiguratorControlEmits, ConfiguratorControlProps } from '../theme.types';

const SHORT_ENUM = 5;

const { prop, state } = defineProps<ConfiguratorControlProps>();
const emit = defineEmits<ConfiguratorControlEmits>();

const short = computed(() => (prop.values?.length ?? 0) <= SHORT_ENUM);
const options = computed(() => (prop.values ?? []).map((value) => ({ value, label: value })));

const setEnum = (value: string | null): void => {
  emit('change', { kind: 'enum', name: prop.name, value });
};

const setFlag = (value: boolean): void => {
  emit('change', { kind: 'boolean', name: prop.name, value });
};

const setNumber = (value: number | null): void => {
  emit('change', { kind: 'number', name: prop.name, value });
};

const setString = (value: string): void => {
  emit('change', { kind: 'string', name: prop.name, value });
};
</script>
