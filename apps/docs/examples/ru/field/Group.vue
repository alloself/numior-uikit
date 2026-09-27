<template>
  <NuiField group label="Имя и фамилия" description="Как в паспорте">
    <div class="nui-flex nui-gap-2">
      <NuiInput v-model="firstName" placeholder="Анна" autocomplete="given-name" />
      <NuiInput v-model="lastName" placeholder="Титова" autocomplete="family-name" />
    </div>
  </NuiField>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiField, NuiInput } from '@numior/vue';

const firstName = ref('');
const lastName = ref('');
</script>
