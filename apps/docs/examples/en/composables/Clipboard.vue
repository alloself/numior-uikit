<template>
  <div class="flex items-end gap-2 max-w-sm">
    <NuiInput v-model="link" label="Invite link" readonly />
    <NuiButton variant="outline" tone="neutral" @click="copy(link)">
      {{ copied ? 'Copied' : 'Copy' }}
    </NuiButton>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiButton, NuiInput, useClipboard } from '@numior/kit';

const link = ref('https://app.example.com/invite/7f3a');
const { copy, copied } = useClipboard({ copiedDuration: 1500 });
</script>
