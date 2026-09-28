<template>
  <NuiCard interactive variant="elevated" class="max-w-sm" @click="onClick">
    <NuiCardHeader>
      <NuiCardTitle>Project Numior</NuiCardTitle>
      <NuiCardDescription>Press anywhere on the card.</NuiCardDescription>
    </NuiCardHeader>
    <NuiCardContent>Presses: {{ count }}</NuiCardContent>
  </NuiCard>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  NuiCard,
  NuiCardContent,
  NuiCardDescription,
  NuiCardHeader,
  NuiCardTitle,
} from '@numior/vue';

const count = ref(0);

const onClick = (): void => {
  count.value += 1;
};
</script>
