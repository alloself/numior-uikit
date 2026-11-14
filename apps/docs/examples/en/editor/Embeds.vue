<template>
  <div class="w-full">
    <NuiEditor
      v-model="document"
      :embeds="['youtube', 'vimeo']"
      label="Oslo armchair video review"
      description="Paste a YouTube or Vimeo link on an empty line"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiEditor } from '@numior/editor-vue';

const document = ref(
  '<p>We turn the armchair around and take the cover off in two minutes.</p><p></p>',
);
</script>
