<template>
  <NuiAlert
    class="w-full"
    tone="error"
    title="Payment for order 20412 failed"
    description="The bank declined the card. Alina Yusuf got an email with a link to pay again."
  />
</template>

<script setup lang="ts">
import { NuiAlert } from '@numior/vue';
</script>
