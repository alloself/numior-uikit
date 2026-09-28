<template>
  <div class="flex flex-col gap-3 w-full max-w-sm">
    <NuiList variant="divided" class="w-full max-w-sm">
      <NuiListItem icon="file" label="Договор.pdf" description="348 КБ · вчера" href="#contract" />
      <NuiListItem icon="image" label="Макет.png" description="1,2 МБ · сегодня" href="#layout" />
      <NuiListItem
        icon="folder"
        label="Архив"
        description="12 файлов"
        interactive
        @click="opened = 'Архив'"
      />
    </NuiList>
    <p class="text-sm text-muted-foreground">Открыто: {{ opened || '—' }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiList, NuiListItem } from '@numior/vue';

const opened = ref('');
</script>
