<template>
  <div class="flex flex-col gap-3">
    <p class="m-0 text-sm">Press <NuiKbd keys="mod+shift+u" /> — counter: {{ count }}</p>
    <NuiSwitch v-model="enabled">Combo enabled</NuiSwitch>
    <NuiInput v-model="note" label="Input" description="A combo with Ctrl or ⌘ works here too" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiInput, NuiKbd, NuiSwitch, useHotkey } from '@numior/kit';

const count = ref(0);
const enabled = ref(true);
const note = ref('');

useHotkey('mod+shift+u', () => count.value++, { enabled: () => enabled.value });
</script>
