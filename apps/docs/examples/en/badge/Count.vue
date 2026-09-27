<template>
  <NuiBadge tone="error" :count="120" label="Unread" />
  <NuiBadge tone="info" :count="7" :max="5" label="Drafts" />
  <NuiBadge tone="success" dot label="Online" />
  <NuiButton variant="outline" tone="neutral" class="nui-relative">
    Notifications
    <NuiBadge tone="error" :count="3" floating label="New notifications" />
  </NuiButton>
</template>

<script setup lang="ts">
import { NuiBadge, NuiButton } from '@numior/vue';
</script>
