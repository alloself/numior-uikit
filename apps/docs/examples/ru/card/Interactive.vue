<template>
  <NuiCard interactive variant="elevated" class="nui-max-w-sm" @click="onClick">
    <NuiCardHeader>
      <NuiCardTitle>Проект Numior</NuiCardTitle>
      <NuiCardDescription>Нажмите в любом месте карточки.</NuiCardDescription>
    </NuiCardHeader>
    <NuiCardContent>Нажатий: {{ count }}</NuiCardContent>
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
