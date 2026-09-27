<template>
  <NuiList variant="divided" class="nui-w-full nui-max-w-sm">
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
  <p class="nui-text-sm nui-text-muted">Открыто: {{ opened || '—' }}</p>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiList, NuiListItem } from '@numior/vue';

const opened = ref('');
</script>
