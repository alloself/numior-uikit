<template>
  <NuiField>
    <template #label>
      Пароль
      <NuiLink href="#" class="nui-ms-2 nui-text-sm">Почему нужен?</NuiLink>
    </template>
    <NuiInput v-model="password" type="password" autocomplete="new-password" />
    <template #description> Не меньше <strong>8 символов</strong>, хотя бы одна цифра. </template>
  </NuiField>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiField, NuiInput, NuiLink } from '@numior/vue';

const password = ref('');
</script>
