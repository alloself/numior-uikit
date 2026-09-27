<template>
  <NuiList variant="nav" label="Sections" class="nui-w-full nui-max-w-sm">
    <NuiListItem
      icon="inbox"
      label="Inbox"
      :badge="12"
      :current="section === 'inbox'"
      interactive
      @click="section = 'inbox'"
    />
    <NuiListItem
      icon="calendar"
      label="Calendar"
      :current="section === 'calendar'"
      interactive
      @click="section = 'calendar'"
    />
    <NuiListItem
      icon="folder"
      label="Files"
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
