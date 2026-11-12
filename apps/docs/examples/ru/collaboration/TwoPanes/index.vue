<template>
  <div class="grid gap-4 md:grid-cols-2">
    <Pane :link="annaLink" :user="anna" />
    <Pane :link="mariaLink" :user="maria" />
  </div>
</template>

<script setup lang="ts">
import { contentSchema } from '@numior/content';
import { createLoopback, editorAuthority } from '@numior/collaboration/room';
import { fromHTML } from '@numior/editor-core';
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
</script>
