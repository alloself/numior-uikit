<template>
  <div class="mx-auto flex max-w-5xl flex-col gap-4 p-6">
    <div class="flex flex-col gap-1">
      <h1 class="m-0 text-xl font-semibold tracking-tight">Product description</h1>
      <p class="m-0 text-sm text-muted-foreground">
        Type in one pane and the text and the caret show up in the other
      </p>
    </div>
    <div class="grid gap-4 md:grid-cols-2">
      <Pane :link="annaLink" :user="anna" />
      <Pane :link="mariaLink" :user="maria">
        <NuiSwitch
          :model-value="online"
          label="Connection"
          size="sm"
          @update:model-value="connect"
        />
      </Pane>
    </div>
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
