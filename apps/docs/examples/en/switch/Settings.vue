<template>
  <NuiSwitch v-model="settings.public" description="The project is visible to the whole company"
    >Public</NuiSwitch
  >
  <NuiSwitch v-model="settings.comments" description="Comments inside tasks">Discussions</NuiSwitch>
  <NuiSwitch v-model="settings.archive" description="Owner only" disabled> Archive </NuiSwitch>
</template>

<script setup lang="ts">
import { reactive } from 'vue';
import { NuiSwitch } from '@numior/vue';

const settings = reactive({ public: true, comments: false, archive: false });
</script>
