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
        <NuiTab value="yjs">Yjs</NuiTab>
      </NuiTabList>
      <NuiTabPanel value="editor">
        <CollabLabPair v-if="kind === 'editor'" kind="editor" :room="room" />
      </NuiTabPanel>
      <NuiTabPanel value="book">
        <CollabLabPair v-if="kind === 'book'" kind="book" :room="room" />
      </NuiTabPanel>
      <NuiTabPanel value="yjs">
        <CollabYjsLab v-if="kind === 'yjs'" :key="room" />
      </NuiTabPanel>
    </NuiTabs>
  </main>
</template>

<script setup lang="ts">
import { NuiButton, NuiTab, NuiTabList, NuiTabPanel, NuiTabs } from '@numior/vue';
import { ref } from 'vue';
import CollabLabPair from './CollabLabPair.vue';
import CollabYjsLab from './CollabYjsLab.vue';

const freshRoom = (): string => `lab-${Math.random().toString(36).slice(2, 10)}`;

const kind = ref('editor');
const room = ref(freshRoom());

const nextRoom = (): void => {
  room.value = freshRoom();
};
</script>
