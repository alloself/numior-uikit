<template>
  <NuiSwitch v-model="loading" class="nui-mb-4">Загрузка</NuiSwitch>
  <NuiCard class="nui-w-full nui-max-w-sm" :aria-busy="loading || undefined">
    <NuiCardHeader>
      <NuiCardTitle>
        <NuiSkeleton v-if="loading" width="60%" />
        <template v-else>Каталог 2026</template>
      </NuiCardTitle>
      <NuiCardDescription>
        <NuiSkeleton v-if="loading" width="80%" />
        <template v-else>Обновлён вчера, 14 позиций</template>
      </NuiCardDescription>
    </NuiCardHeader>
    <NuiCardContent>
      <NuiSkeleton v-if="loading" :lines="3" />
      <template v-else>Весенняя коллекция готова к публикации.</template>
    </NuiCardContent>
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
  NuiSkeleton,
  NuiSwitch,
} from '@numior/vue';

const loading = ref(true);
</script>
