<template>
  <form novalidate>
    <FieldProbe
      v-for="spec in shown"
      :key="spec.path"
      :form="form"
      :spec="spec"
      :active="!view.inactive.has(spec.path)"
      :disabled="view.disabled.has(spec.path)"
      :probes="probes"
    />
  </form>
</template>

<script setup lang="ts" generic="V extends object, O">
import { computed } from 'vue';
import { useForm, type UseFormOptions } from '../../src';
import FieldProbe from './FieldProbe.vue';
import type { FieldProbes, FieldSpec, FieldView } from './scenes.types';

const { options, specs, view } = defineProps<{
  options: UseFormOptions<V, O>;
  specs: readonly FieldSpec[];
  view: FieldView;
}>();

const form = useForm<V, O>(options);
const probes: FieldProbes = { fields: new Map(), work: new Map() };
const shown = computed(() => specs.filter((spec) => !view.hidden.has(spec.path)));

defineExpose({ form, probes });
</script>
