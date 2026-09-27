<template>
  <NuiRadioGroup v-model="plan" label="Тариф" description="Можно изменить позже">
    <NuiRadio value="free">Бесплатный</NuiRadio>
    <NuiRadio value="team">Команда</NuiRadio>
    <NuiRadio value="business" disabled>Бизнес</NuiRadio>
  </NuiRadioGroup>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiRadio, NuiRadioGroup } from '@numior/vue';

const plan = ref('team');
</script>
