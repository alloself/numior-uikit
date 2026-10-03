<template>
  <NuiButton variant="outline" @click="open = true">Terms of service</NuiButton>
  <NuiDialog v-model:open="open" :title="TITLE" :description="DESCRIPTION">
    <p v-for="term in TERMS" :key="term">{{ term }}</p>
    <template #footer>
      <NuiButton variant="ghost" tone="neutral" @click="open = false">Cancel</NuiButton>
      <NuiButton @click="open = false">Accept</NuiButton>
    </template>
  </NuiDialog>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiButton, NuiDialog } from '@numior/vue';

const TITLE = 'Terms of service';
const DESCRIPTION = 'Read to the end to accept.';

const TERM =
  'The service keeps project data while the account is active and deletes it thirty days after closing.';

const TERMS = Array.from({ length: 12 }, (_, index) => `${index + 1}. ${TERM}`);

const open = ref(false);
</script>
