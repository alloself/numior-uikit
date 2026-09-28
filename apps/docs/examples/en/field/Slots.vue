<template>
  <NuiField>
    <template #label>
      Password
      <NuiLink href="#" class="ms-2 text-sm">Why is it needed?</NuiLink>
    </template>
    <NuiInput v-model="password" type="password" autocomplete="new-password" />
    <template #description> At least <strong>8 characters</strong>, one digit or more. </template>
  </NuiField>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiField, NuiInput, NuiLink } from '@numior/vue';

const password = ref('');
</script>
