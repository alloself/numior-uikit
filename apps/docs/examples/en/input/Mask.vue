<template>
  <NuiInput
    v-model.unmasked="phone"
    type="tel"
    mask="+1 (###) ###-####"
    label="Phone"
    :description="`Model: ${phone || '—'}`"
  />
  <NuiInput v-model="card" mask="#### #### #### ####" label="Card number" inputmode="numeric" />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiInput } from '@numior/vue';

const phone = ref('');
const card = ref('');
</script>
