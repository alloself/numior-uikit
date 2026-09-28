<template>
  <div class="flex items-end gap-2 max-w-sm">
    <NuiInput v-model="link" label="Ссылка для приглашения" readonly />
    <NuiButton variant="outline" tone="neutral" @click="copy(link)">
      {{ copied ? 'Скопировано' : 'Скопировать' }}
    </NuiButton>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiButton, NuiInput } from '@numior/vue';
import { useClipboard } from '@numior/primitives';

const link = ref('https://app.example.com/invite/7f3a');
const { copy, copied } = useClipboard({ copiedDuration: 1500 });
</script>
