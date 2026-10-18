<template>
  <EngineFieldProbe
    v-for="probe in shown"
    :key="probe.name"
    :engine="engine"
    :probe="probe"
    :found="(entry) => fields.set(probe.name, entry)"
  />
</template>

<script setup lang="ts" generic="V extends object">
import { computed } from 'vue';
import type { EntryState, FormEngineFactory } from '../../src/engine/engine.types';
import EngineFieldProbe from './EngineFieldProbe.vue';
import type { EngineProbe } from './scenes.types';

const {
  factory,
  initialValues,
  probes,
  arrays = [],
} = defineProps<{
  factory: FormEngineFactory;
  initialValues: V;
  probes: readonly EngineProbe[];
  arrays?: readonly string[] | undefined;
}>();

const engine = factory(initialValues);
const lists = new Map(arrays.map((path) => [path, engine.array(() => path)] as const));
const fields = new Map<string, EntryState>();
const shown = computed(() => probes.filter((probe) => probe.visible));

defineExpose({ engine, fields, lists });
</script>
