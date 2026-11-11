<template>
  <div class="max-w-sm">
    <NuiSelect v-model="kind" :options="kinds" label="Control kind" />
    <NuiField label="Value" class="mt-3">
      <component :is="entry.component" v-model="value" v-bind="entry.props(props) ? props : {}" />
    </NuiField>
    <p class="m-0 text-sm text-muted-foreground">
      The control returned {{ JSON.stringify(value) }}.
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { NuiField, NuiSelect } from '@numior/vue';
import { kitControls } from '@numior/vue/controls';

const kinds = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'switch', label: 'Switch' },
];

const kind = ref<'text' | 'number' | 'switch'>('text');
const value = ref<string | number | boolean | null>('');
const entry = computed(() => kitControls[kind.value]);
const props = { placeholder: 'Type a value', size: 'sm' } as const;

watch(kind, (next) => {
  value.value = next === 'switch' ? false : next === 'number' ? null : '';
});
</script>
