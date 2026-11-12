<template>
  <div class="flex w-full flex-col gap-3">
    <NuiEditor
      v-model="review"
      :schema="schema"
      toolbar="bubble"
      :block-handles="false"
      label="Review of the Oslo armchair"
      description="Tell us what you liked and what we could do better"
      placeholder="It is comfortable, but…"
    />
    <NuiButton class="self-start" :disabled="sent" @click="sent = true">Send review</NuiButton>
    <p v-if="sent" class="m-0 text-sm text-muted-foreground">
      Thank you! The review appears on the product page once it is checked.
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { contentSchema } from '@numior/content';
import { NuiEditor } from '@numior/editor-vue';
import { NuiButton } from '@numior/vue';

const schema = contentSchema.restrict({
  nodes: ['paragraph', 'bullet_list', 'list_item', 'hard_break'],
  marks: ['bold', 'italic'],
});

const review = ref('');
const sent = ref(false);
</script>
