<template>
  <div class="flex flex-col gap-3">
    <p class="m-0 text-sm">Нажмите <NuiKbd keys="mod+shift+u" /> — счётчик: {{ count }}</p>
    <NuiSwitch v-model="enabled">Сочетание включено</NuiSwitch>
    <NuiInput
      v-model="note"
      label="Поле ввода"
      description="Сочетание с Ctrl или ⌘ работает и здесь"
    />
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
