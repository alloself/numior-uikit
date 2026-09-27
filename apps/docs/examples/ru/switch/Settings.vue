<template>
  <NuiSwitch v-model="settings.public" description="Проект виден всей компании"
    >Публичный</NuiSwitch
  >
  <NuiSwitch v-model="settings.comments" description="Комментарии в задачах">Обсуждения</NuiSwitch>
  <NuiSwitch v-model="settings.archive" description="Доступно только владельцу" disabled>
    Архивировать
  </NuiSwitch>
</template>

<script setup lang="ts">
import { reactive } from 'vue';
import { NuiSwitch } from '@numior/vue';

const settings = reactive({ public: true, comments: false, archive: false });
</script>
