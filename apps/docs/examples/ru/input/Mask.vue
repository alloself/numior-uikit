<template>
  <NuiInput
    v-model.unmasked="phone"
    type="tel"
    mask="+7 (###) ###-##-##"
    label="Телефон"
    :description="`В модели: ${phone || '—'}`"
  />
  <NuiInput v-model="card" mask="#### #### #### ####" label="Номер карты" inputmode="numeric" />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiInput } from '@numior/vue';

const phone = ref('');
const card = ref('');
</script>
