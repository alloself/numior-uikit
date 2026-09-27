<template>
  <NuiCode :code="log" :max-lines="4" wrap :copyable="false" />
</template>

<script setup lang="ts">
import { NuiCode } from '@numior/vue';

const log = [
  '[10:02:11] сборка началась',
  '[10:02:12] vite v8 собирает 214 модулей, включая очень длинную строку с путём к пакету @numior/vue/src/table/NuiTable.vue',
  '[10:02:14] стили: 12 файлов',
  '[10:02:15] типы: ошибок нет',
  '[10:02:16] артефакты записаны в dist',
  '[10:02:16] сборка завершена за 5.2 с',
].join('\n');
</script>
