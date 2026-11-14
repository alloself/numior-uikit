<template>
  <div class="w-full">
    <NuiEditor
      v-model="document"
      :embeds="['youtube', 'vimeo']"
      label="Видеообзор кресла «Осло»"
      description="Вставьте ссылку на ролик YouTube или Vimeo в пустую строку"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiEditor } from '@numior/editor-vue';

const document = ref(
  '<p>Показываем кресло со всех сторон и снимаем чехол за две минуты.</p><p></p>',
);
</script>
