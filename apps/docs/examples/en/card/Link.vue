<template>
  <NuiCard href="#anatomy" class="max-w-sm">
    <NuiCardHeader>
      <NuiCardTitle>Card anatomy</NuiCardTitle>
      <NuiCardDescription
        >The whole card leads to the section, the header button lives on its
        own.</NuiCardDescription
      >
      <template #actions>
        <NuiButton variant="ghost" tone="neutral" size="sm" aria-label="More">
          <NuiIcon alias="ellipsis" />
        </NuiButton>
      </template>
    </NuiCardHeader>
    <NuiCardFooter>
      <NuiBadge tone="success">Available</NuiBadge>
    </NuiCardFooter>
  </NuiCard>
</template>

<script setup lang="ts">
import {
  NuiBadge,
  NuiButton,
  NuiCard,
  NuiCardDescription,
  NuiCardFooter,
  NuiCardHeader,
  NuiCardTitle,
  NuiIcon,
} from '@numior/vue';
</script>
