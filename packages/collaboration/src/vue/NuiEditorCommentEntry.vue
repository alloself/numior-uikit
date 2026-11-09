<template>
  <div class="nui-collab-comments__entry">
    <NuiAvatar size="sm" :name="entry.author.name" :src="entry.author.avatar" />
    <span class="nui-collab-comments__author">{{ entry.author.name }}</span>
    <time class="nui-collab-comments__time" :datetime="entry.createdAt">{{
      timeOf(entry.createdAt)
    }}</time>
  </div>
</template>

<script setup lang="ts">
import { NuiAvatar } from '@numior/vue';
import type { NuiEditorCommentEntryProps } from './collab.types';

const { entry, timeOf } = defineProps<NuiEditorCommentEntryProps>();
</script>
