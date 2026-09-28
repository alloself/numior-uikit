<template>
  <NuiTabs v-model="section" orientation="vertical" class="w-full max-w-md">
    <NuiTabList label="Settings">
      <NuiTab value="profile" icon="user">Profile</NuiTab>
      <NuiTab value="notifications" icon="inbox">Notifications</NuiTab>
      <NuiTab value="security" icon="eye">Security</NuiTab>
    </NuiTabList>
    <NuiTabPanel value="profile">Name, photo and interface language.</NuiTabPanel>
    <NuiTabPanel value="notifications">Emails and push messages for tasks.</NuiTabPanel>
    <NuiTabPanel value="security">Password and active sessions.</NuiTabPanel>
  </NuiTabs>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiTab, NuiTabList, NuiTabPanel, NuiTabs } from '@numior/vue';

const section = ref('profile');
</script>
