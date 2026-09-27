<template>
  <NuiCard class="nui-max-w-sm">
    <NuiCardHeader>
      <NuiCardTitle>Team plan</NuiCardTitle>
      <NuiCardDescription>For teams of up to ten people.</NuiCardDescription>
    </NuiCardHeader>
    <NuiCardContent>Shared projects, roles and change history.</NuiCardContent>
    <NuiCardFooter>
      <NuiButton size="sm">Choose</NuiButton>
    </NuiCardFooter>
  </NuiCard>
</template>

<script setup lang="ts">
import {
  NuiButton,
  NuiCard,
  NuiCardContent,
  NuiCardDescription,
  NuiCardFooter,
  NuiCardHeader,
  NuiCardTitle,
} from '@numior/vue';
</script>
