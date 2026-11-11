<template>
  <div class="max-w-sm">
    <NuiSelect v-model="kind" :options="kinds" label="Тип контрола" />
    <NuiField label="Значение" class="mt-3">
      <component :is="entry.component" v-model="value" v-bind="entry.props(props) ? props : {}" />
    </NuiField>
    <p class="m-0 text-sm text-muted-foreground">Контрол вернул {{ JSON.stringify(value) }}.</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { NuiField, NuiSelect } from '@numior/vue';
import { kitControls } from '@numior/vue/controls';

const kinds = [
  { value: 'text', label: 'Текст' },
  { value: 'number', label: 'Число' },
  { value: 'switch', label: 'Переключатель' },
];

const kind = ref<'text' | 'number' | 'switch'>('text');
const value = ref<string | number | boolean | null>('');
const entry = computed(() => kitControls[kind.value]);
const props = { placeholder: 'Введите значение', size: 'sm' } as const;

watch(kind, (next) => {
  value.value = next === 'switch' ? false : next === 'number' ? null : '';
});
</script>
