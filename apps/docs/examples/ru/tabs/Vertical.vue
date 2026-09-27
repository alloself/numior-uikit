<template>
  <NuiTabs v-model="section" orientation="vertical" class="nui-w-full nui-max-w-md">
    <NuiTabList label="Настройки">
      <NuiTab value="profile" icon="user">Профиль</NuiTab>
      <NuiTab value="notifications" icon="inbox">Уведомления</NuiTab>
      <NuiTab value="security" icon="eye">Безопасность</NuiTab>
    </NuiTabList>
    <NuiTabPanel value="profile">Имя, фото и язык интерфейса.</NuiTabPanel>
    <NuiTabPanel value="notifications">Письма и push по задачам.</NuiTabPanel>
    <NuiTabPanel value="security">Пароль и активные сессии.</NuiTabPanel>
  </NuiTabs>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiTab, NuiTabList, NuiTabPanel, NuiTabs } from '@numior/vue';

const section = ref('profile');
</script>
