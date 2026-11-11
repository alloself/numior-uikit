<template>
  <form class="nui-collab-comments__form" @submit.prevent="send">
    <NuiTextarea
      v-model="body"
      :rows="2"
      :placeholder="placeholder"
      :aria-label="placeholder"
      :autofocus="autofocus"
    />
    <div class="nui-collab-comments__actions">
      <NuiButton type="submit" size="sm" :disabled="body.trim() === ''">{{ text.send }}</NuiButton>
      <NuiButton size="sm" variant="ghost" tone="neutral" @click="emit('cancel')">{{
        text.cancel
      }}</NuiButton>
    </div>
  </form>
</template>

<script setup lang="ts">
import { NuiButton, NuiTextarea } from '@numior/vue';
import { ref } from 'vue';
import type { NuiEditorCommentFormProps } from './collab.types';

const { placeholder, text, submit, autofocus = false } = defineProps<NuiEditorCommentFormProps>();

const emit = defineEmits<{
  cancel: [];
}>();

const body = ref('');

const send = async (): Promise<void> => {
  if (!(await submit(body.value.trim()))) {
    return;
  }

  body.value = '';
};
</script>
