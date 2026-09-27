<template>
  <div class="nui-flex nui-flex-col nui-gap-3">
    <p class="nui-m-0 nui-text-sm">Press <NuiKbd keys="mod+shift+u" /> — counter: {{ count }}</p>
    <NuiSwitch v-model="enabled">Combo enabled</NuiSwitch>
    <NuiInput v-model="note" label="Input" description="A combo with Ctrl or ⌘ works here too" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiInput, NuiKbd, NuiSwitch } from '@numior/vue';
import { useHotkey } from '@numior/primitives';

const count = ref(0);
const enabled = ref(true);
const note = ref('');

useHotkey('mod+shift+u', () => count.value++, { enabled: () => enabled.value });
</script>
