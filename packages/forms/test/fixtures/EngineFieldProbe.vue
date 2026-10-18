<template>
  <i />
</template>

<script setup lang="ts" generic="V extends object">
import type { EntryState, FormEngine } from '../../src/engine/engine.types';
import type { EngineProbe } from './scenes.types';

const { engine, probe, found } = defineProps<{
  engine: FormEngine<V>;
  probe: EngineProbe;
  found: (entry: EntryState) => void;
}>();

found(
  engine.field(
    () => probe.path,
    () => undefined,
  ),
);
</script>
