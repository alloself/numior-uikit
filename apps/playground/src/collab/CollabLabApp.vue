<template>
  <main class="collab-lab">
    <div class="collab-lab__bar">
      <h1 class="collab-lab__title">Совместная работа</h1>
      <NuiButton variant="outline" tone="neutral" data-testid="collab-lab-room" @click="nextRoom">
        Новая комната
      </NuiButton>
    </div>
    <NuiTabs v-model="kind">
      <NuiTabList label="Что правим вместе">
        <NuiTab value="editor">Редактор</NuiTab>
        <NuiTab value="book">Книга</NuiTab>
      </NuiTabList>
      <NuiTabPanel value="editor">
        <CollabLabPair v-if="kind === 'editor'" kind="editor" :room="room" />
      </NuiTabPanel>
      <NuiTabPanel value="book">
        <CollabLabPair v-if="kind === 'book'" kind="book" :room="room" />
      </NuiTabPanel>
    </NuiTabs>
  </main>
</template>

<script setup lang="ts">
import { NuiButton, NuiTab, NuiTabList, NuiTabPanel, NuiTabs } from '@numior/vue';
import { ref } from 'vue';
import CollabLabPair from './CollabLabPair.vue';

const freshRoom = (): string => `lab-${Math.random().toString(36).slice(2, 10)}`;

const kind = ref('editor');
const room = ref(freshRoom());

const nextRoom = (): void => {
  room.value = freshRoom();
};
</script>
