<template>
  <NuiList variant="nav" label="Разделы" class="w-full max-w-sm">
    <NuiListItem
      icon="inbox"
      label="Входящие"
      :badge="12"
      :current="section === 'inbox'"
      interactive
      @click="section = 'inbox'"
    />
    <NuiListItem
      icon="calendar"
      label="Календарь"
      :current="section === 'calendar'"
      interactive
      @click="section = 'calendar'"
    />
    <NuiListItem
      icon="folder"
      label="Файлы"
      shortcut="mod+f"
      :current="section === 'files'"
      interactive
      @click="section = 'files'"
    />
  </NuiList>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiList, NuiListItem } from '@numior/vue';

const section = ref('inbox');
</script>
