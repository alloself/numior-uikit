<template>
  <div class="grid gap-4 md:grid-cols-2">
    <Pane :link="annaLink" :user="anna" />
    <Pane :link="mariaLink" :user="maria">
      <NuiSwitch :model-value="online" label="Connection" size="sm" @update:model-value="connect" />
    </Pane>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { createLoopback, editorAuthority } from '@numior/collaboration/room';
import { contentSchema } from '@numior/content';
import { fromHTML } from '@numior/editor-core';
import { NuiSwitch } from '@numior/vue';
import { brief } from '#demo/description';
import { team } from '#demo/team';
import Pane from './Pane.vue';

const [anna, , maria] = team;

const room = createLoopback({
  authorityFor: () => editorAuthority(fromHTML(contentSchema, brief)),
  latency: 80,
});

const annaLink = room.link();
const mariaLink = room.link();

const online = ref(true);

const connect = (next: boolean): void => {
  online.value = next;
  mariaLink.setOnline(next);
};
</script>
