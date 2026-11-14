<template>
  <div class="flex w-full flex-col gap-3">
    <NuiEditor
      v-model="review"
      :schema="schema"
      toolbar="bubble"
      :block-handles="false"
      label="Отзыв о кресле «Осло»"
      description="Расскажите, что понравилось и что стоит улучшить"
      placeholder="Сидеть удобно, но…"
    />
    <NuiButton class="self-start" :disabled="sent" @click="sent = true">Отправить отзыв</NuiButton>
    <p v-if="sent" class="m-0 text-sm text-muted-foreground">
      Спасибо! Отзыв появится на странице товара после проверки.
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
