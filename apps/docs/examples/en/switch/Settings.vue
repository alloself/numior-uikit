<template>
  <div class="flex flex-col gap-4">
    <NuiSwitch v-model="notify.order" description="An email to the manager once the order is paid">
      New order
    </NuiSwitch>
    <NuiSwitch v-model="notify.cancel" description="An email and a notice in the dashboard">
      Canceled order
    </NuiSwitch>
    <NuiSwitch v-model="notify.review" description="A digest of reviews once a day, at 9 a.m.">
      New review
    </NuiSwitch>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue';
import { NuiSwitch } from '@numior/vue';

const notify = reactive({ order: true, cancel: true, review: false });
</script>
