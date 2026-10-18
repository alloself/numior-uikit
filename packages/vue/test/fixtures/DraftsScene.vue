<template>
  <NuiInput
    v-if="control === 'input'"
    model-value=""
    :model-modifiers="{ lazy: true }"
    @update:model-value="emit('record', $event)"
  />
  <NuiTextarea
    v-else-if="control === 'textarea'"
    model-value=""
    :model-modifiers="{ lazy: true }"
    @update:model-value="emit('record', $event)"
  />
  <NuiNumberField
    v-else-if="control === 'number'"
    :model-value="null"
    @update:model-value="emit('record', $event)"
  />
  <NuiCombobox
    v-else-if="control === 'combobox'"
    :options="FRUITS"
    :custom-value="asText"
    :model-value="undefined"
    @update:model-value="emit('record', $event)"
  />
  <NuiTimeField
    v-else
    model-value="23:30"
    max="22:00"
    @update:model-value="emit('record', $event)"
  />
</template>

<script setup lang="ts">
import { provideDraftCommits } from '@numior/primitives';
import { NuiCombobox, NuiInput, NuiNumberField, NuiTextarea, NuiTimeField } from '../../src';
import { FRUITS } from '../support/options';

const { control } = defineProps<{
  control: 'input' | 'textarea' | 'number' | 'combobox' | 'time';
}>();

const emit = defineEmits<{ record: [value: unknown] }>();

const drafts = provideDraftCommits();

const asText = (text: string): string => text;

defineExpose({ drafts });
</script>
